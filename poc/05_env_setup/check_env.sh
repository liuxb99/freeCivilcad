#!/bin/bash
# ============================================================
# freeCivilcad 開發環境檢查腳本 (macOS / Linux)
# 用途：驗證所有開發工具是否安裝且版本匹配
# 用法：bash check_env.sh
# ============================================================

set -euo pipefail

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# 計數器
TOTAL=0
PASS=0
FAIL=0

pass() { echo -e "${GREEN}[OK]${NC}  $1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
fail() { echo -e "${RED}[NOT_FOUND]${NC} $1"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; TOTAL=$((TOTAL+1)); }

echo "============================================"
echo " freeCivilcad 環境檢查 (macOS/Linux)"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ============================================================
# 工具函數
# ============================================================

check_version() {
    local TOOL="$1"
    local MIN_VERSION="$2"
    local DESC="$3"

    TOTAL=$((TOTAL+1))

    if ! command -v "$TOOL" &>/dev/null; then
        echo -e "${RED}[NOT_FOUND]${NC}  $DESC ($TOOL 未安裝)"
        FAIL=$((FAIL+1))
        return 1
    fi

    local VER
    VER=$("$TOOL" --version 2>/dev/null || echo "unknown")
    local VER_NUM
    VER_NUM=$(echo "$VER" | grep -oE '[0-9]+' | head -1)

    if [ -z "$VER_NUM" ]; then
        VER_NUM=0
    fi

    local MIN_NUM
    MIN_NUM=$(echo "$MIN_VERSION" | grep -oE '[0-9]+' | head -1)

    if [ "$VER_NUM" -ge "$MIN_NUM" ]; then
        echo -e "${GREEN}[OK]${NC}  $DESC ($TOOL -- $VER)"
        PASS=$((PASS+1))
    else
        echo -e "${RED}[WRONG_VERSION]${NC} $DESC ($TOOL -- $VER，需要 $MIN_VERSION+)"
        FAIL=$((FAIL+1))
    fi

    return 0
}

check_file() {
    local PATH="$1"
    local DESC="$2"
    TOTAL=$((TOTAL+1))

    if [ -f "$PATH" ]; then
        echo -e "${GREEN}[OK]${NC}  $DESC ($PATH)"
        PASS=$((PASS+1))
    else
        echo -e "${RED}[NOT_FOUND]${NC} $DESC ($PATH 不存在)"
        FAIL=$((FAIL+1))
    fi
}

check_npm_dep() {
    local PKG="$1"
    local MIN_VER="$2"
    local DESC="$3"

    TOTAL=$((TOTAL+1))

    if ! command -v npm &>/dev/null; then
        echo -e "${RED}[NOT_FOUND]${NC}  $DESC (npm 未安裝，無法檢查)"
        FAIL=$((FAIL+1))
        return 1
    fi

    local INSTALLED
    INSTALLED=$(npm list -g "$PKG" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "")

    if [ -n "$INSTALLED" ]; then
        local INST_NUM
        INST_NUM=$(echo "$INSTALLED" | grep -oE '[0-9]+' | head -1)
        local MIN_NUM
        MIN_NUM=$(echo "$MIN_VER" | grep -oE '[0-9]+' | head -1)

        if [ "$INST_NUM" -ge "$MIN_NUM" ]; then
            echo -e "${GREEN}[OK]${NC}  $DESC ($PKG@$INSTALLED)"
            PASS=$((PASS+1))
        else
            echo -e "${RED}[WRONG_VERSION]${NC} $DESC ($PKG@$INSTALLED，需要 $MIN_VER+)"
            FAIL=$((FAIL+1))
        fi
    else
        echo -e "${RED}[NOT_FOUND]${NC} $DESC ($PKG 未安裝，請運行 npm install)"
        FAIL=$((FAIL+1))
    fi

    return 0
}

check_python_dep() {
    local PKG="$1"
    local MIN_VER="$2"
    local DESC="$3"

    TOTAL=$((TOTAL+1))

    if ! command -v pip3 &>/dev/null && ! command -v pip &>/dev/null; then
        echo -e "${RED}[NOT_FOUND]${NC}  $DESC (pip 未安裝，無法檢查)"
        FAIL=$((FAIL+1))
        return 1
    fi

    local PIP_CMD
    if command -v pip3 &>/dev/null; then
        PIP_CMD="pip3"
    else
        PIP_CMD="pip"
    fi

    local INSTALLED
    INSTALLED=$("$PIP_CMD" show "$PKG" 2>/dev/null | grep -i "^Version:" | awk '{print $2}' || echo "")

    if [ -n "$INSTALLED" ]; then
        local INST_NUM
        INST_NUM=$(echo "$INSTALLED" | grep -oE '[0-9]+' | head -1)
        local MIN_NUM
        MIN_NUM=$(echo "$MIN_VER" | grep -oE '[0-9]+' | head -1)

        if [ "$INST_NUM" -ge "$MIN_NUM" ]; then
            echo -e "${GREEN}[OK]${NC}  $DESC ($PKG@$INSTALLED)"
            PASS=$((PASS+1))
        else
            echo -e "${RED}[WRONG_VERSION]${NC} $DESC ($PKG@$INSTALLED，需要 $MIN_VER+)"
            FAIL=$((FAIL+1))
        fi
    else
        echo -e "${RED}[NOT_FOUND]${NC} $DESC ($PKG 未安裝，請運行 pip install -r requirements.txt)"
        FAIL=$((FAIL+1))
    fi

    return 0
}

# ============================================================
# 開發工具檢查
# ============================================================

echo ">>> 開發工具"
echo "---"

check_version "node" "18" "Node.js"
check_version "npm" "9" "npm"
check_version "python3" "3.10" "Python"
check_version "pip3" "21" "pip"
check_version "rustc" "1.70" "Rust (rustc)"
check_version "cargo" "1.70" "Rust (cargo)"
check_version "emcc" "" "Emscripten (emcc)"
check_version "cmake" "3.20" "CMake"
check_version "git" "2" "Git"

if command -v git lfs version &>/dev/null; then
    check_version "git-lfs" "2" "Git LFS"
else
    # Git LFS 通過 git lfs version 檢查
    TOTAL=$((TOTAL+1))
    if git lfs version &>/dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC}  Git LFS ($(git lfs version 2>/dev/null || echo 'installed'))"
        PASS=$((PASS+1))
    else
        echo -e "${RED}[NOT_FOUND]${NC} Git LFS (未安裝，請運行: brew install git-lfs 或 choco install git-lfs)"
        FAIL=$((FAIL+1))
    fi
