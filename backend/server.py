from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# SYMPTOM ENGINE (rule-based)
# ──────────────────────────────────────────────
SYMPTOMS_LIST = [
    "headache", "fatigue", "nausea", "dizziness", "back pain", "cramps",
    "insomnia", "bloating", "swelling", "constipation", "heartburn",
    "cold", "cough", "sore throat", "body ache", "joint pain",
    "muscle pain", "weakness", "chills", "runny nose", "sneezing",
    "stomach pain", "migraine", "rash", "itching", "numbness",
]

HIGH_RISK_SYMPTOMS = [
    "chest pain", "breathless", "shortness of breath", "vomiting blood",
    "severe bleeding", "high fever", "seizure", "fainting", "blurred vision",
    "severe headache", "sudden swelling", "difficulty breathing",
]

MOODS = ["happy", "sad", "anxious", "stressed", "tired", "calm", "angry", "irritated", "hopeful", "overwhelmed"]


def detect_high_risk(text: str) -> list:
    text_lower = text.lower()
    return [s for s in HIGH_RISK_SYMPTOMS if s in text_lower]


def detect_symptoms(text: str) -> list:
    text_lower = text.lower()
    found = [s for s in SYMPTOMS_LIST if s in text_lower]
    found += [s for s in HIGH_RISK_SYMPTOMS if s in text_lower]
    return list(set(found))


def detect_mood(text: str) -> list:
    text_lower = text.lower()
    return [m for m in MOODS if m in text_lower]


# ──────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str  # "user" or "assistant"
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    extracted_data: Optional[dict] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"


class ChatResponse(BaseModel):
    reply: str
    extracted_data: dict
    high_risk_warning: Optional[str] = None


class PrescriptionRequest(BaseModel):
    text: str


class PrescriptionResponse(BaseModel):
    medicines: list
    explanation: str
    reminders: list
    disclaimer: str = "This is not medical advice. Please follow your doctor's instructions."


class HealthEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symptoms: list = []
    mood: list = []
    sleep_hours: Optional[float] = None
    water_intake: Optional[float] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    raw_message: str = ""


# ──────────────────────────────────────────────
# AI CHAT
# ──────────────────────────────────────────────
SYSTEM_PROMPT = """You are MomCareAI, a warm, caring, and supportive health assistant for mothers.

Your job:
1. Listen to what the mother shares about how she feels.
2. Extract health data from her message and return it as JSON.
3. Give a short, caring response with simple advice.
4. Ask ONE follow-up question to understand her better.

ALWAYS respond in this exact JSON format (no markdown, no extra text):
{
  "reply": "Your caring response here. Keep it warm, simple, 2-3 sentences max. End with ONE follow-up question.",
  "symptoms": ["list", "of", "detected", "symptoms"],
  "mood": ["detected", "moods"],
  "sleep_hours": null or number,
  "water_intake": null or number (in glasses)
}

Rules:
- Be warm like a caring friend, not clinical
- Use simple language
- If high-risk symptoms are mentioned (chest pain, severe bleeding, high fever, breathlessness, seizure, fainting), add urgent advice to see a doctor immediately
- Only extract data that is explicitly mentioned
- sleep_hours and water_intake must be numbers or null
- Always ask ONE follow-up question at the end of your reply"""


async def get_ai_response(message: str, session_id: str) -> dict:
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    chat = LlmChat(
        api_key=api_key,
        session_id=f"momcare-{session_id}",
        system_message=SYSTEM_PROMPT,
    )
    chat.with_model("gemini", "gemini-3-flash-preview")

    # Load recent chat history from DB for context
    recent_msgs = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(10).to_list(10)

    # Build context from history
    history_context = ""
    if recent_msgs:
        recent_msgs.reverse()
        for msg in recent_msgs:
            history_context += f"{msg['role'].upper()}: {msg['content']}\n"

    full_message = message
    if history_context:
        full_message = f"Recent conversation:\n{history_context}\n\nNew message from mother: {message}"

    user_msg = UserMessage(text=full_message)
    response_text = await chat.send_message(user_msg)

    # Parse the JSON response
    try:
        # Clean up response if it has markdown code blocks
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Failed to parse AI response as JSON: {e}. Raw: {response_text[:200]}")
        parsed = {
            "reply": response_text,
            "symptoms": detect_symptoms(message),
            "mood": detect_mood(message),
            "sleep_hours": None,
            "water_intake": None,
        }

    return parsed


