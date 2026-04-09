# prescription_parser.py
"""
MomCareAI — Prescription Parser Module
Analyzes doctor prescriptions and extracts medication information
"""

import re
from datetime import datetime, timedelta
import json

# ═══════════════════════════════════════════════════════════
# MEDICINE KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════

COMMON_MEDICINES = {
    # Pain & Fever
    "paracetamol": {"category": "pain_fever", "common_dosage": "500mg", "times_per_day": 3},
    "ibuprofen": {"category": "pain_inflammation", "common_dosage": "400mg", "times_per_day": 3},
    "aspirin": {"category": "pain_blood_thinner", "common_dosage": "75mg", "times_per_day": 1},
    "diclofenac": {"category": "pain_inflammation", "common_dosage": "50mg", "times_per_day": 2},
    "naproxen": {"category": "pain", "common_dosage": "250mg", "times_per_day": 2},
    
    # Antibiotics
    "amoxicillin": {"category": "antibiotic", "common_dosage": "500mg", "times_per_day": 3},
    "azithromycin": {"category": "antibiotic", "common_dosage": "500mg", "times_per_day": 1},
    "ciprofloxacin": {"category": "antibiotic", "common_dosage": "500mg", "times_per_day": 2},
    "metronidazole": {"category": "antibiotic", "common_dosage": "400mg", "times_per_day": 3},
    "doxycycline": {"category": "antibiotic", "common_dosage": "100mg", "times_per_day": 2},
    
    # Women's Health
    "folic acid": {"category": "vitamin", "common_dosage": "5mg", "times_per_day": 1},
    "iron": {"category": "mineral", "common_dosage": "325mg", "times_per_day": 1},
    "calcium": {"category": "mineral", "common_dosage": "500mg", "times_per_day": 2},
    "vitamin d": {"category": "vitamin", "common_dosage": "1000IU", "times_per_day": 1},
    "mefenamic acid": {"category": "pain_menstrual", "common_dosage": "500mg", "times_per_day": 3},
    "progesterone": {"category": "hormone", "common_dosage": "100mg", "times_per_day": 2},
    "estrogen": {"category": "hormone", "common_dosage": "2mg", "times_per_day": 1},
    "levothyroxine": {"category": "thyroid", "common_dosage": "50mcg", "times_per_day": 1},
    "metformin": {"category": "diabetes", "common_dosage": "500mg", "times_per_day": 2},
    
    # Blood Pressure
    "amlodipine": {"category": "blood_pressure", "common_dosage": "5mg", "times_per_day": 1},
    "enalapril": {"category": "blood_pressure", "common_dosage": "5mg", "times_per_day": 1},
    "losartan": {"category": "blood_pressure", "common_dosage": "50mg", "times_per_day": 1},
    "atenolol": {"category": "blood_pressure", "common_dosage": "50mg", "times_per_day": 1},
    
    # Stomach
    "omeprazole": {"category": "stomach", "common_dosage": "20mg", "times_per_day": 1},
    "pantoprazole": {"category": "stomach", "common_dosage": "40mg", "times_per_day": 1},
    "ranitidine": {"category": "stomach", "common_dosage": "150mg", "times_per_day": 2},
    "metoclopramide": {"category": "nausea", "common_dosage": "10mg", "times_per_day": 3},
    
    # Mental Health
    "sertraline": {"category": "antidepressant", "common_dosage": "50mg", "times_per_day": 1},
    "fluoxetine": {"category": "antidepressant", "common_dosage": "20mg", "times_per_day": 1},
    "alprazolam": {"category": "anxiety", "common_dosage": "0.25mg", "times_per_day": 2},
    
    # Vitamins
    "vitamin b12": {"category": "vitamin", "common_dosage": "1000mcg", "times_per_day": 1},
    "vitamin c": {"category": "vitamin", "common_dosage": "500mg", "times_per_day": 1},
    "zinc": {"category": "mineral", "common_dosage": "50mg", "times_per_day": 1},
}

FREQUENCY_PATTERNS = {
    "once daily": 1, "once a day": 1, "1 time": 1, "od": 1, "qd": 1, "1x": 1, "1/day": 1,
    "twice daily": 2, "twice a day": 2, "2 times": 2, "bd": 2, "bid": 2, "2x": 2, "2/day": 2,
    "three times": 3, "thrice": 3, "3 times": 3, "tid": 3, "tds": 3, "3x": 3, "3/day": 3,
    "four times": 4, "4 times": 4, "qid": 4, "4x": 4, "4/day": 4,
    "every 8 hours": 3, "every 6 hours": 4, "every 12 hours": 2, "every 24 hours": 1
}