fi

echo ""

# ============================================================
# npm 依賴檢查
# ============================================================

echo ">>> npm 依賴"
echo "---"

check_npm_dep "react" "18" "React"
check_npm_dep "react-dom" "18" "react-dom"
check_npm_dep "three" "0.160" "Three.js"
check_npm_dep "vite" "5" "Vite"
check_npm_dep "tailwindcss" "3.4" "TailwindCSS"
check_npm_dep "@vitejs/plugin-react" "4" "@vitejs/plugin-react"

echo ""

# ============================================================
# Python 依賴檢查
# ============================================================

echo ">>> Python 依賴"
echo "---"

check_python_dep "fastapi" "104" "FastAPI"
check_python_dep "uvicorn" "24" "Uvicorn"
check_python_dep "pydantic" "2.5" "Pydantic"
check_python_dep "pytest" "7.4" "Pytest"
check_python_dep "pythonocc-core" "7.8" "pythonocc-core"

echo ""

# ============================================================
# 專案檔案檢查
# ============================================================

echo ">>> 專案檔案"
echo "---"

ROOT_DIR="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
# 向上兩層：poc/05_env_setup -> poc -> freeCivilcad

PROJECTS=(
    "package.json"
    "requirements.txt"
    "Cargo.toml"
    "DEVELOPMENT_GUIDE.md"
)

for f in "${PROJECTS[@]}"; do
    check_file "$f" "$f"
done

echo ""

# ============================================================
# 總結
# ============================================================

echo "============================================"
echo -e " 總計: ${TOTAL} | ${GREEN}通過: ${PASS}${NC} | ${RED}失敗: ${FAIL}${NC}"
echo " 完成時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
    echo -e "\n${RED}部分檢查未通過。請參考 DEVELOPMENT_GUIDE.md 修復。${NC}"
    exit 1
else
    echo -e "\n${GREEN}所有檢查通過！環境準備就緒。${NC}"
    exit 0
fi
