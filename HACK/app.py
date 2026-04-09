# app.py
"""
MomCareAI — Flask Backend Server
Main application file with all routes
"""

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime, timedelta
import sqlite3
import json
import os

# Import our modules
from database import init_db, get_connection, DB_NAME
from ai_engine import (
    analyze_input, detect_patterns, check_immediate_alerts,
    generate_health_summary
)
from prescription_parser import parse_prescription, format_medication_for_display

# ═══════════════════════════════════════════════════════════
# APP INITIALIZATION
# ═══════════════════════════════════════════════════════════

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from frontend

# Initialize database on startup
with app.app_context():
    init_db()

# ═══════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════

def save_alert_to_db(alert):
    """Save an alert to the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO alerts (timestamp, alert_type, message, severity, is_read)
        VALUES (?, ?, ?, ?, 0)
    """, (
        datetime.now().isoformat(),
        alert.get("type", "general"),
        alert.get("message", ""),
        alert.get("severity", "info")
    ))
    conn.commit()
    conn.close()

def row_to_dict(row):
    """Convert SQLite Row object to dictionary."""
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}

def rows_to_list(rows):
    """Convert list of SQLite Row objects to list of dictionaries."""
    return [row_to_dict(row) for row in rows]

# ═══════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════

# ─── MAIN PAGE ───────────────────────────────────────────
@app.route('/')
def index():
    """Serve the main frontend page."""
    return render_template('index.html')

# ─── VOICE/TEXT PROCESSING ───────────────────────────────
@app.route('/voice', methods=['POST'])
def process_voice():
    """
    Process voice or text input from user.
    Analyzes symptoms and returns AI response with follow-up question.
    """
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text input received"}), 400
        
        user_text = data.get('text', '').strip()
        if not user_text:
            return jsonify({"error": "Empty input received"}), 400
        
        # Run AI analysis
        analysis = analyze_input(user_text)
        
        # Check for immediate alerts
        vitals = analysis.get('vitals', {})
        immediate_alerts = check_immediate_alerts(vitals)
        
        # Save any critical alerts to database
        for alert in immediate_alerts:
            if alert.get('severity') == 'critical':
                save_alert_to_db(alert)
        
        return jsonify({
            "success": True,
            "analysis": {
                "symptoms": analysis["symptoms"],
                "categories": analysis["categories"],
                "severity": analysis["severity"],
                "vitals": analysis["vitals"]
            },
            "ai_response": analysis["ai_response"],
            "follow_up_question": analysis["follow_up_question"],
            "immediate_alerts": immediate_alerts,
            "raw_input": user_text
        })
    
    except Exception as e:
        print(f"Error in /voice: {str(e)}")
        return jsonify({"error": f"Processing error: {str(e)}"}), 500

# ─── SAVE HEALTH DATA ────────────────────────────────────
@app.route('/save', methods=['POST'])
def save_health_data():
    """
    Save health log entry to database.
    Checks for alerts after saving.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400
        
        conn = get_connection()
        cursor = conn.cursor()
        
        now = datetime.now()
        
        cursor.execute("""
            INSERT INTO health_logs 
            (timestamp, date, symptoms, mood, pain_level, sleep_hours, 
             blood_pressure, temperature, notes, category, severity, raw_input)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            now.isoformat(),
            now.strftime("%Y-%m-%d"),
            data.get('symptoms', ''),
            data.get('mood', ''),
            data.get('pain_level', 0),
            data.get('sleep_hours', 0),
            data.get('blood_pressure', ''),
            data.get('temperature', None),
            data.get('notes', ''),
            data.get('category', 'general'),
            data.get('severity', 'mild'),
            data.get('raw_input', '')
        ))
        
        log_id = cursor.lastrowid
        conn.commit()
        
        # Check for immediate alerts
        immediate_alerts = check_immediate_alerts(data)
        for alert in immediate_alerts:
            save_alert_to_db(alert)
        
        conn.close()
        
        return jsonify({
            "success": True,
            "message": "Health data saved successfully!",
            "log_id": log_id,
            "timestamp": now.isoformat(),
            "alerts": immediate_alerts
        })
    
    except Exception as e:
        print(f"Error in /save: {str(e)}")
        return jsonify({"error": f"Save error: {str(e)}"}), 500