MEAL_INSTRUCTIONS = {
    "after meal": ["after meal", "after food", "after eating", "pc", "with food"],
    "before meal": ["before meal", "before food", "before eating", "ac", "empty stomach"],
    "with meal": ["with meal", "during meal", "with food"],
    "at bedtime": ["at night", "bedtime", "before sleep", "hs"],
    "in morning": ["morning", "am", "breakfast time"]
}

DURATION_PATTERNS = [
    (r'(\d+)\s*days?', lambda m: int(m.group(1))),
    (r'(\d+)\s*weeks?', lambda m: int(m.group(1)) * 7),
    (r'(\d+)\s*months?', lambda m: int(m.group(1)) * 30),
    (r'for\s*(\d+)\s*days?', lambda m: int(m.group(1))),
    (r'(\d+)\s*day\s*course', lambda m: int(m.group(1))),
]

DEFAULT_REMINDER_TIMES = {
    1: ["08:00"],
    2: ["08:00", "20:00"],
    3: ["08:00", "14:00", "20:00"],
    4: ["07:00", "12:00", "17:00", "22:00"]
}

# ═══════════════════════════════════════════════════════════
# PARSER FUNCTIONS
# ═══════════════════════════════════════════════════════════

def extract_medicines_from_text(text):
    """
    Parse prescription text and extract all medicines with their details.
    Returns list of medicine dictionaries.
    """
    text_lower = text.lower()
    medicines = []
    found_positions = set()
    
    # Strategy 1: Match known medicine names
    for medicine_name, medicine_info in COMMON_MEDICINES.items():
        if medicine_name in text_lower:
            position = text_lower.find(medicine_name)
            if position not in found_positions:
                found_positions.add(position)
                
                # Get surrounding text for context (100 chars around medicine name)
                start = max(0, position - 20)
                end = min(len(text_lower), position + len(medicine_name) + 150)
                context = text[start:end]
                context_lower = context.lower()
                
                medicine = {
                    "medicine_name": medicine_name.title(),
                    "category": medicine_info["category"],
                    "dosage": extract_dosage(context) or medicine_info["common_dosage"],
                    "frequency": extract_frequency_text(context_lower),
                    "times_per_day": extract_frequency_count(context_lower) or medicine_info["times_per_day"],
                    "meal_instruction": extract_meal_instruction(context_lower),
                    "duration_days": extract_duration(context_lower) or 7,
                    "reminder_times": None  # Will be calculated
                }
                
                # Set reminder times based on frequency and meal instruction
                medicine["reminder_times"] = calculate_reminder_times(
                    medicine["times_per_day"],
                    medicine["meal_instruction"]
                )
                
                medicines.append(medicine)
    
    # Strategy 2: Look for numbered list pattern (1. Medicine 500mg ...)
    numbered_pattern = re.findall(
        r'(?:^|\n)\s*\d+[\.\)]\s*([A-Za-z][\w\s]+?)(?:\s+(\d+(?:\.\d+)?(?:mg|mcg|g|ml|IU|units?))?)',
        text, re.MULTILINE
    )
    
    for match in numbered_pattern:
        med_name = match[0].strip().lower()
        if med_name and len(med_name) > 2 and med_name not in [m["medicine_name"].lower() for m in medicines]:
            # Check if it looks like a medicine name (not a general word)
            common_words = {'take', 'with', 'food', 'water', 'daily', 'twice', 'once', 'after', 'before'}
            if med_name.split()[0] not in common_words:
                medicine = {
                    "medicine_name": med_name.title(),
                    "category": "unclassified",
                    "dosage": match[1] if match[1] else "As prescribed",
                    "frequency": "As directed",
                    "times_per_day": 1,
                    "meal_instruction": "after meal",
                    "duration_days": 7,
                    "reminder_times": json.dumps(["08:00"])
                }
                medicines.append(medicine)
    
    return medicines

def extract_dosage(text):
    """Extract dosage amount from text."""
    pattern = re.search(r'(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|IU|units?|tablets?|caps?|capsules?)', text, re.IGNORECASE)
    if pattern:
        return pattern.group(0)
    return None

