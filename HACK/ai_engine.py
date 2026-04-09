# ai_engine.py
"""
MomCareAI — Rule-Based AI Engine
Handles: symptom analysis, follow-up questions, pattern detection, alert generation
"""

from datetime import datetime, timedelta
import json
import re
import random

# ═══════════════════════════════════════════════════════════
# SYMPTOM KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════

SYMPTOM_CATEGORIES = {
    "pain": [
        "headache", "head pain", "migraine", "cramp", "cramps", "pain",
        "ache", "backache", "back pain", "chest pain", "stomach pain",
        "abdominal pain", "pelvic pain", "joint pain", "muscle pain",
        "sore", "tender", "throbbing", "sharp pain", "dull pain"
    ],
    "fatigue": [
        "tired", "fatigue", "exhausted", "weak", "weakness", "lethargy",
        "lethargic", "sluggish", "no energy", "drained", "burnout", "worn out"
    ],
    "mood": [
        "anxious", "anxiety", "depressed", "depression", "sad", "irritable",
        "angry", "mood swing", "emotional", "crying", "stressed", "stress",
        "overwhelmed", "nervous", "worried", "happy", "calm", "peaceful"
    ],
    "sleep": [
        "insomnia", "can't sleep", "sleepless", "sleep", "woke up",
        "nightmares", "restless", "oversleeping", "tired after sleep"
    ],
    "digestive": [
        "nausea", "vomit", "vomiting", "bloating", "bloated", "constipation",
        "diarrhea", "indigestion", "gas", "stomach upset", "acid reflux",
        "heartburn", "appetite loss", "not hungry", "overeating"
    ],
    "reproductive": [
        "period", "menstrual", "menstruation", "cycle", "spotting", "bleeding",
        "discharge", "cramps", "irregular", "missed period", "heavy flow",
        "light flow", "ovulation", "pregnancy", "pregnant"
    ],
    "cardiovascular": [
        "blood pressure", "bp", "palpitation", "heart", "dizzy", "dizziness",
        "fainting", "faint", "swelling", "edema"
    ],
    "respiratory": [
        "cough", "cold", "fever", "temperature", "chills", "sore throat",
        "shortness of breath", "breathing", "congestion", "runny nose"
    ],
    "skin": [
        "rash", "itching", "itch", "acne", "breakout", "dry skin",
        "hives", "swollen", "bruise", "discoloration"
    ]
}

SEVERITY_KEYWORDS = {
    "severe": ["severe", "unbearable", "extreme", "worst", "can't bear",
               "emergency", "very bad", "terrible", "awful", "agony"],
    "moderate": ["moderate", "bad", "quite", "significant", "noticeable",
                 "medium", "fair", "somewhat", "rather"],
    "mild": ["mild", "slight", "little", "bit", "minor", "small",
             "tiny", "soft", "gentle", "okay", "fine"]
}

FOLLOW_UP_QUESTIONS = {
    "pain": [
        "On a scale of 1 to 10, how severe is your pain?",
        "Where exactly is the pain located?",
        "Is the pain constant or does it come and go?",
        "How long have you been experiencing this pain?"
    ],
    "fatigue": [
        "How many hours of sleep did you get last night?",
        "Have you been eating regularly today?",
        "Have you had this feeling for more than 3 days?",
        "Are you also experiencing headache or dizziness?"
    ],
    "mood": [
        "How would you rate your mood today from 1 to 10?",
        "Have you felt this way for multiple days?",
        "Is there a specific trigger causing this feeling?",
        "Are you getting enough rest and self-care?"
    ],
    "sleep": [
        "How many hours of sleep did you manage to get?",
        "What time did you go to bed and wake up?",
        "Was it difficulty falling asleep or staying asleep?",
        "Have you been stressed or anxious lately?"
    ],
    "digestive": [
        "When did these digestive symptoms start?",
        "Have you eaten anything unusual recently?",
        "Is the discomfort related to specific foods?",
        "Are you staying hydrated with enough water?"
    ],
    "reproductive": [
        "What day of your cycle is today approximately?",
        "Is your flow lighter or heavier than usual?",
        "Are you experiencing cramping along with this?",
        "Has your cycle been regular recently?"
    ],
    "cardiovascular": [
        "What is your current blood pressure reading if you have measured it?",
        "Are you experiencing any chest discomfort or pain?",
        "Have you been physically active today?",
        "Are you on any blood pressure medications?"
    ],
    "respiratory": [
        "Do you have a fever? What is your temperature?",
        "How long have you had this symptom?",
        "Are you experiencing difficulty breathing?",
        "Have you been in contact with anyone who was sick?"
    ],
    "general": [
        "How long have you been experiencing this?",
        "Is this getting better, worse, or staying the same?",
        "Are you on any medications currently?",
        "Is there anything else you want to tell me?"
    ]
}

