# MomCareAI - Product Requirements Document

## Problem Statement
AI-powered healthcare assistant for mothers to track symptoms, analyze health patterns, manage prescriptions, and generate doctor-ready reports. Includes Amma AI - a caring medication reminder system.

## Architecture
- **Backend**: FastAPI + MongoDB + Gemini 3 Flash (via emergentintegrations)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Database**: MongoDB (collections: chat_messages, health_entries, prescriptions, reminders)
- **AI**: Gemini 3 Flash for chat responses and prescription analysis

## User Personas
- Mothers tracking daily health symptoms
- Mothers wanting doctor-ready health reports
- Users needing prescription text clarification
- Users managing medication schedules with caring reminders

## Core Requirements
1. AI Chat with symptom/mood/sleep/water extraction
2. Rule-based high-risk symptom detection
3. Health data storage in MongoDB
4. Pattern detection (repeated symptoms, low sleep, stress)
5. Doctor report generation
6. AI-powered prescription analyzer with reminders
7. Medication Reminder System (Amma AI)

## What's Been Implemented (Feb 2026)
### Phase 1 - MVP
- [x] Full AI chat with Gemini 3 Flash integration
- [x] Symptom extraction (rule-based + AI)
- [x] High-risk symptom warnings
- [x] Health data storage in MongoDB
- [x] Pattern detection with weekly insights
- [x] Doctor report generation with download
- [x] Prescription analyzer with medicine extraction
- [x] Dashboard with stats, symptom/mood frequency
- [x] Soft pink + white theme (Outfit/Figtree fonts)
- [x] Mobile-responsive design

### Phase 2 - Amma AI Reminder System
- [x] Medication Reminder CRUD (create, read, delete)
- [x] Auto-creation of reminders from prescription analysis
- [x] Amma AI caring responses (greeting, taken, not_taken, health_check, follow_up)
- [x] Reminder action logging (taken/skipped)
- [x] Adherence tracking with percentage stats
- [x] Due reminder checking (polling)
- [x] Per-medicine adherence breakdown
- [x] Reminders page with tabs (My Reminders / Adherence)
- [x] Add Reminder dialog with time selection
- [x] Dashboard shows Med Adherence stat
- [x] Prescription page shows "Reminders auto-created" banner

## Prioritized Backlog
### P1 (Next)
- Health data charts/graphs (Recharts visualization)
- Push notification for due reminders
- PDF export for doctor reports
- Prescription image upload (OCR)

### P2 (Future)
- User authentication & multi-user support
- Email delivery of reports
- Voice input for chat
- Calendar view for medication schedule
