# database.py
import sqlite3
from datetime import datetime

DB_NAME = "momcare.db"

def get_connection():
    """Get database connection with row factory for dict-like access."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize all database tables."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Health logs table — stores daily symptoms and vitals
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS health_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            date TEXT NOT NULL,
            symptoms TEXT,
            mood TEXT,
            pain_level INTEGER DEFAULT 0,
            sleep_hours REAL DEFAULT 0,
            blood_pressure TEXT,
            temperature REAL,
            notes TEXT,
            category TEXT,
            severity TEXT DEFAULT 'mild',
            raw_input TEXT
        )
    """)
    
    # Prescriptions table — stores uploaded prescriptions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prescriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            doctor_name TEXT,
            patient_name TEXT,
            raw_text TEXT NOT NULL,
            parsed_data TEXT,
            diagnosis TEXT
        )
    """)
    
    # Medications table — stores individual medicines from prescriptions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prescription_id INTEGER,
            medicine_name TEXT NOT NULL,
            dosage TEXT,
            frequency TEXT,
            times_per_day INTEGER DEFAULT 1,
            meal_instruction TEXT DEFAULT 'after meal',
            duration_days INTEGER DEFAULT 7,
            start_date TEXT,
            end_date TEXT,
            reminder_times TEXT,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
        )
    """)
    
    # Medication logs — tracks when medicine was taken
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS medication_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medication_id INTEGER,
            scheduled_time TEXT,
            taken_at TEXT,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (medication_id) REFERENCES medications(id)
        )
    """)
    
    # Alerts table — stores generated alerts
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            alert_type TEXT,
            message TEXT,
            severity TEXT DEFAULT 'info',
            is_read INTEGER DEFAULT 0
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")

if __name__ == "__main__":
    init_db()