ALERT_THRESHOLDS = {
    "low_sleep": 5.0,          # Alert if sleep < 5 hours
    "high_pain": 8,            # Alert if pain >= 8/10
    "recurring_symptom": 3,    # Alert if same symptom appears 3+ times in 7 days
    "mood_low": 3              # Alert if mood rated <= 3
}

AI_RESPONSES = {
    "pain": "I'm sorry to hear you're in pain. Let me help you track this carefully.",
    "fatigue": "Fatigue can be a sign of various underlying issues. Let's monitor this together.",
    "mood": "Your emotional health matters just as much as your physical health. I'm here with you.",
    "sleep": "Good sleep is essential for women's health. Let me note this for your health report.",
    "digestive": "Digestive issues can be uncomfortable. Let me help you identify the pattern.",
    "reproductive": "Reproductive health tracking is important. Let me log this carefully.",
    "cardiovascular": "Cardiovascular symptoms need careful monitoring. Please consult a doctor if severe.",
    "respiratory": "Respiratory symptoms logged. If you have high fever, please seek medical attention.",
    "skin": "Skin changes have been noted. Let's track this over time.",
    "general": "Thank you for sharing your health update. I've noted all your symptoms."
}

# ═══════════════════════════════════════════════════════════
# CORE AI FUNCTIONS
# ═══════════════════════════════════════════════════════════

def extract_symptoms(text):
    """Extract symptoms and health information from raw text input."""
    text_lower = text.lower()
    found_symptoms = []
    found_categories = []
    
    for category, keywords in SYMPTOM_CATEGORIES.items():
        for keyword in keywords:
            if keyword in text_lower:
                found_symptoms.append(keyword)
                if category not in found_categories:
                    found_categories.append(category)
    
    return found_symptoms, found_categories

def assess_severity(text):
    """Determine severity level from text."""
    text_lower = text.lower()
    
    for severity, keywords in SEVERITY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return severity
    
    # Try to extract numeric scale (e.g., "7 out of 10", "pain level 8")
    numbers = re.findall(r'\b([1-9]|10)\b', text_lower)
    if numbers:
        max_num = max([int(n) for n in numbers])
        if max_num >= 8:
            return "severe"
        elif max_num >= 5:
            return "moderate"
        else:
            return "mild"
    
    return "mild"

def extract_vitals(text):
    """Extract vital signs from text."""
    vitals = {}
    text_lower = text.lower()
    
    # Blood pressure: "120/80" or "bp 120/80"
    bp_pattern = re.search(r'(\d{2,3})/(\d{2,3})', text)
    if bp_pattern:
        vitals['blood_pressure'] = bp_pattern.group(0)
    
    # Temperature: "37.5 degrees" or "100.4 F"
    temp_pattern = re.search(r'(\d{2,3}\.?\d*)\s*(?:degrees?|°|celsius|fahrenheit|f\b|c\b)', text_lower)
    if temp_pattern:
        vitals['temperature'] = float(temp_pattern.group(1))
    
    # Sleep hours: "slept 6 hours" or "6 hours of sleep"
    sleep_pattern = re.search(r'(\d+\.?\d*)\s*hours?\s*(?:of\s*)?sleep|slept\s*(?:for\s*)?(\d+\.?\d*)\s*hours?', text_lower)
    if sleep_pattern:
        hours = sleep_pattern.group(1) or sleep_pattern.group(2)
        vitals['sleep_hours'] = float(hours)
    
    # Pain level: "pain 7" or "7/10" or "level 8"
    pain_pattern = re.search(r'(?:pain|level|scale)[^\d]*(\d+)|(\d+)\s*(?:out of|\/)\s*10', text_lower)
    if pain_pattern:
        level = pain_pattern.group(1) or pain_pattern.group(2)
        vitals['pain_level'] = min(int(level), 10)
    
    # Mood rating: "mood 6" or "feeling 7/10"
    mood_pattern = re.search(r'(?:mood|feeling|feel)[^\d]*(\d+)', text_lower)
    if mood_pattern:
        vitals['mood_score'] = min(int(mood_pattern.group(1)), 10)
    
    return vitals

def get_follow_up_question(categories):
    """Select the most relevant follow-up question based on detected categories."""
    if not categories:
       return random.choice(FOLLOW_UP_QUESTIONS["general"])
    
    primary_category = categories[0]
    questions = FOLLOW_UP_QUESTIONS.get(primary_category, FOLLOW_UP_QUESTIONS["general"])
    
    import random
    return random.choice(questions)

