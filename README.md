# 🩺 HealthDecode — AI-Powered Medical Report Analyzer

<div align="center">

![HealthDecode](https://img.shields.io/badge/HealthDecode-v2.0-teal?style=for-the-badge&logo=heart&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Empowering Health Literacy through AI — Decode medical lab reports instantly.**

[🚀 Demo](#demo) • [⚙️ Setup](#setup) • [🏗️ Architecture](#architecture) • [✨ Features](#features) • [📖 Usage](#usage)

</div>

---

## 📌 Overview

HealthDecode is a full-stack AI-powered web application that enables patients to **understand their medical lab reports** without needing a doctor for every query. It uses a multi-layered pipeline combining:

- **Tesseract OCR / PDF.js** for text extraction from scanned and digital reports
- **Groq LLM (llama-3.3-70b)** for intelligent biomarker extraction when available
- **RAG (Retrieval-Augmented Generation)** with sentence-transformers for grounded explanations
- **Client-side NLP** with 50+ regex patterns as a always-available fallback
- A curated **medical knowledge base** with verified reference ranges from WHO, ICMR, and NHS

> ⚠️ **Medical Disclaimer:** HealthDecode is for *educational purposes only* and does not provide medical diagnosis or treatment. Always consult a qualified healthcare professional.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📄 **Multi-format Upload** | Supports PDF (text-based & scanned), JPG, PNG lab reports |
| 🖱️ **Drag & Drop** | Intuitive drag-and-drop file upload interface |
| 📋 **Paste Text** | Direct text-paste mode for copy-pasted reports |
| 🔬 **50+ Biomarkers** | CBC, Lipid Profile, LFT, KFT, Thyroid, Vitamins, Minerals, Electrolytes |
| 🇮🇳 **Indian Lab Formats** | Handles S. Creatinine, Sr. Cholesterol, Hb%, SGPT/SGOT, TLC etc. |
| 🤖 **AI Explanations** | Groq LLM + RAG-grounded plain-language explanations |
| 📊 **Visual Gauges** | Animated value-vs-range meters for each biomarker |
| 💡 **Recommendations** | Personalized lifestyle and dietary recommendations |
| 🔒 **Privacy First** | No data stored — all processing is in-browser or in-memory |
| 🌙 **Offline Mode** | Full client-side fallback when backend is unavailable |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ LandingPage  │  │ReportAnalyzer│  │KnowledgeExpl. │  │
│  └──────────────┘  └──────┬───────┘  └───────────────┘  │
│                           │                               │
│              ┌────────────▼──────────────┐               │
│              │     clientProcessor.ts     │               │
│              │  PDF.js → OCR fallback     │               │
│              │  Tesseract.js (browser)    │               │
│              │  50+ biomarker patterns    │               │
│              └────────────┬──────────────┘               │
└───────────────────────────┼─────────────────────────────┘
                            │ HTTP (optional)
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI + Python)             │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  OCR Service│  │  NLP Service │  │   AI Service   │  │
│  │  PyMuPDF +  │  │  spaCy +     │  │  Groq LLM      │  │
│  │  Tesseract  │  │  50+ Regex   │  │  llama-3.3-70b │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │                   RAG Pipeline                   │    │
│  │  sentence-transformers/all-MiniLM-L6-v2         │    │
│  │  Knowledge Base YAML → Embeddings → Retrieval   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  Knowledge Base: WHO + ICMR + NHS + Mayo Clinic         │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tooling |
| Tesseract.js | Client-side OCR for images |
| PDF.js (pdfjs-dist) | PDF text extraction |
| Tailwind CSS | Styling |
| shadcn/ui | Component library |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| PyMuPDF (fitz) | PDF text/image extraction |
| Tesseract / pytesseract | Server-side OCR |
| spaCy | NLP processing |
| Groq API | LLM-powered extraction + explanations |
| sentence-transformers | RAG embeddings |
| FAISS / numpy | Vector similarity search |
| pydantic-settings | Configuration management |

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) (Windows)
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### 🖥️ Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:5173
```

### 🐍 Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Configure environment
cp ../.env.example .env
# Edit .env and add your GROQ_API_KEY

# Start the server
python main.py
# API available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 🔑 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
USE_AI_EXTRACTION=true
USE_AI_EXPLANATIONS=true
```

