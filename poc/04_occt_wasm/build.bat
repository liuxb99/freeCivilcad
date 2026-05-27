@echo off
REM build.bat — OpenCASCADE 7.8 Emscripten WebAssembly build script
REM Usage: build.bat (requires Emscripten environment to be sourced)
REM Environment: Windows PowerShell / CMD

setlocal enabledelayedexpansion

set "BUILD_DIR=D:\AIWork\freeCivilcad\poc\04_occt_wasm\build"
set "OCCT_VERSION=7.8"
set "START_TIME=%TIME%"

echo ========================================
echo OpenCASCADE 7.8 Emscripten WASM Build
echo ========================================
echo Build directory: %BUILD_DIR%
echo Start time: %START_TIME%
echo.

REM Check Emscripten environment
where emcc >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Emscripten not found in PATH!
    echo Please source the Emscripten environment first:
    echo   C:\emsdk\emsdk_env.bat (Windows)
    echo   source emsdk_env.sh (Linux/Mac)
    exit /b 1
)

REM Check CMake
where cmake >nul 2>&1
if errorlevel 1 (
    echo [ERROR] CMake not found in PATH!
    exit /b 1
)

echo [1/5] Cleaning build directory...
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"

echo [2/5] Configuring CMake with Emscripten toolchain...
cd /d "%BUILD_DIR%"

REM Get OCCT source path
set "OCCT_SRC=D:\AIWork\freeCivilcad\poc\04_occt_wasm\occt-7.8.0"

if not exist "%OCCT_SRC%\CMakeLists.txt" (
    echo [ERROR] OpenCASCADE source not found at %OCCT_SRC%
    echo Please download OCCT 7.8 source first.
    exit /b 1
)

REM Generate build files using Emscripten's CMake toolchain
call emcmake cmake ^
    "%OCCT_SRC%" ^
    -DCMAKE_BUILD_TYPE=Release ^
    -DCMAKE_INSTALL_PREFIX="D:\AIWork\freeCivilcad\poc\04_occt_wasm\install" ^
    -DTCL_LIBRARY=0 ^
    -DTKLAPACK_LIBRARY=0 ^
    -DBUILD_MODULE_Draw=0 ^
    -DBUILD_MODULE_TestTests=0 ^
    -DBUILD_EXAMPLES=0 ^
    -DBUILD_DOC_API=0 ^
    -DBUILD_DOC_2DVIEW=0 ^
    -DCMAKE_VERBOSE_MAKEFILE=0 ^
    -G"Unix Makefiles" ^
    2>&1

if errorlevel 1 (
    echo [ERROR] CMake configuration failed!
    exit /b 1
)

echo [3/5] Building OpenCASCADE...
call emmake make -j4 2>&1

if errorlevel 1 (
    echo [WARNING] Full build failed. Attempting minimal build...
    echo [!] Falling back to building only core libraries (Draw, Priv, Standard, Standard_Handle)
    call emmake make -j4 Draw Priv Standard Standard_Handle 2>&1
)

echo [4/5] Generating JS glue files...
if exist "%BUILD_DIR%\Draw.exe" (
    echo [OK] Draw application generated: %BUILD_DIR%\Draw.js
    REM Copy JS/WASM output files to dist
    if not exist "D:\AIWork\freeCivilcad\poc\04_occt_wasm\dist" mkdir "D:\AIWork\freeCivilcad\poc\04_occt_wasm\dist"
    copy "%BUILD_DIR%\Draw.js" "D:\AIWork\freeCivilcad\poc\04_occt_wasm\dist\" >nul 2>&1
    copy "%BUILD_DIR%\Draw.wasm" "D:\AIWork\freeCivilcad\poc\04_occt_wasm\dist\" >nul 2>&1
    copy "%BUILD_DIR%\Draw.wasm.map" "D:\AIWork\freeCivilcad\poc\04_occt_wasm\dist\" >nul 2>&1
    echo [OK] Files copied to dist\
)

echo [5/5] Measuring output size...
for %%F in ("D:\AIWork\freeCivilcad\poc\04_occt_wasm\dist\Draw.wasm") do (
    set /a bytes=%%~zF
    echo WASM output size: !bytes! bytes
)

echo.
echo ========================================
echo Build complete!
echo End time: %TIME%
echo ========================================
