# freeCivilcad 開發環境搭建指南

> 適用於 Windows 與 macOS，涵蓋 Phase 0–3 全部依賴。

---

## 總覽

| 層級 | 技術棧 | 最低版本 |
|------|--------|----------|
| 前端構建 | Node.js + npm | 18.0+ |
| 後端 & LLM | Python 3.10+ | 3.10+ |
| CAD Kernel（Phase 3） | Rust + Cargo | 1.70+ |
| WebAssembly 編譯 | Emscripten | latest (sdk) |
| C++ 構建 | CMake | 3.20+ |
| 大文件管理 | Git LFS | 2.0+ |

---

## 1. Node.js 18+（前端構建）

### Windows

```powershell
# 使用 winget（Windows 10/11 預設安裝）
winget install OpenJS.NodeJS.LTS --accept-package-agreements

# 或使用 Chocolatey
# choco install nodejs-lts

# 驗證
node --version   # v18.x.x 或更高
npm --version    # 9.x.x 或更高
```

### macOS

```bash
# 使用 Homebrew
brew install node@18

# 或使用 nvm
# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
# nvm install 18
# nvm use 18

# 驗證
node --version
npm --version
```

### 常見問題

| 問題 | 解決方案 |
|------|----------|
| 權限錯誤 | 避免使用 `sudo npm install`，改用 nvm 切換 Node 版本 |
| npm 緩存錯誤 | `npm cache clean --force` 後重試 |

---

## 2. Python 3.10+（後端、LLM 測試）

### Windows

```powershell
# 使用 winget
winget install Python.Python.3.11 --accept-package-agreements

# 或使用 Chocolatey
# choco install python --version=3.11.0

# 或從 python.org 下載安裝程式，勾選 "Add Python to PATH"

# 驗證
python --version   # Python 3.10.x 或 3.11.x
pip --version
```

### macOS

```bash
# Homebrew 已內建 Python
brew install python@3.11

# 或使用 pyenv
# brew install pyenv
# pyenv install 3.11.0
# pyenv global 3.11.0

# 驗證
python3 --version
pip3 --version
```

### 虛擬環境（強烈建議）

```bash
# 建立虛擬環境
python -m venv .venv

# 啟用
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# 升級 pip
pip install --upgrade pip setuptools wheel
```

---

## 3. Rust 1.70+（CAD Kernel，Phase 3）

### Windows

```powershell
# 使用 rustup
winget install RustupInit --accept-package-agreements

# 或使用 Chocolatey
# choco install rust

# 或使用安裝腳本
# Invoke-WebRequest -Uri https://sh.rustup.rs -OutFile rustup-init.exe; .\rustup-init.exe

# 驗證
rustc --version    # rustc 1.70.x 或更高
cargo --version    # cargo 1.70.x 或更高
```

### macOS

```bash
# 使用 rustup
brew install rustup

# 或使用安裝腳本
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 驗證
rustc --version
cargo --version
```

### 推薦工具鏈

```bash
# 新增目標平台（若需交叉編譯）
rustup target add x86_64-unknown-linux-gnu
rustup target add wasm32-unknown-unknown

# 安裝 cargo-expand（可選，除錯用）
cargo install cargo-expand
```

---

## 4. Emscripten latest（WebAssembly 編譯）

### Windows

```powershell
# 先安裝 Python（Emscripten 依賴）
# 然後使用 pip 安裝 emscripten
pip install emscripten

# 或使用官方 git 倉庫（推薦，獲取最新版本）
git clone https://github.com/emscripten-core/emsdk.git C:\emsdk
cd C:\emsdk
.\emsdk.bat install latest
.\emsdk.bat activate latest

# 載入環境（加入批次檔）
.\emsdk.bat use-env.bat

# 驗證
emcc --version
```

### macOS

```bash
# 使用 pip（簡易方式）
pip install emscripten

# 或使用官方 git 倉庫（推薦）
brew install emscripten

# 或手動安裝
git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
cd ~/emsdk
./emsdk install latest
./emsdk activate latest
source ~/emsdk/emsdk_env.sh

# 驗證
emcc --version
```

### 常見問題

| 問題 | 解決方案 |
|------|----------|
| emcc 編譯失敗，找不到 Python | 確認 `EM_PYTHON` 環境變數指向正確 Python 路徑 |
| emcc 找不到 clang | `emcc --sysroot` 指定系統路徑 |
| 編譯時間過長 | 使用 `emcc -O3` 優化，避免 `-g4` 調試模式 |

