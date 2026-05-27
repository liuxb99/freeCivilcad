@echo off
REM ============================================================
REM freeCivilcad 開發環境檢查腳本 (Windows)
REM 用途：驗證所有開發工具是否安裝且版本匹配
REM 用法：check_env.bat
REM ============================================================

setlocal enabledelayedexpansion

set TOTAL=0
set PASS=0
set FAIL=0
set WARN=0

echo ============================================
echo  freeCivilcad 環境檢查 (Windows)
echo  %date% %time%
echo ============================================
echo.

REM ============================================================
REM 工具函數
REM ============================================================

:check_tool
set TOOL_NAME=%~1
set MIN_VER=%~2
set DESC=%~3

set /a TOTAL+=1

REM 檢查工具是否存在
where !TOOL_NAME! >nul 2>&1
if !errorlevel! neq 0 (
    echo [NOT_FOUND] !DESC! (!TOOL_NAME! 未安裝)
    set /a FAIL+=1
    goto :eof
)

REM 獲取版本
for /f "tokens=*" %%v in ('!TOOL_NAME! --version 2^>nul ^| findstr /C:"version" ^| for /f %%a in ("%%v") do echo %%a') do (
    set VER=%%v
    goto :ver_found
)

REM 如果 findstr 失敗，嘗試其他方式
set VER=unknown

:ver_found
for /f "delims=." %%a in ("!VER!") do (
    set VER_NUM=%%a
)

if "!VER_NUM!"=="" set VER_NUM=0

REM 解析最小版本
for /f "delims=." %%a in ("!MIN_VER!") do (
    set MIN_NUM=%%a
)

if !VER_NUM! GEQ !MIN_NUM! (
    echo [OK]       !DESC! (!TOOL_NAME! -- !VER!)
    set /a PASS+=1
) else (
    echo [WRONG_VERSION] !DESC! (!TOOL_NAME! -- !VER!，需要 !MIN_VER!+)
    set /a FAIL+=1
)

goto :eof

:check_file
set FILE_PATH=%~1
set DESC=%~2

set /a TOTAL+=1

if exist "!FILE_PATH!" (
    echo [OK]       !DESC! (!FILE_PATH!)
    set /a PASS+=1
) else (
    echo [NOT_FOUND] !DESC! (!FILE_PATH! 不存在)
    set /a FAIL+=1
)

goto :eof

:check_npm_dep
set PKG_NAME=%~1
set MIN_VER=%~2
set DESC=%~3

set /a TOTAL+=1

where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo [NOT_FOUND] !DESC! (npm 未安裝)
    set /a FAIL+=1
    goto :eof
)

REM 檢查 npm 包
for /f "tokens=*" %%v in ('npm list -g !PKG_NAME! 2^>nul ^| findstr /C:"@vitejs/plugin-react" ^| findstr /C:"version"') do (
    set PKG_VER=%%v
)

if not "!PKG_VER!"=="" (
    for /f "tokens=2 delims=:@" %%n in ("!PKG_VER!") do (
        set INST_VER=%%n
    )
    for /f "delims=." %%a in ("!INST_VER!") do (
        set INST_NUM=%%a
    )
    for /f "delims=." %%a in ("!MIN_VER!") do (
        set MIN_NUM=%%a
    )

    if defined INST_NUM if !INST_NUM! GEQ !MIN_NUM! (
        echo [OK]       !DESC! (!PKG_NAME@!INST_VER!)
        set /a PASS+=1
    ) else (
        echo [WRONG_VERSION] !DESC! (!PKG_NAME@!INST_VER!，需要 !MIN_VER!+)
        set /a FAIL+=1
    )
) else (
    echo [NOT_FOUND] !DESC! (!PKG_NAME! 未安裝，請運行 npm install)
    set /a FAIL+=1
)

goto :eof

:check_python_dep
set PKG_NAME=%~1
set MIN_VER=%~2
set DESC=%~3

set /a TOTAL+=1

