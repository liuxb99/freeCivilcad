@echo off
chcp 65001 >nul
echo ========================================
echo   FreeCivilCAD - 啟動中...
echo ========================================
echo.

echo [1/2] 啟動後端服務...
start "FreeCivilCAD-Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] 啟動前端開發伺服器...
start "FreeCivilCAD-Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo 前端: http://localhost:5173
echo 後端: http://localhost:8000/docs
echo.
echo 關閉所有視窗即可停止服務。
