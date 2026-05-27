# Phase 0 技術可行性驗證（POC）— 實作計劃

## 相依性圖

```
05_env_setup ──┬── 01_canvas2d (獨立)
               ├── 02_libredwg (獨立)
               ├── 03_llm_command (獨立，但不建議在 01/02 完成前啟動)
               └── 04_occt_wasm (獨立，高風險，可並行探索)
```

**可並行執行**: 01、02、04 可完全並行。03 可與 01 部分並行（需先理解 01 的資料模型）。

---

## 1. 01_canvas2d — Canvas2D 繪圖引擎

**狀態**: ✅ 已有完整原型（LINE/CIRCLE/ARC 繪製、選取、移動、縮放、網格、屬性面板）
**工作量**: 小（完善 + 測試）

### 剩餘步驟

| # | 步驟 | 說明 | 預估時間 |
|---|------|------|----------|
| 1.1 | 程式碼重構 — 模組化 | 將單一 script 拆為 model/render/controller/input 模組，建立 Entity 類別體系 | 30 min |
| 1.2 | 加入快照快取 | 使用離屏 canvas 快取網格+已完成圖元，只重繪動態層（繪圖中+選取框） | 20 min |
| 1.3 | 加入多邊形 (POLYGON) | 支援多邊形繪製（點擊新增頂點、雙擊完成） | 15 min |
| 1.4 | 加入文字 (TEXT) | 支援文字插入（點擊位置、輸入內容） | 15 min |
| 1.5 | 加入復原/重做 (Undo/Redo) | 基於 Command Pattern 的 history stack | 20 min |
| 1.6 | 匯出 DXF（基本） | 實作簡易 DXF 匯出（僅實體幾何，無樣式） | 20 min |
| 1.7 | 性能測試 | 測試 1000/5000/10000 圖元下的 FPS 與交互延遲 | 15 min |

### 驗證標準

- [ ] 開啟 index.html 可直接在瀏覽器中使用
- [ ] LINE/CIRCLE/ARC/多邊形/文字均可繪製
- [ ] 選取、移動、縮放、刪除操作正常
- [ ] Undo/Redo 支援至少 50 步
- [ ] 10000 圖元下 FPS >= 30

---

## 2. 02_libredwg — DXF 解析器

**狀態**: ⚠️ 目錄骨架存在但 `src/` 為空，僅有 `test_files/test.dxf`
**工作量**: 中

### 實作步驟

| # | 步驟 | 說明 | 預估時間 |
|---|------|------|----------|
| 2.1 | 分析 test.dxf 結構 | 使用 Python 的 `ezdxf` 讀取 test.dxf 並輸出結構樹（ENTITIES/BLOCKS/TABLES 各段內容） | 15 min |
| 2.2 | 建立 DXF 解析器 `src/parser.py` | 實作基於 ezdxf 的解析器，支援 LINE/CIRCLE/ARC/LWPOLYLINE/TEXT 實體提取 | 30 min |
| 2.3 | 實體映射層 `src/entity_mapper.py` | 將 DXF 實體映射為統一的中間格式（dict），供前端 canvas2d 使用 | 20 min |
| 2.4 | 建立測試腳本 `test_parse.py` | 讀取 test.dxf → 解析 → 輸出 JSON 到 `output/parsed.json`（含圖元數量、類型統計、幾何資訊） | 15 min |
| 2.5 | 前端載入測試 `test_load.html` | 建立一個測試頁面，讀取 parsed.json 並在 canvas2d 上渲染 | 20 min |
| 2.6 | 容錯處理 | 處理常見 DXF 異常（缺少欄位、非標準實體、編碼問題） | 15 min |

### 驗證標準

- [ ] `python test_parse.py` 成功輸出 `output/parsed.json`
- [ ] 解析結果包含所有 test.dxf 中的 LINE/CIRCLE/ARC 實體
- [ ] parsed.json 格式可直接被 canvas2d 消費（座標、顏色、圖層）
- [ ] `test_load.html` 正確渲染 DXF 內容到 canvas

---