where pip >nul 2>&1
if !errorlevel! neq 0 (
    echo [NOT_FOUND] !DESC! (pip 未安裝)
    set /a FAIL+=1
    goto :eof
)

REM 檢查 Python 包
for /f "tokens=2 delims=:" %%v in ('pip show !PKG_NAME! 2^>nul ^| findstr /C:"Version:"') do (
    set INST_VER=%%v
    goto :py_found
)

for /f "tokens=2 delims= " %%v in ('pip show !PKG_NAME! 2^>nul ^| findstr /C:"Version"') do (
    set INST_VER=%%v
)

:py_found

if not "!INST_VER!"=="" (
    for /f "delims=." %%a in ("!INST_VER!") do (
        set INST_NUM=%%a
    )
    for /f "delims=." %%a in ("!MIN_VER!") do (
        set MIN_NUM=%%a
    )

    if defined INST_NUM if !INST_NUM! GEQ !MIN_NUM! (
        echo [OK]       !DESC! (!PKG_NAME@!INST_VER!)
        set /a PASS+=1
    ) else (
        echo [WRONG_VERSION] !DESC! (!PKG_NAME@!INST_VER!，需要 !MIN_VER!+)
        set /a FAIL+=1
    )
) else (
    echo [NOT_FOUND] !DESC! (!PKG_NAME! 未安裝，請運行 pip install -r requirements.txt)
    set /a FAIL+=1
)

goto :eof

REM ============================================================
REM 開發工具檢查
REM ============================================================

echo >>> 開發工具
echo ---
echo.

call :check_tool "node.exe" "18" "Node.js"
call :check_tool "npm.cmd" "9" "npm"
call :check_tool "python.exe" "3.10" "Python"
call :check_tool "pip.exe" "21" "pip"
call :check_tool "rustc.exe" "1.70" "Rust (rustc)"
call :check_tool "cargo.exe" "1.70" "Rust (cargo)"
call :check_tool "emcc.cmd" "" "Emscripten (emcc)"
call :check_tool "cmake.exe" "3.20" "CMake"
call :check_tool "git.exe" "2" "Git"
call :check_tool "git-lfs.exe" "2" "Git LFS"

echo.

REM ============================================================
REM npm 依賴檢查
REM ============================================================

echo >>> npm 依賴
echo ---
echo.

call :check_npm_dep "react" "18" "React"
call :check_npm_dep "react-dom" "18" "react-dom"
call :check_npm_dep "three" "0.160" "Three.js"
call :check_npm_dep "vite" "5" "Vite"
call :check_npm_dep "tailwindcss" "3.4" "TailwindCSS"
call :check_npm_dep "@vitejs/plugin-react" "4" "@vitejs/plugin-react"

echo.

REM ============================================================
REM Python 依賴檢查
REM ============================================================

echo >>> Python 依賴
echo ---
echo.

call :check_python_dep "fastapi" "104" "FastAPI"
call :check_python_dep "uvicorn" "24" "Uvicorn"
call :check_python_dep "pydantic" "2.5" "Pydantic"
call :check_python_dep "pytest" "7.4" "Pytest"
call :check_python_dep "pythonocc-core" "7.8" "pythonocc-core"

echo.

REM ============================================================
REM 專案檔案檢查
REM ============================================================

echo >>> 專案檔案
echo ---
echo.

for %%f in (package.json requirements.txt Cargo.toml DEVELOPMENT_GUIDE.md) do (
    call :check_file "%%f" "%%f"
)

echo.

REM ============================================================
REM 總結
REM ============================================================

echo ============================================
echo  總計: %TOTAL% | 通過: %PASS% | 失敗: %FAIL%
echo  完成時間: %date% %time%
echo ============================================

if %FAIL% gtr 0 (
    echo.
    echo 部分檢查未通過。請參考 DEVELOPMENT_GUIDE.md 修復。
) else (
    echo.
    echo 所有檢查通過！環境準備就緒。
)

echo.
pause
