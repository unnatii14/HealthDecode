@echo off
echo ================================================
echo   HealthDecode - Complete Setup
echo ================================================
echo.

echo This script will set up both backend and frontend.
echo.
echo Prerequisites needed:
echo  - Python 3.8+ (with pip)
echo  - Node.js and npm
echo  - Tesseract OCR
echo.
pause

echo.
echo [1/3] Setting up Backend...
echo ================================================
cd backend

echo Creating Python virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    echo Make sure Python is installed and in PATH
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [WARNING] Some dependencies may have failed to install
    pause
)

echo Downloading spaCy model...
python -m spacy download en_core_web_sm

echo Creating upload directory...
if not exist "uploads" mkdir uploads

cd ..

echo.
echo [2/3] Setting up Frontend...
echo ================================================

echo Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install npm dependencies
    pause
    exit /b 1
)

echo.
echo [3/3] Setup Complete!
echo ================================================
echo.
echo ✅ Backend is ready in the 'backend' folder
echo ✅ Frontend is ready
echo.
echo To start the application:
echo.
echo  1. Open a terminal and run:
echo     cd backend
echo     .\start.bat
echo.
echo  2. Open another terminal and run:
echo     npm run dev
echo.
echo  3. Backend API: http://127.0.0.1:8000
echo     API Docs: http://127.0.0.1:8000/docs
echo     Frontend: http://localhost:5173
echo.
echo ⚠️  IMPORTANT:
echo  - Make sure Tesseract OCR is installed
echo  - Download from: https://github.com/UB-Mannheim/tesseract/wiki
echo.
echo Read SETUP_COMPLETE.md for detailed instructions
echo.
pause
