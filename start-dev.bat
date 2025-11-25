@echo off
REM KachinaHealth Development Startup Script (Windows Batch)
REM This script helps start both the backend and frontend servers

echo 🚀 Starting KachinaHealth Client Portal...
echo ========================================================
echo.

REM Get the current directory
set "PROJECT_ROOT=%~dp0"
set "BACKEND_PATH=%PROJECT_ROOT%backend"
set "FRONTEND_PATH=%PROJECT_ROOT%Client-Backend-and-Mobile-App-master\admin-dashboard"

echo Project root: %PROJECT_ROOT%
echo Backend path: %BACKEND_PATH%
echo Frontend path: %FRONTEND_PATH%
echo.

REM Check if backend directory exists
if not exist "%BACKEND_PATH%" (
    echo ❌ Backend directory not found at: %BACKEND_PATH%
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if frontend directory exists
if not exist "%FRONTEND_PATH%" (
    echo ❌ Frontend directory not found at: %FRONTEND_PATH%
    echo Please ensure the project structure is correct.
    pause
    exit /b 1
)

REM Check if .env file exists in backend
if exist "%BACKEND_PATH%\.env" (
    echo ✅ Found .env file in backend directory with database credentials configured
) else (
    echo ⚠️  Warning: .env file not found in backend directory
    echo Please ensure a .env file exists with your Supabase credentials.
    echo See README.md for environment variable setup.
    echo.
)

echo 🔧 Starting Backend Server...
echo ========================================================

REM Start backend server in new command window
start "KachinaHealth Backend" cmd /k "cd /d %BACKEND_PATH% && echo Starting backend server... && npm start"

echo ✅ Backend server starting in new window...
echo 📍 Backend will be available at: http://localhost:5000
echo 💚 Health check: http://localhost:5000/health
echo.

echo 🎨 Starting Frontend Server...
echo ========================================================

REM Start frontend server in new command window
start "KachinaHealth Frontend" cmd /k "cd /d %FRONTEND_PATH% && echo Starting frontend server... && npm run dev"

echo ✅ Frontend server starting in new window...
echo 📍 Frontend will be available at: http://localhost:3000
echo 🏠 Dashboard: http://localhost:3000/clienthome.html
echo.

echo ⏳ Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

echo.
echo 🎉 Development servers are starting!
echo ========================================================
echo 📱 Access your application:
echo    • Login Page:    http://localhost:3000
echo    • Dashboard:     http://localhost:3000/clienthome.html
echo    • API Health:    http://localhost:5000/health
echo.
echo 🛑 To stop the servers, close the command prompt windows that opened
echo.
echo 📝 Test credentials (from sample data):
echo    • Admin: admin@kachinahealth.com
echo    • Manager: john.smith@hospital1.com
echo    • User: sarah.johnson@hospital2.com
echo.
echo ✅ Setup complete! Check the new command windows for server status.
echo.
pause