---

## 5. CMake 3.20+

### Windows

```powershell
# 使用 winget
winget install Kitware.CMake --accept-package-agreements

# 或使用 Chocolatey
# choco install cmake --install-args "ADD_CMAKE_TO_PATH=System"

# 驗證
cmake --version    # 3.20.x 或更高
```

### macOS

```bash
# Homebrew
brew install cmake

# 或使用 pip
# pip install cmake

# 驗證
cmake --version
```

---

## 6. Git LFS（大文件管理）

### Windows

```powershell
# 使用 winget
winget install Git.git --accept-package-agreements

# 安裝 Git LFS
git lfs install

# 或從 git-lfs.github.com 下載安裝程式

# 驗證
git --version      # 2.0+
git lfs version    # 2.0+
```

### macOS

```bash
# Homebrew
brew install git-lfs

# 或從 git-lfs.github.com 下載安裝程式

# 驗證
git lfs version
```

---

## 7. npm 依賴（package.json）

```json
{
  "name": "freecivlcad",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "three": "^0.169"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3",
    "vite": "^5.4",
    "tailwindcss": "^3.4",
    "typescript": "^5.5"
  }
}
```

### 安裝

```bash
cd D:\AIWork\freeCivilcad
npm install
```

---

## 8. Python 依賴（requirements.txt）

```
# 核心框架
fastapi>=0.104,<1.0
uvicorn>=0.24,<1.0
pydantic>=2.5,<3.0

# CAD 核心（Phase 2-3）
pythonocc-core>=7.8,<8.0

# LibreDWG 綁定（若可用）
# librepy>=0.3  ; # 若 pypi 不可用，從源碼編譯

# 測試
pytest>=7.4,<8.0
pytest-asyncio>=0.23,<1.0

# LLM 集成
openai>=1.0,<2.0
tenacity>=8.2,<9.0

# 實用工具
python-dotenv>=1.0,<2.0
httpx>=0.27,<1.0
```

### 安裝

```bash
pip install -r requirements.txt
```

---

## 9. Rust 依賴（Cargo.toml）

```toml
[package]
name = "cad-kernel"
version = "0.1.0"
edition = "2021"

[dependencies]
# WebAssembly 綁定
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console"] }

# 序列化工具
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# 錯誤處理
thiserror = "1.0"

# 測試工具
approx = "0.5"

[dev-dependencies]
criterion = "0.5"

[lib]
crate-type = ["cdylib", "rlib"]

[profile.dev]
opt-level = 0
debug = true

[profile.release]
opt-level = 3
lto = true
```

### 構建

```bash
# 原生構建
cargo build

# WebAssembly 目標
cargo build --target wasm32-unknown-unknown --release
```

---

## 常見問題排查

### Emscripten 編譯失敗

1. 確認 Python 路徑正確：
   ```bash
   echo $EM_PYTHON   # Windows: %EM_PYTHON%
   ```
2. 確認 Emscripten 環境已載入：
   ```bash
   source ~/.emsdk/emsdk_env.sh   # macOS
   .\emsdk_env.bat                 # Windows
   ```

### LibreDWG CMake 錯誤

```bash
# Windows
cmake -G "Ninja" -DCMAKE_BUILD_TYPE=Release -B build .
cmake --build build

# macOS
cmake -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Release -B build .
cmake --build build
```

### Python OCC 安裝失敗

```bash
# Windows 需先安裝 OCC 預編譯包
pip install pythonocc-core

# macOS 可能需要 Xcode 命令行工具
xcode-select --install
```

### Rust WASM 目標添加失敗

```bash
rustup target add wasm32-unknown-unknown
```

---

## 驗證清單

- [ ] Node.js 18+ 已安裝且 `npm install` 成功
- [ ] Python 3.10+ 已安裝且虛擬環境已建立
- [ ] `pip install -r requirements.txt` 成功
- [ ] Rust 1.70+ 已安裝且 `cargo build` 成功
- [ ] Emscripten 已安裝且 `emcc --version` 輸出正常
- [ ] CMake 3.20+ 已安裝
- [ ] Git LFS 已安裝且 `git lfs install` 成功
- [ ] 環境檢查腳本 `check_env.sh` / `check_env.bat` 全部通過