> **Note:** The app works fully without a backend or Groq API key — it falls back to client-side OCR and pattern matching.

---

## 📖 Usage

### 1. Upload a Lab Report
- Drag & drop or click to upload a **PDF or image** (JPG/PNG)
- Supports both text-based and scanned/image PDFs
- Automatically falls back to OCR if PDF is scanned

### 2. Or Paste Report Text
- Switch to the **"Paste Text"** tab
- Copy all text from your lab report and paste it
- Click **"Analyze Text"**

### 3. Try the Demo
- Click **"Try Demo Report"** to see a complete sample analysis instantly

### 4. View Results
- See all detected biomarkers categorized by type
- Each biomarker shows: value, reference range, animated gauge, explanation, implications
- Get personalized lifestyle recommendations

---

## 🔬 Supported Biomarkers (50+)

| Category | Tests |
|---|---|
| **Blood Count (CBC)** | Hemoglobin, Hematocrit, RBC, WBC/TLC, Platelets, MCV, MCH, MCHC, Neutrophils, Lymphocytes, Eosinophils, Monocytes, Basophils |
| **Lipid Profile** | Total Cholesterol, LDL, HDL, Triglycerides, VLDL |
| **Liver Function (LFT)** | ALT/SGPT, AST/SGOT, Alkaline Phosphatase, GGT, Total Bilirubin, Direct Bilirubin, Albumin, Total Protein |
| **Kidney Function (KFT)** | Creatinine, BUN, Urea, Uric Acid, eGFR |
| **Thyroid** | TSH, Free T3, Free T4 |
| **Vitamins** | Vitamin D, Vitamin B12, Folate, Iron, Ferritin |
| **Minerals** | Calcium, Phosphorus, Magnesium, Zinc |
| **Electrolytes** | Sodium, Potassium, Chloride, Bicarbonate |
| **Diabetes** | Fasting Glucose, Random Blood Sugar, HbA1c |

---

## 📁 Project Structure

```
HealthDecode/
├── src/                        # Frontend source
│   ├── app/
│   │   ├── App.tsx             # Root component + navigation
│   │   └── components/
│   │       ├── LandingPage.tsx
│   │       ├── ReportAnalyzer.tsx  # Main analyzer with drag-drop, paste, demo
│   │       ├── KnowledgeExplorer.tsx
│   │       └── ui/             # shadcn/ui components
│   └── lib/
│       ├── clientProcessor.ts  # PDF.js + OCR + 50+ biomarker patterns
│       ├── api.ts              # Backend API client
│       └── knowledgeBase.ts    # Frontend knowledge base
│
├── backend/                    # FastAPI backend
│   ├── main.py                 # Server entry point
│   ├── requirements.txt
│   └── app/
│       ├── config.py           # Settings (pydantic-settings)
│       ├── schemas.py          # Pydantic models
│       ├── routes/             # API routes (analyzer, knowledge, health)
│       ├── services/
│       │   ├── ocr_service.py      # PyMuPDF + Tesseract OCR
│       │   ├── nlp_service.py      # spaCy + 50+ regex patterns
│       │   ├── ai_service.py       # Groq LLM integration
│       │   ├── rag_service.py      # RAG retrieval pipeline
│       │   ├── analysis_service.py # Orchestrates all services
│       │   └── knowledge_service.py # Knowledge base YAML loader
│       └── data/
│           ├── reference_ranges.yaml   # WHO/ICMR/NHS reference ranges
│           └── knowledge_base.yaml     # Nutrient knowledge base
│
├── docs/                       # Additional documentation
│   ├── DEPLOYMENT.md           # Vercel/Netlify deployment guide
│   └── POPPLER_INSTALL.md      # Poppler installation guide
│
├── .env.example                # Environment variables template
├── package.json                # Frontend dependencies
└── vite.config.ts              # Vite configuration
```

---

## 🚀 Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for instructions on deploying to:
- **Vercel** (frontend + serverless backend)
- **Netlify** (frontend static deployment)
- **Railway / Render** (full-stack deployment)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👥 Authors

**HealthDecode** — 4th Year B.Tech AI/ML Project

- Built with ❤️ for improving health literacy
- Reference data from WHO, ICMR, NHS, and Mayo Clinic

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>⚕️ HealthDecode — For Education, Not Diagnosis</sub>
</div>
