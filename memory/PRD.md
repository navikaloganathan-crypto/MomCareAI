# MomCareAI - Product Requirements Document

## Problem Statement
AI-powered healthcare assistant for mothers to track symptoms, analyze health patterns, and generate doctor-ready reports.

## Architecture
- **Backend**: FastAPI + MongoDB + Gemini 3 Flash (via emergentintegrations)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Database**: MongoDB (collections: chat_messages, health_entries, prescriptions)
- **AI**: Gemini 3 Flash for chat responses and prescription analysis

## User Personas
- Mothers tracking daily health symptoms
- Mothers wanting doctor-ready health reports
- Users needing prescription text clarification

## Core Requirements
1. AI Chat with symptom/mood/sleep/water extraction
2. Rule-based high-risk symptom detection
3. Health data storage in MongoDB
4. Pattern detection (repeated symptoms, low sleep, stress)
5. Doctor report generation
6. AI-powered prescription analyzer with reminders

## What's Been Implemented (Feb 2026)
- [x] Full AI chat with Gemini 3 Flash integration
- [x] Symptom extraction (rule-based + AI)
- [x] High-risk symptom warnings
- [x] Health data storage in MongoDB
- [x] Pattern detection with weekly insights
- [x] Doctor report generation with download
- [x] Prescription analyzer with medicine extraction and reminders
- [x] Dashboard with stats, symptom/mood frequency charts
- [x] Soft pink + white theme (Outfit/Figtree fonts)
- [x] Mobile-responsive design
- [x] Quick prompt suggestions

## Prioritized Backlog
### P0 (Done)
- All core features implemented

### P1 (Next)
- Health data charts/graphs (Recharts)
- Email/PDF export for doctor reports
- Prescription image upload (OCR)

### P2 (Future)
- User authentication
- Multi-user support
- Push notification reminders
- Voice input for chat
- Integration with health APIs