@api_router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    message = req.message.strip()
    session_id = req.session_id or "default"

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Rule-based high-risk check
    high_risk = detect_high_risk(message)
    high_risk_warning = None
    if high_risk:
        high_risk_warning = f"Warning: You mentioned {', '.join(high_risk)}. This could be serious. Please consult a doctor immediately."

    # Get AI response
    ai_data = await get_ai_response(message, session_id)

    reply = ai_data.get("reply", "I hear you. How are you feeling overall?")

    # Merge rule-based + AI-detected symptoms
    ai_symptoms = ai_data.get("symptoms", [])
    rule_symptoms = detect_symptoms(message)
    all_symptoms = list(set(ai_symptoms + rule_symptoms))

    ai_mood = ai_data.get("mood", [])
    rule_mood = detect_mood(message)
    all_mood = list(set(ai_mood + rule_mood))

    sleep = ai_data.get("sleep_hours")
    water = ai_data.get("water_intake")

    extracted_data = {
        "symptoms": all_symptoms,
        "mood": all_mood,
        "sleep_hours": sleep,
        "water_intake": water,
    }

    # Save user message
    user_msg_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "user",
        "content": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "extracted_data": extracted_data,
    }
    await db.chat_messages.insert_one(user_msg_doc)

    # Save AI response
    ai_msg_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "assistant",
        "content": reply,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "extracted_data": None,
    }
    await db.chat_messages.insert_one(ai_msg_doc)

    # Save health entry
    health_entry = {
        "id": str(uuid.uuid4()),
        "symptoms": all_symptoms,
        "mood": all_mood,
        "sleep_hours": sleep,
        "water_intake": water,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "raw_message": message,
        "session_id": session_id,
    }
    if all_symptoms or all_mood or sleep is not None or water is not None:
        await db.health_entries.insert_one(health_entry)

    return ChatResponse(
        reply=reply,
        extracted_data=extracted_data,
        high_risk_warning=high_risk_warning,
    )


@api_router.get("/chat/history")
async def get_chat_history(session_id: str = "default"):
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(500)
    return {"messages": messages}


@api_router.delete("/chat/history")
async def clear_chat_history(session_id: str = "default"):
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"message": "Chat history cleared"}


