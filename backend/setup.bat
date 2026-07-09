@echo off
echo ================================================
echo   HealthDecode Backend Setup Script
echo ================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

echo [1/5] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    pause
    exit /b 1
)

echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/5] Installing Python dependencies...
echo This may take a few minutes...
python.exe -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    echo.
    echo Common fixes:
    echo 1. Make sure you're using Python 3.8+
    echo 2. Check your internet connection
    pause
    exit /b 1
)
echo Dependencies installed successfully!

echo [4/5] Downloading spaCy model (optional)...
python -c "import sys; print('Python version:', sys.version)"
python -c "import sys; v=sys.version_info; exit(0 if v.major==3 and v.minor<=12 else 1)" 2>nul
if %errorlevel%==0 (
    echo Python 3.8-3.12 detected, installing spaCy...
    pip install spacy==3.7.6
    python -m spacy download en_core_web_sm
) else (
    echo Python 3.13+ detected, skipping spaCy ^(not yet compatible^)
    echo The system will work with regex-based text processing
)

echo [5/5] Creating upload directory...
if not exist "uploads" mkdir uploads

echo.
echo ================================================
echo   Setup Complete!
echo ================================================
echo.
echo To start the backend server:
echo   1. Run: backend\venv\Scripts\activate
echo   2. Run: python backend\main.py
echo.
echo The API will be available at: http://127.0.0.1:8000
echo API Documentation: http://127.0.0.1:8000/docs
echo.
pause
