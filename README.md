# 🛡️ Kavach AI — The Digital Armor for a Safer World

> **An AI-powered global guardian that protects people—especially elders—from online scams using empathy, language, cultural awareness, and intelligence.**

![Kavach AI Banner](https://placehold.co/1200x400?text=Kavach+AI+%7C+The+Digital+Armor+for+a+Safer+World)

---

## 📌 Project Overview

**Kavach AI** is a high-impact Streamlit web application built for global social good. It analyzes suspicious messages and screenshots to help users identify online scams—*without using technical jargon*—and adapts its communication based on the user’s country, language, and cultural context.

Instead of sounding like a cybersecurity tool, Kavach AI behaves like a **trusted family member or personal guardian**, guiding users calmly and clearly through risky digital situations.

---

## 🎯 Problem Statement

Online scams are a **global problem** affecting millions every day. People fall victim not because they lack intelligence, but because:

- Scam messages create fear and urgency  
- Technical explanations are confusing  
- Help is not immediate, personal, or localized  

**Kavach AI solves this by combining AI intelligence with human empathy and cultural awareness.**

---

## ✨ Key Features

### 🌍 Location-Aware Protection (Global)
- Country / region selector
- Scam understanding adapts to regional fraud patterns
- Responses generated using **native language, tone, and cultural norms**
- Provides **local cybercrime reporting guidance** based on location

### 🔍 Multimodal Scam Analysis
- **Text Analysis**: Paste SMS, WhatsApp, Email, or social media messages
- **Image Analysis (OCR + Vision)**: Upload screenshots (JPG / PNG / JPEG)
- Detects urgency, impersonation, fake branding, and malicious intent

### 🗣️ Native Language & Tone
- Multilingual support with culturally appropriate phrasing
- Avoids technical terms like *phishing*, *malware*, or *HTTPS*
- Speaks gently, clearly, and reassuringly

> *“Please don’t click this link. It’s trying to scare you so you act fast. I’m here to keep you safe.”*

### 🔊 Voice-First Friendly (Roadmap Ready)
- Designed for text + voice output
- Ideal for elders and non-technical users
- Ready for future text-to-speech integration

### 🚦 Visual Risk Meter
- 🟢 Safe  
- 🟡 Suspicious  
- 🔴 Dangerous  

### ✅ Clear Actionable Guidance
Every analysis ends with **exactly 3 simple steps**, such as:
1. Do not click or reply  
2. Block the sender  
3. Report to your local cybercrime authority  

---

## 🖥️ Application Preview

| Text Analysis | Image Upload | Risk Result |
|--------------|--------------|-------------|
| ![Text Input](https://placehold.co/300x200?text=Text+Input) | ![Image Upload](https://placehold.co/300x200?text=Image+Upload) | ![Risk Meter](https://placehold.co/300x200?text=Risk+Meter) |

---

## 🧱 Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | Streamlit (Python) |
| AI Engine | Google Gemini 1.5 Flash |
| Multimodal Processing | Gemini Vision + OCR |
| Localization Engine | Country & Language Mapping |
| Styling | Custom CSS |
| Deployment | Streamlit Cloud / Cloud VM |

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    %% =========================
    %% Kavach AI – System Architecture
    %% =========================

    U[👤 End User<br/>(Elders / General Users)]
    
    %% ---------- Frontend ----------
    U --> UI[🖥️ Streamlit Frontend<br/>Web UI / UX Layer]

    UI --> TIN[📝 Text Input<br/>(SMS / Email / Chat)]
    UI --> IIN[🖼️ Image Upload<br/>(Screenshot JPG/PNG)]
    UI --> LOC[🌍 Country Selector]
    UI --> LANG[🗣️ Language Selector]

    %% ---------- Input Processing ----------
    TIN --> IP[⚙️ Input Processing Layer]
    IIN --> IP

    IP -->|Validate Text| TV[✔️ Text Preprocessing]
    IP -->|Validate Image| IV[✔️ Image Quality Check]
    IV -->|Blurry / Invalid| ERR[⚠️ Graceful Error Message]
    TV --> CTX
    IV --> CTX

    %% ---------- Localization ----------
    LOC --> CTX
    LANG --> CTX

    CTX[🌐 Localization & Context Engine<br/>
        • Country Rules<br/>
        • Regional Scam Patterns<br/>
        • Cultural Tone Mapping<br/>
        • Local Reporting Channels]

    %% ---------- Prompt Engineering ----------
    CTX --> PROMPT[🧠 Prompt Engineering Layer<br/>
        • Empathy-first Instructions<br/>
        • No Technical Jargon<br/>
        • Cultural Context Injection<br/>
        • Safety Constraints]

    %% ---------- AI Engine ----------
    PROMPT --> AI[🤖 Google Gemini 1.5 Flash<br/>
        • Text Understanding<br/>
        • Image + OCR Reasoning<br/>
        • Multimodal Analysis]

    %% ---------- Risk & Response ----------
    AI --> RISK[🚦 Risk Classification Engine]
    RISK --> SAFE[🟢 Safe]
    RISK --> SUSP[🟡 Suspicious]
    RISK --> DANG[🔴 Dangerous]

    SAFE --> RESP
    SUSP --> RESP
    DANG --> RESP

    RESP[📄 Response Formatter<br/>
        • Simple Explanation<br/>
        • Native Language Output<br/>
        • Exactly 3 Action Steps<br/>
        • Local Helpline Mapping]

    %% ---------- Output ----------
    RESP --> OUT[📢 Output Delivery Layer<br/>
        • Text Response<br/>
        • Risk Meter UI Update<br/>
        • Voice-ready Output]

    OUT --> UI
````

-----
