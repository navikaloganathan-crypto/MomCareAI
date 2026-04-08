# MomCareAI - Product Requirements Document

## Problem Statement
AI-powered healthcare assistant for mothers to track symptoms, analyze health patterns, manage prescriptions, and generate doctor-ready reports. Includes Amma AI caring reminders and voice input/output.

## Architecture
- **Backend**: FastAPI + MongoDB + Gemini 3 Flash (via emergentintegrations)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Database**: MongoDB (collections: chat_messages, health_entries, prescriptions, reminders)
- **AI**: Gemini 3 Flash for chat responses and prescription analysis
- **Voice**: Web Speech API (SpeechRecognition + SpeechSynthesis)

## What's Been Implemented
### Phase 1 - MVP (Feb 2026)
- [x] AI chat with Gemini 3 Flash, symptom/mood/sleep/water extraction
- [x] High-risk symptom warnings, pattern detection, doctor reports
- [x] Prescription analyzer with auto-reminder creation
- [x] Dashboard with stats + symptom/mood frequency

### Phase 2 - Amma AI Reminders
- [x] Medication Reminder CRUD with Amma AI caring responses
- [x] Adherence tracking with per-medicine breakdown
- [x] Auto-creation from prescription analysis

### Phase 3 - Voice Feature
- [x] Voice input via Web Speech API (SpeechRecognition)
- [x] Voice output via SpeechSynthesis (auto-speak on voice input)
- [x] Mic button, listening indicator, volume toggle
- [x] Speaker button on each AI message for replay

## Prioritized Backlog
### P1 (Next)
- Push notification for due reminders
- PDF export for doctor reports
- Health data Recharts visualizations

### P2 (Future)
- User auth & multi-user support
- Prescription image upload (OCR)
- Calendar view for medication schedule
