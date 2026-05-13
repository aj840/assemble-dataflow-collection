@echo off
title Assemble DataFlow Launcher
color 0A

echo.
echo  ==========================================
echo    ASSEMBLE DATAFLOW COLLECTION
echo    Starting all servers...
echo  ==========================================
echo.

:: Start Backend
echo  [1/2] Starting Backend on port 5000...
cd /d "%~dp0backend"
start "BACKEND ^| Assemble DataFlow" cmd /k "node server.js"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend
echo  [2/2] Starting Frontend on port 5173...
cd /d "%~dp0frontend"
start "FRONTEND ^| Assemble DataFlow" cmd /k "npm run dev"

:: Wait for frontend to initialize
timeout /t 4 /nobreak >nul

:: Open browser
echo.
echo  Opening http://localhost:5173 in browser...
start http://localhost:5173

echo.
echo  ==========================================
echo   SERVERS ARE RUNNING - DO NOT CLOSE THEM
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000
echo.
echo   CREDENTIALS:
echo   Admin  ID: UltraAss   Pass: Human@2026
echo   User   ID: Ajay       Pass: 1219
echo  ==========================================
echo.
echo  This window will close automatically.
timeout /t 5 /nobreak >nul
exit
