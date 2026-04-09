# 🌸 MomCareAI

[![Hackathon](https://img.shields.io/badge/BuildWithAI-24hr%20Hackathon-blueviolet)](https://github.com/navikaloganathan-crypto)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**MomCareAI** is an AI-powered health companion designed for women across different life stages, with a focus on mothers. It enables continuous health tracking, intelligent symptom analysis, and doctor-friendly reporting through a simple chat interface.

Built for **INNOVATEX 4.0 – BuildWithAI 24 Hour International Innovation Hackathon** at Presidency University, Bengaluru.

---

## 📖 Overview

### 🚨 Problem

Mothers often struggle to consistently track and manage their health due to busy lifestyles and lack of structured tools.

Health data remains fragmented and memory-based. When visiting doctors, many are unable to clearly recall symptoms or patterns, leading to:
- Incomplete diagnosis  
- Delayed treatment  
- Missed early warning signs  

👉 While this affects all women, **mothers face the highest barriers due to increased responsibilities and reduced time for self-care**.

---

### 💡 Solution

**MomCareAI** transforms everyday health conversations into structured medical insights.

It provides:
- AI-powered chat for symptom logging  
- Real-time symptom analysis  
- Intelligent follow-up questioning  
- Pattern detection (fatigue, sleep, recurring issues)  
- Doctor-friendly summary reports  
- Smart reminders for medication and health routines  

👉 We move healthcare from **reactive to proactive monitoring**.

---

## 🎯 Features

- ✅ AI-powered symptom tracking via chat  
- ✅ Smart medicine & health reminders  
- ✅ Pattern detection & trend analysis  
- ✅ Doctor-friendly health reports  
- ✅ Simple, mobile-first UI  
- 🔄 Voice input (stretch goal)  
- 📱 PWA-ready (offline capability)

---

## 🛠️ Tech Stack

| Layer                   | Technology                    | Description                                             |
| ----------------------- | ----------------------------- | ------------------------------------------------------- |
| **Frontend**            | HTML, CSS, JavaScript         | Lightweight, responsive user interface                  |
|                         | Web Speech API                | Enables voice interaction                               |
|                         | SpeechRecognition             | Converts voice → text input                             |
|                         | SpeechSynthesis               | Converts text → voice output                            |
| **Backend**             | Python                        | Core backend logic                                      |
|                         | Flask                         | REST API framework for handling requests                |
| **Database**            | SQLite                        | Stores structured health records, symptoms, reminders   |
| **AI / NLP Layer**      | OpenAI GPT (GPT-4o / GPT-4.1) | Symptom analysis & natural language understanding       |
|                         | Prompt Engineering            | Extracts structured data from user input                |
| **Logic Layer**         | Python (Rule-based)           | Pattern detection & health analytics                    |
|                         | Frequency Tracking            | Tracks repeated symptoms over time                      |
|                         | Risk Flagging                 | Identifies issues like low sleep, missed medication     |
| **APIs & Integrations** | OpenAI API                    | AI processing                                           |
|                         | Web Speech API                | Voice input/output                                      |
| **Data Format**         | JSON                          | Structured storage & processing of health data          |
| **Error Handling**      | Backend Logic                 | Handles invalid input, API failures, fallback responses |


---

## ✨ Live Demo

- ## ✨ Live Demo

🎥 **Demo Video:** [Watch MomCareAI in Action](https://github.com/navikaloganathan-crypto/MomCareAI/blob/main/MomCareAI.mp4)


---

## 📱 Screens

### 💬 Chat — Log symptoms naturally
![Chat Screen](Screenshot%202026-04-09%20at%2010.12.44.png)
![Chat with chest pain](Screenshot%202026-04-09%20at%2010.16.08.png)

### 📊 Dashboard — Weekly health overview
![Dashboard](Screenshot%202026-04-09%20at%2010.16.24.png)
![Symptom frequency](Screenshot%202026-04-09%20at%2010.16.31.png)

### 🔔 Reminders — Medicine tracking
![Reminders](Screenshot%202026-04-09%20at%2010.16.38.png)

### 📋 Report — Doctor-ready summary
![Doctor Report](Screenshot%202026-04-09%20at%2010.16.49.png)
![Report timeline](Screenshot%202026-04-09%20at%2010.16.53.png)

### 💊 Prescription Analyzer
![Prescription](Screenshot%202026-04-09%20at%2010.17.06.png)

---

## 🗺️ Project Architecture

![MomCareAI Architecture](https://raw.githubusercontent.com/navikaloganathan-crypto/MomCareAI/main/diagram-export-4-8-2026-12_11_02-PM.png)

### 🔁 Data Flow

User → Chat → AI Analysis → Data Storage → Pattern Detection → Report Generation → Dashboard

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/navikaloganathan-crypto/momcareai.git
cd momcareai

# Install dependencies
npm install

# Run app
npm run dev
```

👉 Runs at: `http://localhost:3000`

---

## ⚙️ Setup

### Requirements

* Node.js (v18+)
* Firebase account
* OpenAI API key

---

## 📂 Project Structure

```
momcareai/
├── frontend/       # React app
├── backend/        # Express API
├── docs/           # Diagrams & PPT
│   └── architecture.png
├── README.md
└── demo.mp4
```

---

## 💻 Sample Code

```javascript
const sendSymptom = async (message) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: `Analyze: ${message}` }
    ]
  });

  saveToFirebase(response.choices[0].message.content);
};
```

---

## 🏆 Hackathon Strategy

### ✅ Must-Have (24 Hours)

* Chat → AI → Database flow
* 3 working screens
* Clear demo scenario
* GitHub repository ready

### 🎤 Demo Flow (3 mins)

1. User logs: *“Headache + fatigue”*
2. AI analyzes & stores data
3. Display dashboard insights
4. Generate doctor-ready report

👉 **“We convert conversations into clinical insights.”**

---

## 📊 Impact

* Enables early detection of health issues
* Improves doctor–patient communication
* Encourages preventive healthcare
* Empowers women to prioritize their health

---

## 👥 Team

| Name              | Role                      | Email                                                               |
| ----------------- | ------------------------- | ------------------------------------------------------------------- |
| Navika Loganathan | Fullstack & AI            | [navika.loganathan@gmail.com](mailto:navika.loganathan@gmail.com)   |
| Yasaswini         | Backend & API Integration | [yasaswinibangalore@gmail.com](mailto:yasaswinibangalore@gmail.com) |
| Mythri            | Frontend Development      | [manammythri22@gmail.com](mailto:manammythri22@gmail.com)           |
| Dakshayani        | Research & Documentation  | [k.dakshayani3022@gmail.com](mailto:k.dakshayani3022@gmail.com)     |

---

## 📚 Acknowledgments

* BuildWithAI Hackathon
* OpenAI
* Firebase

---