## 3. 03_llm_command — LLM 命令映射

**狀態**: ❌ 目錄不存在，需從零建立
**工作量**: 中

### 實作步驟

| # | 步驟 | 說明 | 預估時間 |
|---|------|------|----------|
| 3.1 | 建立目錄結構 | `poc/03_llm_command/`，含 `index.html`、`app.py`、`prompts/`、`requirements.txt` | 5 min |
| 3.2 | 定義 NL 指令語法 | 定義支援的繪圖指令格式（Line from (0,0) to (10,10)、Circle center (5,5) radius 3、Arc center ...、Move entity 1 to ...、Delete entity 1、Zoom to ...） | 15 min |
| 3.3 | 建立 LLM Prompt 模板 `prompts/cad_commands.md` | 定義 system prompt + few-shot examples，將 NL 映射為 JSON 指令序列 | 15 min |
| 3.4 | 建立後端代理 `app.py` | 基於 FastAPI 的 LLM 轉發服務，接受 NL → 呼叫 LLM API → 返回 JSON 指令陣列 | 30 min |
| 3.5 | 建立前端 `index.html` | 聊天式輸入框 + canvas2d 嵌入，展示 LLM 命令執行過程 | 30 min |
| 3.6 | NL 指令執行器 `src/executor.js` | 將 LLM 回傳的 JSON 指令序列依序在 canvas2d 上執行 | 20 min |
| 3.7 | 錯誤處理與回饋 | 處理 LLM 回傳格式錯誤、部分執行失敗、模糊指令補問 | 15 min |

### 技術風險

- **LLM API 成本與延遲**: 每次命令需呼叫 LLM，單次 < 2s 才可接受。建議使用 gpt-4o-mini 或本地模型（如 ollama）。
- **NL 模糊性**: 使用者描述可能不精確，需設計補問機制或容忍度。
- **驗證**: 提供 10 組測試案例（含邊界情況），由 Python 腳本自動比對。

### 驗證標準

- [ ] `python app.py && open index.html` 可啟動完整流程
- [ ] 輸入 "畫一條線從 0,0 到 10,10" → canvas 上出現對應 LINE
- [ ] 輸入 "畫一個圓心在 5,5 半徑 3 的圓" → canvas 上出現對應 CIRCLE
- [ ] 輸入 "刪除圖元 1" → 對應圖元被移除
- [ ] 10 組測試案例全部通過

---

## 4. 04_occt_wasm — OpenCASCADE WASM

**狀態**: ⚠️ 框架文件齊全，但**未編譯**，README 指出此路徑技術風險高
**工作量**: 大（編譯環境設置）+ 替代方案中

### 技術風險評估（摘自 README）

| 風險 | 等級 | 說明 |
|------|------|------|
| CMake 不支援 Emscripten | 🔴 高 | OCCT CMakeLists.txt 需大量修改 |
| WASM 體積過大 | 🔴 高 | 預期 50-200 MB（核心模組 5-15 MB）|
| 記憶體限制 | 🟡 中 | WASM 4GB 上限，處理大型 CAD 模型不足 |
| X11/GL 依賴 | 🟡 中 | Draw 應用程式無法直接跑在瀏覽器 |

### 建議策略：雙軌並行

#### 軌道 A：嘗試最小化編譯（有限時間箱）

| # | 步驟 | 說明 | 時間箱 |
|---|------|------|--------|
| 4A.1 | 安裝 Emscripten SDK | 按照 README 指引安裝 `emsdk` 並驗證 `emcc --version` | 30 min |
| 4A.2 | 下載 OCCT 7.8 源碼 | `git clone --branch 7.8.0` 到 occt-7.8.0/ | 10 min |
| 4A.3 | 執行 CMake 配置 | 執行 `build.bat`，觀察錯誤 | 15 min |
| 4A.4 | 若失敗：採用手動編譯策略 | 僅編譯 Standard + Priv 核心庫，使用 `emcc -c` 逐檔編譯 | 2 hr |
| 4A.5 | 若成功：產出 Draw.wasm | 將 WASM 輸出到 `dist/` | - |

