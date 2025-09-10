@echo off
echo Starting R2 Upload API Server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Install required packages
echo Installing required packages...
python -m pip install flask flask-cors boto3

REM Start the server
echo.
echo Starting server on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
cd backend
python r2-upload-api.py

pause