def generate_ai_response(text, categories, severity):
    """Generate appropriate AI response based on analysis."""
    if not categories:
        return AI_RESPONSES["general"]
    
    primary_category = categories[0]
    base_response = AI_RESPONSES.get(primary_category, AI_RESPONSES["general"])
    
    # Add severity-based addition
    if severity == "severe":
        base_response += " ⚠️ This seems quite serious. Please consult a healthcare provider if this persists."
    elif severity == "moderate":
        base_response += " I'm monitoring this for patterns."
    
    return base_response

def analyze_input(text):
    """
    Main analysis function — combines all AI analysis steps.
    Returns structured analysis result.
    """
    symptoms, categories = extract_symptoms(text)
    severity = assess_severity(text)
    vitals = extract_vitals(text)
    response = generate_ai_response(text, categories, severity)
    follow_up = get_follow_up_question(categories)
    
    return {
        "symptoms": symptoms,
        "categories": categories,
        "severity": severity,
        "vitals": vitals,
        "ai_response": response,
        "follow_up_question": follow_up,
        "primary_category": categories[0] if categories else "general"
    }

def detect_patterns(logs):
    """
    Analyze health logs to detect recurring patterns and trends.
    Returns list of detected patterns with insights.
    """
    patterns = []
    
    if len(logs) < 2:
        return patterns
    
    # Count symptom frequency
    symptom_counts = {}
    sleep_values = []
    pain_values = []
    mood_values = []
    
    for log in logs:
        # Count symptoms
        symptoms_str = log.get('symptoms', '') or ''
        for symptom in symptoms_str.split(','):
            symptom = symptom.strip().lower()
            if symptom:
                symptom_counts[symptom] = symptom_counts.get(symptom, 0) + 1
        
        # Collect numeric values
        sleep = log.get('sleep_hours')
        if sleep and sleep > 0:
            sleep_values.append(float(sleep))
        
        pain = log.get('pain_level')
        if pain and pain > 0:
            pain_values.append(int(pain))
        
        mood_str = log.get('mood', '') or ''
        mood_num = re.search(r'\d+', mood_str)
        if mood_num:
            mood_values.append(int(mood_num.group()))
    
    # Pattern 1: Recurring symptoms
    for symptom, count in symptom_counts.items():
        if count >= ALERT_THRESHOLDS["recurring_symptom"]:
            patterns.append({
                "type": "recurring_symptom",
                "symptom": symptom,
                "occurrences": count,
                "message": f"⚠️ '{symptom.title()}' has been reported {count} times in the selected period.",
                "recommendation": f"Consistent {symptom} may need medical attention. Consider consulting a doctor.",
                "severity": "warning"
            })
    
    # Pattern 2: Sleep trends
    if len(sleep_values) >= 3:
        avg_sleep = sum(sleep_values) / len(sleep_values)
        if avg_sleep < ALERT_THRESHOLDS["low_sleep"]:
            patterns.append({
                "type": "sleep_deficit",
                "average": round(avg_sleep, 1),
                "message": f"😴 Average sleep is only {round(avg_sleep, 1)} hours — below the recommended 7-8 hours.",
                "recommendation": "Establish a consistent sleep schedule. Limit screen time before bed.",
                "severity": "warning"
            })
        elif avg_sleep >= 7:
            patterns.append({
                "type": "good_sleep",
                "average": round(avg_sleep, 1),
                "message": f"✅ Great sleep average of {round(avg_sleep, 1)} hours! Keep it up.",
                "recommendation": "Maintain your current sleep schedule.",
                "severity": "good"
            })
    
    # Pattern 3: Pain escalation
    if len(pain_values) >= 3:
        avg_pain = sum(pain_values) / len(pain_values)
        recent_pain = sum(pain_values[-3:]) / min(3, len(pain_values))
        if recent_pain > avg_pain + 1:
            patterns.append({
                "type": "pain_escalation",
                "message": f"📈 Pain levels appear to be increasing recently (avg: {round(recent_pain, 1)}/10).",
                "recommendation": "Increasing pain trend detected. Please consult your doctor.",
                "severity": "alert"
            })
    
    # Pattern 4: Mood pattern
    if len(mood_values) >= 3:
        avg_mood = sum(mood_values) / len(mood_values)
        if avg_mood <= ALERT_THRESHOLDS["mood_low"]:
            patterns.append({
                "type": "low_mood",
                "average": round(avg_mood, 1),
                "message": f"💙 Your mood has been consistently low (avg: {round(avg_mood, 1)}/10).",
                "recommendation": "Persistent low mood may indicate depression. Please speak with a mental health professional.",
                "severity": "alert"
            })
    
    return patterns

