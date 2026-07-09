# HealthDecode Backend Setup

## Prerequisites

1. **Python 3.8 or higher**
2. **Tesseract OCR**
3. **pip** (Python package manager)

## Installation Steps

### 1. Install Tesseract OCR

**Windows:**
- Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
- Run the installer
- Default installation path: `C:\Program Files\Tesseract-OCR\`
- The backend will auto-detect this location

**Mac (using Homebrew):**
```bash
brew install tesseract
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install tesseract-ocr
```

### 2. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 3. Activate Virtual Environment

**Windows:**
```powershell
.\venv\Scripts\Activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 4. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 5. Download spaCy Model

```bash
python -m spacy download en_core_web_sm
```

### 6. Run the Backend

```bash
python main.py
```

The backend will start on http://127.0.0.1:8000

You can view the API documentation at http://127.0.0.1:8000/docs

## Environment Variables (Optional)

Create a `.env` file in the backend directory:

```env
HOST=127.0.0.1
PORT=8000
DEBUG=True
```

## Troubleshooting

### Tesseract Not Found
If you get an error about Tesseract not found:
1. Make sure Tesseract is installed
2. Add Tesseract to your PATH environment variable
3. Or the backend will prompt you with the download link

### spaCy Model Not Found
```bash
python -m spacy download en_core_web_sm
```

### Port Already in Use
Change the PORT in `.env` file or in `app/config.py`

## API Endpoints

- `GET /` - Root endpoint
- `GET /api/health` - Health check
- `POST /api/analyzer/upload` - Upload and analyze medical report
- `POST /api/analyzer/analyze-text` - Analyze text directly
- `GET /api/knowledge/nutrients` - Get all nutrients
- `GET /api/knowledge/nutrients/{id}` - Get specific nutrient
- `GET /api/knowledge/search` - Search knowledge base

## Testing the Backend

Visit http://127.0.0.1:8000/docs for interactive API documentation.