# ─── GET HEALTH LOGS ─────────────────────────────────────
@app.route('/logs', methods=['GET'])
def get_logs():
    """Retrieve health logs with optional date filtering."""
    try:
        days = int(request.args.get('days', 7))
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM health_logs 
            WHERE date >= ? 
            ORDER BY timestamp DESC
        """, (start_date,))
        
        logs = rows_to_list(cursor.fetchall())
        conn.close()
        
        return jsonify({
            "success": True,
            "logs": logs,
            "count": len(logs),
            "period_days": days
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── PATTERN ANALYSIS ────────────────────────────────────
@app.route('/analysis', methods=['GET'])
def get_analysis():
    """
    Analyze health patterns from recent logs.
    Returns detected patterns, trends, and insights.
    """
    try:
        days = int(request.args.get('days', 7))
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM health_logs 
            WHERE date >= ? 
            ORDER BY timestamp ASC
        """, (start_date,))
        
        logs = rows_to_list(cursor.fetchall())
        conn.close()
        
        if not logs:
            return jsonify({
                "success": True,
                "patterns": [],
                "message": "No health logs found for this period. Start logging to see patterns!",
                "total_logs": 0
            })
        
        # Detect patterns using AI engine
        patterns = detect_patterns(logs)
        
        # Calculate basic statistics
        sleep_values = [float(l['sleep_hours']) for l in logs if l.get('sleep_hours') and float(l['sleep_hours']) > 0]
        pain_values = [int(l['pain_level']) for l in logs if l.get('pain_level') and int(l['pain_level']) > 0]
        
        stats = {
            "total_logs": len(logs),
            "period_days": days,
            "avg_sleep": round(sum(sleep_values) / len(sleep_values), 1) if sleep_values else None,
            "avg_pain": round(sum(pain_values) / len(pain_values), 1) if pain_values else None,
            "most_common_category": get_most_common_category(logs)
        }
        
        return jsonify({
            "success": True,
            "patterns": patterns,
            "statistics": stats,
            "total_logs": len(logs)
        })
    
    except Exception as e:
        print(f"Error in /analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_most_common_category(logs):
    """Helper to find most logged health category."""
    category_counts = {}
    for log in logs:
        cat = log.get('category', 'general')
        if cat:
            category_counts[cat] = category_counts.get(cat, 0) + 1
    
    if not category_counts:
        return "general"
    return max(category_counts, key=category_counts.get)

# ─── DOCTOR SUMMARY ──────────────────────────────────────
@app.route('/summary', methods=['GET'])
def get_summary():
    """
    Generate a comprehensive doctor-friendly health summary.
    """
    try:
        days = int(request.args.get('days', 7))
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get health logs
        cursor.execute("""
            SELECT * FROM health_logs 
            WHERE date >= ? 
            ORDER BY timestamp ASC
        """, (start_date,))
        logs = rows_to_list(cursor.fetchall())
        
        # Get active medications
        cursor.execute("""
            SELECT * FROM medications 
            WHERE is_active = 1
            ORDER BY medicine_name
        """)
        medications = rows_to_list(cursor.fetchall())
        
        conn.close()
        
        # Generate summary using AI engine
        summary = generate_health_summary(logs, medications)
        
        # Add patterns to summary
        patterns = detect_patterns(logs)
        summary["detected_patterns"] = patterns
        summary["period_days"] = days
        
        return jsonify({
            "success": True,
            "summary": summary
        })
    
    except Exception as e:
        print(f"Error in /summary: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ─── PRESCRIPTION UPLOAD ─────────────────────────────────
@app.route('/prescription', methods=['POST'])
def upload_prescription():
    """
    Process a doctor's prescription.
    Extracts medicines, creates medication schedule, and sets reminders.
    """
    try:
        data = request.get_json()
        if not data or 'prescription_text' not in data:
            return jsonify({"error": "No prescription text provided"}), 400
        
        prescription_text = data.get('prescription_text', '').strip()
        if len(prescription_text) < 10:
            return jsonify({"error": "Prescription text is too short"}), 400
        
        # Parse the prescription
        parsed = parse_prescription(prescription_text)
        
        if "error" in parsed:
            return jsonify({"error": parsed["error"]}), 400
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Save prescription to database
        cursor.execute("""
            INSERT INTO prescriptions (timestamp, doctor_name, patient_name, raw_text, parsed_data, diagnosis)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().isoformat(),
            parsed.get("doctor_name", ""),
            parsed.get("patient_name", ""),
            prescription_text,
            json.dumps(parsed),
            parsed.get("diagnosis", "")
        ))
        
        prescription_id = cursor.lastrowid
        
        # Save each medicine to medications table
        saved_medicines = []
        for medicine in parsed.get("medicines", []):
            cursor.execute("""
                INSERT INTO medications 
                (prescription_id, medicine_name, dosage, frequency, times_per_day, 
                 meal_instruction, duration_days, start_date, end_date, reminder_times, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (
                prescription_id,
                medicine.get("medicine_name", ""),
                medicine.get("dosage", ""),
                medicine.get("frequency", "once daily"),
                medicine.get("times_per_day", 1),
                medicine.get("meal_instruction", "after meal"),
                medicine.get("duration_days", 7),
                medicine.get("start_date", ""),
                medicine.get("end_date", ""),
                medicine.get("reminder_times", '["08:00"]')
            ))
            
            med_id = cursor.lastrowid
            medicine["id"] = med_id
            saved_medicines.append(medicine)
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": f"Prescription processed! Found {len(saved_medicines)} medication(s).",
            "prescription_id": prescription_id,
            "doctor_name": parsed.get("doctor_name"),
            "patient_name": parsed.get("patient_name"),
            "diagnosis": parsed.get("diagnosis"),
            "medicines": saved_medicines,
            "total_medicines": len(saved_medicines)
        })
    
    except Exception as e:
        print(f"Error in /prescription: {str(e)}")
        return jsonify({"error": f"Prescription processing error: {str(e)}"}), 500

# ─── GET MEDICATIONS ─────────────────────────────────────
@app.route('/medications', methods=['GET'])
def get_medications():
    """Retrieve all active medications and their schedules."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT m.*, p.doctor_name, p.diagnosis 
            FROM medications m
            LEFT JOIN prescriptions p ON m.prescription_id = p.id
            WHERE m.is_active = 1
            ORDER BY m.medicine_name
        """)
        
        medications = rows_to_list(cursor.fetchall())
        conn.close()
        
        # Format for display
        formatted = [format_medication_for_display(med) for med in medications]
        
        return jsonify({
            "success": True,
            "medications": formatted,
            "count": len(formatted)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── MARK MEDICATION TAKEN ───────────────────────────────
@app.route('/medication/taken', methods=['POST'])
def mark_medication_taken():
    """Mark a medication as taken for the current scheduled time."""
    try:
        data = request.get_json()
        medication_id = data.get('medication_id')
        scheduled_time = data.get('scheduled_time', '')
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO medication_logs (medication_id, scheduled_time, taken_at, status)
            VALUES (?, ?, ?, 'taken')
        """, (
            medication_id,
            scheduled_time,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True,
            "message": "Medication marked as taken! Great job! 💊"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── GET ALERTS ──────────────────────────────────────────
@app.route('/alerts', methods=['GET'])
def get_alerts():
    """Retrieve all unread alerts."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM alerts 
            WHERE is_read = 0
            ORDER BY timestamp DESC
            LIMIT 20
        """)
        
        alerts = rows_to_list(cursor.fetchall())
        conn.close()
        
        return jsonify({
            "success": True,
            "alerts": alerts,
            "count": len(alerts)
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── MARK ALERT READ ─────────────────────────────────────
@app.route('/alerts/read', methods=['POST'])
def mark_alert_read():
    """Mark an alert as read."""
    try:
        data = request.get_json()
        alert_id = data.get('alert_id')
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE alerts SET is_read = 1 WHERE id = ?", (alert_id,))
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── DASHBOARD DATA ──────────────────────────────────────
@app.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    """Get all data needed for the dashboard overview."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Last 7 days logs
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        cursor.execute("SELECT * FROM health_logs WHERE date >= ? ORDER BY date", (week_ago,))
        recent_logs = rows_to_list(cursor.fetchall())
        
        # Today's logs
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("SELECT * FROM health_logs WHERE date = ? ORDER BY timestamp DESC", (today,))
        today_logs = rows_to_list(cursor.fetchall())
        
        # Active medications
        cursor.execute("SELECT * FROM medications WHERE is_active = 1")
        medications = rows_to_list(cursor.fetchall())
        
        # Unread alerts count
        cursor.execute("SELECT COUNT(*) as count FROM alerts WHERE is_read = 0")
        alert_count = cursor.fetchone()['count']
        
        # Total logs count
        cursor.execute("SELECT COUNT(*) as count FROM health_logs")
        total_logs = cursor.fetchone()['count']
        
        conn.close()
        
        # Prepare chart data
        chart_data = prepare_chart_data(recent_logs)
        
        return jsonify({
            "success": True,
            "dashboard": {
                "today_logs_count": len(today_logs),
                "week_logs_count": len(recent_logs),
                "total_logs": total_logs,
                "active_medications": len(medications),
                "unread_alerts": alert_count,
                "today_logs": today_logs,
                "recent_logs": recent_logs,
                "medications": [format_medication_for_display(m) for m in medications],
                "chart_data": chart_data
            }
        })
    
    except Exception as e:
        print(f"Error in /dashboard: {str(e)}")
        return jsonify({"error": str(e)}), 500

def prepare_chart_data(logs):
    """Prepare data formatted for Chart.js visualization."""
    dates = []
    sleep_data = []
    pain_data = []
    
    # Group by date
    date_groups = {}
    for log in logs:
        date = log.get('date', '')
        if date not in date_groups:
            date_groups[date] = []
        date_groups[date].append(log)
    
    for date in sorted(date_groups.keys()):
        day_logs = date_groups[date]
        dates.append(date)
        
        sleep_vals = [float(l['sleep_hours']) for l in day_logs if l.get('sleep_hours') and float(l['sleep_hours']) > 0]
        pain_vals = [int(l['pain_level']) for l in day_logs if l.get('pain_level') and int(l['pain_level']) > 0]
        
        sleep_data.append(round(sum(sleep_vals) / len(sleep_vals), 1) if sleep_vals else 0)
        pain_data.append(round(sum(pain_vals) / len(pain_vals), 1) if pain_vals else 0)
    
    return {
        "labels": dates,
        "sleep": sleep_data,
        "pain": pain_data
    }

# ─── CHECK MEDICATION REMINDERS ──────────────────────────
@app.route('/reminders/check', methods=['GET'])
def check_reminders():
    """
    Check if any medications are due within the next 30 minutes.
    Called by frontend polling.
    """
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_date = now.strftime("%Y-%m-%d")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM medications 
            WHERE is_active = 1 
            AND end_date >= ?
        """, (current_date,))
        
        medications = rows_to_list(cursor.fetchall())
        conn.close()
        
        due_medications = []
        
        for med in medications:
            reminder_times_str = med.get('reminder_times', '["08:00"]')
            try:
                reminder_times = json.loads(reminder_times_str)
            except (json.JSONDecodeError, TypeError):
                reminder_times = ["08:00"]
            
            for reminder_time in reminder_times:
                # Check if reminder is within 15 minutes from now
                try:
                    rem_hour, rem_min = map(int, reminder_time.split(':'))
                    cur_hour, cur_min = map(int, current_time.split(':'))
                    
                    rem_total = rem_hour * 60 + rem_min
                    cur_total = cur_hour * 60 + cur_min
                    
                    diff = rem_total - cur_total
                    
                    if 0 <= diff <= 15:  # Due within next 15 minutes
                        due_medications.append({
                            "id": med["id"],
                            "medicine_name": med["medicine_name"],
                            "dosage": med["dosage"],
                            "meal_instruction": med["meal_instruction"],
                            "scheduled_time": reminder_time,
                            "message": f"💊 Time to take {med['medicine_name']} {med['dosage']} — {med['meal_instruction']}!"
                        })
                        break
                except (ValueError, AttributeError):
                    continue
        
        return jsonify({
            "success": True,
            "due_medications": due_medications,
            "check_time": current_time
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── HEALTH STATUS ───────────────────────────────────────
@app.route('/status', methods=['GET'])
def health_status():
    """Simple health check endpoint."""
    return jsonify({
        "status": "running",
        "app": "MomCareAI",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/init-db')
def init_database():
    init_db()
    return "Database initialized!"

# ═══════════════════════════════════════════════════════════
# RUN APPLICATION
# ═══════════════════════════════════════════════════════════
import os

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)