def extract_frequency_text(text_lower):
    """Extract frequency as readable text."""
    for freq_text in FREQUENCY_PATTERNS.keys():
        if freq_text in text_lower:
            return freq_text
    return "once daily"

def extract_frequency_count(text_lower):
    """Extract frequency as number of times per day."""
    for freq_text, count in FREQUENCY_PATTERNS.items():
        if freq_text in text_lower:
            return count
    return None

def extract_meal_instruction(text_lower):
    """Extract meal-related instruction."""
    for instruction, keywords in MEAL_INSTRUCTIONS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return instruction
    return "after meal"  # Default

def extract_duration(text_lower):
    """Extract medication duration in days."""
    for pattern, converter in DURATION_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            return converter(match)
    return None

def calculate_reminder_times(times_per_day, meal_instruction):
    """
    Calculate optimal reminder times based on frequency and meal instructions.
    Returns JSON string of time list.
    """
    base_times = DEFAULT_REMINDER_TIMES.get(min(times_per_day, 4), ["08:00"])
    
    # Adjust for bedtime medication
    if meal_instruction == "at bedtime":
        times = ["21:00"] * min(times_per_day, 1)
    elif meal_instruction == "in morning":
        times = ["07:00"] + base_times[1:] if len(base_times) > 1 else ["07:00"]
    else:
        times = base_times
    
    return json.dumps(times)

def extract_doctor_info(text):
    """Extract doctor name and patient info from prescription."""
    info = {}
    
    # Doctor name patterns
    doctor_pattern = re.search(r'dr\.?\s*([A-Za-z\s]+?)(?:\n|,|$)', text, re.IGNORECASE)
    if doctor_pattern:
        info["doctor_name"] = doctor_pattern.group(1).strip()
    
    # Patient name patterns
    patient_pattern = re.search(r'(?:patient|name|pt\.?)[\s:]+([A-Za-z\s]+?)(?:\n|,|age|$)', text, re.IGNORECASE)
    if patient_pattern:
        info["patient_name"] = patient_pattern.group(1).strip()
    
    # Diagnosis patterns
    diagnosis_pattern = re.search(r'(?:diagnosis|dx|condition|for)[\s:]+([A-Za-z\s,]+?)(?:\n|$)', text, re.IGNORECASE)
    if diagnosis_pattern:
        info["diagnosis"] = diagnosis_pattern.group(1).strip()
    
    return info

def parse_prescription(prescription_text):
    """
    Main function to parse a prescription.
    Returns complete parsed prescription data.
    """
    if not prescription_text or len(prescription_text.strip()) < 10:
        return {"error": "Prescription text is too short or empty."}
    
    doctor_info = extract_doctor_info(prescription_text)
    medicines = extract_medicines_from_text(prescription_text)
    
    start_date = datetime.now().strftime("%Y-%m-%d")
    
    # Calculate end dates for each medicine
    for medicine in medicines:
        end_date = (datetime.now() + timedelta(days=medicine["duration_days"])).strftime("%Y-%m-%d")
        medicine["start_date"] = start_date
        medicine["end_date"] = end_date
    
    return {
        "doctor_name": doctor_info.get("doctor_name", "Not specified"),
        "patient_name": doctor_info.get("patient_name", "Not specified"),
        "diagnosis": doctor_info.get("diagnosis", "Not specified"),
        "medicines": medicines,
        "total_medicines": len(medicines),
        "parsed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "raw_text": prescription_text
    }

def format_medication_for_display(medication):
    """Format medication data for frontend display."""
    reminder_times = json.loads(medication.get("reminder_times", '["08:00"]'))
    
    return {
        "id": medication.get("id"),
        "name": medication.get("medicine_name"),
        "dosage": medication.get("dosage"),
        "frequency": medication.get("frequency"),
        "times_per_day": medication.get("times_per_day"),
        "meal_instruction": medication.get("meal_instruction"),
        "duration": f"{medication.get('duration_days')} days",
        "start_date": medication.get("start_date"),
        "end_date": medication.get("end_date"),
        "reminder_times": reminder_times,
        "is_active": bool(medication.get("is_active")),
        "next_reminder": reminder_times[0] if reminder_times else "08:00"
    }