def check_immediate_alerts(log_data):
    """
    Check if any logged data requires immediate alerts.
    Called when new data is saved.
    """
    alerts = []
    
    # Check blood pressure
    bp = log_data.get('blood_pressure', '')
    if bp:
        bp_match = re.search(r'(\d+)/(\d+)', bp)
        if bp_match:
            systolic = int(bp_match.group(1))
            diastolic = int(bp_match.group(2))
            if systolic >= 140 or diastolic >= 90:
                alerts.append({
                    "type": "high_bp",
                    "message": f"🚨 HIGH BLOOD PRESSURE ALERT: {bp}. Systolic ≥ 140 or Diastolic ≥ 90. Please seek immediate medical care!",
                    "severity": "critical"
                })
            elif systolic >= 130 or diastolic >= 80:
                alerts.append({
                    "type": "elevated_bp",
                    "message": f"⚠️ Elevated Blood Pressure: {bp}. Please monitor closely and rest.",
                    "severity": "warning"
                })
    
    # Check pain level
    pain = log_data.get('pain_level', 0)
    if pain and int(pain) >= ALERT_THRESHOLDS["high_pain"]:
        alerts.append({
            "type": "high_pain",
            "message": f"🚨 HIGH PAIN ALERT: Pain level {pain}/10 reported. Please consult a doctor immediately.",
            "severity": "critical"
        })
    
    # Check sleep
    sleep = log_data.get('sleep_hours', 0)
    if sleep and float(sleep) < ALERT_THRESHOLDS["low_sleep"]:
        alerts.append({
            "type": "low_sleep",
            "message": f"⚠️ LOW SLEEP ALERT: Only {sleep} hours of sleep reported. Aim for 7-8 hours.",
            "severity": "warning"
        })
    
    # Check temperature
    temp = log_data.get('temperature')
    if temp:
        try:
            temp_val = float(temp)
            if temp_val >= 38.5:  # Celsius
                alerts.append({
                    "type": "high_fever",
                    "message": f"🚨 HIGH FEVER ALERT: Temperature {temp}°C. Please seek medical attention.",
                    "severity": "critical"
                })
        except ValueError:
            pass
    
    return alerts

def generate_health_summary(logs, medications):
    """
    Generate a structured doctor-friendly health summary.
    """
    if not logs:
        return {"error": "No health logs found for summary generation."}
    
    # Aggregate symptom data
    all_symptoms = []
    sleep_data = []
    pain_data = []
    bp_readings = []
    
    for log in logs:
        symptoms_str = log.get('symptoms', '') or ''
        if symptoms_str:
            all_symptoms.extend([s.strip() for s in symptoms_str.split(',') if s.strip()])
        
        sleep = log.get('sleep_hours')
        if sleep and float(sleep) > 0:
            sleep_data.append(float(sleep))
        
        pain = log.get('pain_level')
        if pain and int(pain) > 0:
            pain_data.append(int(pain))
        
        bp = log.get('blood_pressure', '')
        if bp:
            bp_readings.append(bp)
    
    # Count symptom frequency
    symptom_freq = {}
    for s in all_symptoms:
        symptom_freq[s] = symptom_freq.get(s, 0) + 1
    
    top_symptoms = sorted(symptom_freq.items(), key=lambda x: x[1], reverse=True)[:5]
    
    # Build medication summary
    med_summary = []
    for med in medications:
        med_summary.append({
            "name": med.get('medicine_name', 'Unknown'),
            "dosage": med.get('dosage', 'Not specified'),
            "frequency": med.get('frequency', 'Not specified'),
            "status": "Active" if med.get('is_active') else "Completed"
        })
    
    summary = {
        "report_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "period": f"Last {len(logs)} days",
        "total_logs": len(logs),
        "top_symptoms": [{"symptom": s[0], "frequency": s[1]} for s in top_symptoms],
        "vitals_summary": {
            "avg_sleep": round(sum(sleep_data) / len(sleep_data), 1) if sleep_data else "Not recorded",
            "avg_pain": round(sum(pain_data) / len(pain_data), 1) if pain_data else "Not recorded",
            "bp_readings": bp_readings[-3:] if bp_readings else "Not recorded"
        },
        "medications": med_summary,
        "recommendation": "Please review this summary with your healthcare provider for proper diagnosis and treatment.",
        "generated_by": "MomCareAI — AI Health Companion"
    }
    
    return summary