**時間箱上限**: 3 小時。超過則標記為「阻塞」並切換到軌道 B。

#### 軌道 B：後端 OCC 方案（推薦短期方案）

| # | 步驟 | 說明 | 預估時間 |
|---|------|------|----------|
| 4B.1 | 建立後端 `server.py` | FastAPI + pythonocc-core 包裝基本幾何操作（創建直線/圓/弧、距離計算、交點） | 30 min |
| 4B.2 | 建立 WebSocket 通訊 | 前後端透過 WebSocket 傳遞幾何指令與結果 | 20 min |
| 4B.3 | 前端連接 `ws_client.js` | 從 canvas2d 發送指令到後端，接收結果並渲染 | 20 min |
| 4B.4 | 整合測試 `test_occ_backend.html` | 整合以上所有功能，展示完整前後端 CAD 操作鏈 | 20 min |

### 驗證標準

- **軌道 A**:
  - [ ] `build.bat` 成功產出 `dist/Draw.wasm`（體積 < 50 MB）
  - [ ] `test_geometry.html` 載入 WASM 並執行 1000 條直線創建 < 2s

- **軌道 B**:
  - [ ] `python server.py` 啟動後端
  - [ ] 前端可透過 WebSocket 創建幾何實體並收到計算結果
  - [ ] 端到端延遲 < 100ms（本地）

---

## 5. 05_env_setup — 環境搭建與文檔

**狀態**: ✅ DEVELOPMENT_GUIDE.md 完整，check_env.bat/sh 已完成
**工作量**: 小（驗證）

### 剩餘步驟

| # | 步驟 | 說明 | 預估時間 |
|---|------|------|----------|
| 5.1 | 執行環境檢查 | 跑 `check_env.bat` 確認所有工具已安裝 | 5 min |
| 5.2 | 安裝 npm 依賴 | `npm install` 安裝前端依賴 | 10 min |
| 5.3 | 建立 Python venv + 安裝 | 建立 `.venv` 並 `pip install -r requirements.txt` | 10 min |
| 5.4 | 修復檢查腳本（若失敗） | 根據失敗項目更新 GUIDE 或安裝對應工具 | 15 min |
| 5.5 | 撰寫 POC 總覽 README | 根目錄 `README.md` 介紹 Phase 0 架構與各 POC 關聯 | 15 min |

### 驗證標準

- [ ] `check_env.bat` 全部 check 通過
- [ ] `npm run dev` 可啟動開發伺服器
- [ ] `python -c "import fastapi"` 成功

---

## 執行順序建議

```
建議執行順序:
  第 1 步: 05_env_setup (5 min 驗證，先確保工具鏈)
  第 2 步: 01_canvas2d 完善 + 02_libredwg 實現 (可並行)
  第 3 步: 04_occt_wasm 雙軌探索 (可並行於第 2 步)
  第 4 步: 03_llm_command (依賴 01 的資料模型理解)
  第 5 步: 整合測試與驗收
```

---

## 工作量總表

| 子項 | 工作量 | 時長估計 | 風險 |
|------|--------|----------|------|
| 01_canvas2d | 小 | 2-3 小時 | 低 |
| 02_libredwg | 中 | 2-3 小時 | 低 |
| 03_llm_command | 中 | 2-3 小時 | 中（LLM API 依賴）|
| 04_occt_wasm | 大 | 3-6 小時（含降級方案）| 🔴 高 |
| 05_env_setup | 小 | 0.5-1 小時 | 低 |
| **總計** | | **8-14 小時** | |

---

## 技術風險摘要

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| OCCT WASM 編譯失敗 | 04 無法交付 | 已有降級方案 B（後端 OCC + WebSocket）|
| WASM 體積過大 | 瀏覽器載入 > 10s | 僅編譯核心模組（5-15 MB）|
| LLM API 不可用 | 03 無法交付 | 支援 ollama 本地模型；提供離線 Rule-based 模式 |
| DXF 編碼問題 | 解析部分檔案失敗 | ezdxf 已處理大部份編碼；增加編碼自動檢測 |