# ──────────────────────────────────────────────
# HEALTH ENTRIES & PATTERNS
# ──────────────────────────────────────────────
@api_router.get("/health-entries")
async def get_health_entries(session_id: str = "default", days: int = 30):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    entries = await db.health_entries.find(
        {"session_id": session_id, "timestamp": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(500)
    return {"entries": entries}


@api_router.get("/patterns")
async def get_patterns(session_id: str = "default"):
    # Get entries from last 7 days
    cutoff_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    entries = await db.health_entries.find(
        {"session_id": session_id, "timestamp": {"$gte": cutoff_7d}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(500)

    if not entries:
        return {
            "insights": ["No health data recorded yet. Start chatting to track your health!"],
            "symptom_frequency": {},
            "mood_frequency": {},
            "avg_sleep": None,
            "avg_water": None,
            "low_sleep_count": 0,
            "stress_count": 0,
            "total_entries": 0,
        }

    # Symptom frequency
    symptom_freq = {}
    mood_freq = {}
    sleep_values = []
    water_values = []

    for entry in entries:
        for s in entry.get("symptoms", []):
            symptom_freq[s] = symptom_freq.get(s, 0) + 1
        for m in entry.get("mood", []):
            mood_freq[m] = mood_freq.get(m, 0) + 1
        if entry.get("sleep_hours") is not None:
            sleep_values.append(entry["sleep_hours"])
        if entry.get("water_intake") is not None:
            water_values.append(entry["water_intake"])

    avg_sleep = round(sum(sleep_values) / len(sleep_values), 1) if sleep_values else None
    avg_water = round(sum(water_values) / len(water_values), 1) if water_values else None
    low_sleep_count = sum(1 for s in sleep_values if s < 6)
    stress_count = mood_freq.get("stressed", 0) + mood_freq.get("anxious", 0)

    # Generate insights
    insights = []
    for symptom, count in sorted(symptom_freq.items(), key=lambda x: -x[1]):
        if count >= 2:
            insights.append(f"You reported {symptom} {count} times this week.")

    if low_sleep_count >= 2:
        insights.append(f"You had less than 6 hours of sleep {low_sleep_count} times this week. Try to rest more.")

    if stress_count >= 2:
        insights.append(f"You mentioned feeling stressed or anxious {stress_count} times. Consider some relaxation techniques.")

    if avg_sleep and avg_sleep < 6:
        insights.append(f"Your average sleep is {avg_sleep} hours. The recommended amount is 7-9 hours.")

    if avg_water and avg_water < 6:
        insights.append(f"Your average water intake is {avg_water} glasses. Try to drink at least 8 glasses a day.")

    if not insights:
        insights.append("Your health patterns look stable this week. Keep it up!")

    return {
        "insights": insights,
        "symptom_frequency": symptom_freq,
        "mood_frequency": mood_freq,
        "avg_sleep": avg_sleep,
        "avg_water": avg_water,
        "low_sleep_count": low_sleep_count,
        "stress_count": stress_count,
        "total_entries": len(entries),
    }


# ──────────────────────────────────────────────
# DOCTOR REPORT
# ──────────────────────────────────────────────
@api_router.get("/report")
async def generate_report(session_id: str = "default"):
    cutoff_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    entries = await db.health_entries.find(
        {"session_id": session_id, "timestamp": {"$gte": cutoff_30d}},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(500)

    if not entries:
        return {
            "report": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "period": "Last 30 days",
                "summary": "No health data available for this period.",
                "symptoms_timeline": [],
                "sleep_summary": None,
                "mood_summary": None,
                "alerts": [],
                "recommendations": ["Start tracking your symptoms by chatting with MomCareAI."],
            }
        }

    # Build timeline
    symptoms_timeline = []
    all_symptoms = {}
    sleep_vals = []
    mood_counts = {}
    alerts = []

    for entry in entries:
        if entry.get("symptoms"):
            symptoms_timeline.append({
                "date": entry["timestamp"][:10],
                "symptoms": entry["symptoms"],
            })
            for s in entry["symptoms"]:
                all_symptoms[s] = all_symptoms.get(s, 0) + 1
                if s in HIGH_RISK_SYMPTOMS:
                    alerts.append(f"High-risk symptom reported: {s} on {entry['timestamp'][:10]}")

        if entry.get("sleep_hours") is not None:
            sleep_vals.append({"date": entry["timestamp"][:10], "hours": entry["sleep_hours"]})

        for m in entry.get("mood", []):
            mood_counts[m] = mood_counts.get(m, 0) + 1

    sleep_summary = None
    if sleep_vals:
        avg = round(sum(s["hours"] for s in sleep_vals) / len(sleep_vals), 1)
        low_days = sum(1 for s in sleep_vals if s["hours"] < 6)
        sleep_summary = {
            "average_hours": avg,
            "total_records": len(sleep_vals),
            "low_sleep_days": low_days,
            "trend": sleep_vals,
        }
        if low_days >= 3:
            alerts.append(f"Sleep concern: Less than 6 hours on {low_days} days.")

    mood_summary = mood_counts if mood_counts else None

    recommendations = []
    if all_symptoms:
        top = sorted(all_symptoms.items(), key=lambda x: -x[1])[:3]
        recommendations.append(f"Most frequent symptoms: {', '.join(s[0] for s in top)}. Discuss these with your doctor.")
    if sleep_summary and sleep_summary["average_hours"] < 7:
        recommendations.append("Sleep is below recommended levels. Consider discussing sleep hygiene with your doctor.")

    return {
        "report": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "period": "Last 30 days",
            "summary": f"Tracked {len(entries)} health entries with {len(all_symptoms)} unique symptoms reported.",
            "symptoms_timeline": symptoms_timeline,
            "symptom_frequency": all_symptoms,
            "sleep_summary": sleep_summary,
            "mood_summary": mood_summary,
            "alerts": alerts,
            "recommendations": recommendations,
        }
    }


# ──────────────────────────────────────────────
# PRESCRIPTION ANALYZER
# ──────────────────────────────────────────────
PRESCRIPTION_PROMPT = """You are a prescription analyzer. Extract medicine information from the prescription text provided.

Return ONLY valid JSON (no markdown, no extra text) in this exact format:
{
  "medicines": [
    {
      "name": "medicine name",
      "dosage": "e.g., 500mg",
      "frequency": "e.g., twice daily",
      "timing": ["Morning", "Night"],
      "duration": "e.g., 7 days"
    }
  ],
  "explanation": "Simple, clear instructions on how to take each medicine. Use bullet points. Written for a mother, not a pharmacist.",
  "reminders": [
    {
      "medicine": "medicine name",
      "time": "HH:MM",
      "message": "friendly reminder message"
    }
  ]
}

Timing-to-time mapping:
- Morning -> 08:00
- Afternoon -> 13:00
- Evening -> 18:00
- Night -> 20:00
- Before breakfast -> 07:30
- After lunch -> 13:30
- Before bed -> 21:00

Rules:
- Extract ONLY what is explicitly stated in the prescription
- If information is unclear, set the field to "Not specified"
- Create reminders for each medicine at appropriate times
- The explanation must be in simple, friendly language
- If the prescription is unclear or incomplete, mention what's missing"""


@api_router.post("/prescription/analyze", response_model=PrescriptionResponse)
async def analyze_prescription(req: PrescriptionRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Prescription text cannot be empty")

    api_key = os.environ.get('EMERGENT_LLM_KEY')
    chat = LlmChat(
        api_key=api_key,
        session_id=f"prescription-{str(uuid.uuid4())[:8]}",
        system_message=PRESCRIPTION_PROMPT,
    )
    chat.with_model("gemini", "gemini-3-flash-preview")

    user_msg = UserMessage(text=f"Analyze this prescription:\n\n{text}")
    response_text = await chat.send_message(user_msg)

    try:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        parsed = json.loads(cleaned)
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Failed to parse prescription response: {e}")
        parsed = {
            "medicines": [],
            "explanation": "Could not parse the prescription. Please try rephrasing or providing more details.",
            "reminders": [],
        }

    # Save to DB
    doc = {
        "id": str(uuid.uuid4()),
        "raw_text": text,
        "analysis": parsed,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.prescriptions.insert_one(doc)

    return PrescriptionResponse(
        medicines=parsed.get("medicines", []),
        explanation=parsed.get("explanation", ""),
        reminders=parsed.get("reminders", []),
    )


# ──────────────────────────────────────────────
# DASHBOARD STATS
# ──────────────────────────────────────────────
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(session_id: str = "default"):
    total_entries = await db.health_entries.count_documents({"session_id": session_id})
    total_messages = await db.chat_messages.count_documents({"session_id": session_id, "role": "user"})

    cutoff_7d = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_entries = await db.health_entries.find(
        {"session_id": session_id, "timestamp": {"$gte": cutoff_7d}},
        {"_id": 0}
    ).to_list(500)

    unique_symptoms = set()
    sleep_vals = []
    for entry in recent_entries:
        unique_symptoms.update(entry.get("symptoms", []))
        if entry.get("sleep_hours") is not None:
            sleep_vals.append(entry["sleep_hours"])

    return {
        "total_entries": total_entries,
        "total_messages": total_messages,
        "unique_symptoms_7d": len(unique_symptoms),
        "avg_sleep_7d": round(sum(sleep_vals) / len(sleep_vals), 1) if sleep_vals else None,
        "entries_7d": len(recent_entries),
    }


# ──────────────────────────────────────────────
# ROOT & HEALTH CHECK
# ──────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "MomCareAI API is running"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}


# Include router & middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
