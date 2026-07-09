@echo off
echo Starting HealthDecode Backend...
echo.

cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found!
    echo Please run setup.bat first.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Check if main.py exists
if not exist "main.py" (
    echo [ERROR] main.py not found!
    pause
    exit /b 1
)

echo Virtual environment activated
echo Starting FastAPI server...
echo.
echo API URL: http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py
