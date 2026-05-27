# Phase 1 MVP 整合開發計畫

> 生成時間: 2026-05-27T14:30:00+08:00
> 對應任務: TASK-003
> 基礎: Phase 0 POC 全部完成（評分 92/100）

---

## 1. 架構概覽

### 1.1 整體系統架構

```
┌─────────────────────────────────────────────────────────┐
│                    瀏覽器 (Chrome)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │             前端 (Vite + React JSX)                │  │
│  │                                                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │  │
│  │  │ Toolbar  │ │ LayerPanel│ │  CommandInput     │   │  │
│  │  │ (繪圖工具)│ │ (圖層管理)│ │  (LLM 命令輸入)  │   │  │
│  │  └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │  │
│  │       │             │                │             │  │
│  │  ┌────▼─────────────▼────────────────▼─────────┐   │  │
│  │  │          Canvas2D React 組件                 │   │  │
│  │  │   (封裝 POC 01_canvas2d 引擎 + snapshot)     │   │  │
│  │  └────────────────────┬────────────────────────┘   │  │
│  │                       │                            │  │
│  │  ┌────────────────────▼────────────────────────┐   │  │
│  │  │     Services (api.js + ws.js)                │   │  │
│  │  │     REST 呼叫 + WebSocket 連接               │   │  │
│  │  └────────────────────┬────────────────────────┘   │  │
│  └───────────────────────┼───────────────────────────┘  │
└──────────────────────────┼────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────┼────────────────────────────┐
│  ┌───────────────────────▼────────────────────────┐   │
│  │          後端 (FastAPI Python 3.10+)            │   │
│  │                                                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────┐ │   │
│  │  │ router/  │ │ router/  │ │ router/        │ │   │
│  │  │ canvas.py│ │ file.py  │ │ layer.py       │ │   │
│  │  └────┬─────┘ └────┬─────┘ └───────┬────────┘ │   │
│  │       │             │               │          │   │
│  │  ┌────▼─────────────▼───────────────▼────────┐ │   │
│  │  │          router/llm.py                    │ │   │
│  │  │   (規則引擎，源自 POC 03_llm_command)      │ │   │
│  │  └────────────────┬─────────────────────────┘ │   │
│  │                   │                            │   │
│  │  ┌────────────────▼─────────────────────────┐  │   │
│  │  │    services/                             │  │   │
│  │  │    ├── dxf_parser.py  (來自 POC 02)      │  │   │
│  │  │    ├── command.py     (CAD 命令執行器)    │  │   │
│  │  │    └── geometry.py   (幾何計算 / WASM橋) │  │   │
│  │  └─────────────────────────────────────────┘  │   │
│  │                                                │   │
│  │  ┌─────────────────────────────────────────┐  │   │
│  │  │    websocket/handler.py                 │  │   │
│  │  │    (即時同步源自 POC 04)                 │  │   │
│  │  └─────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 1.2 模組相依性圖

```
PH1-001 (前端骨架) → PH1-002 (Canvas2D React) ──→ PH1-004 (前後端連接)
                                                      ↑
PH1-003 (後端服務) ───────────────────────────────────┘
                                                      │
PH1-005 (圖層管理) ── 依賴 PH1-002 + PH1-003 ────────┤
                                                      │
PH1-006 (LLM 命令) ── 依賴 PH1-003 + PH1-004 ────────┤
                                                      │
PH1-007 (文件管理) ── 依賴 PH1-003 + PH1-004 ────────┤
                                                      │
PH1-008 (UI 整合) ── 依賴 PH1-002~007 ───────────────┤
```

### 1.3 技術棧確認

| 層級 | 技術 | 版本 | 備註 |
|------|------|------|------|
| 前端框架 | Vite + React | Vite 5.x / React 18.x | JSX，非 TypeScript |
| 前端渲染 | HTML5 Canvas | — | 自訂引擎（非 Three.js） |
| 前端通訊 | WebSocket + fetch | — | ws.js + api.js |
| 後端框架 | FastAPI | 0.104+ | Python 3.10+ |
| 後端通訊 | WebSocket + REST | — | uvicorn |
| DXF 解析 | 純 Python | — | 自訂（無 ezdxf） |
| LLM 映射 | 規則引擎 + 預留 LLM API | — | 離線可用 |
| 幾何引擎 | 自訂 WASM (8KB) + 後端 Python | — | 雙軌方案 |

---

## 2. 任務分解

### PH1-001: 建立前端專案結構

| 欄位 | 內容 |
|------|------|
| **ID** | PH1-001 |
| **名稱** | 建立前端專案結構（Vite + React + 目錄骨架） |
| **描述** | 使用 Vite 初始化 React 專案，建立前端目錄結構，設定 ESLint、package.json 腳本，確保 dev server 可正常啟動。 |
| **前置依賴** | 無（Phase 0 環境已就緒） |
| **驗收標準** | 1. `npm run dev` 可啟動開發伺服器<br>2. 瀏覽器打開顯示空白 React App<br>3. 目錄結構符合 `tasks/task-003.md` 規範<br>4. Vite proxy 配置指向後端 8000 port |
| **工作量** | 小（< 1 小時） |
| **主要檔案** | `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, `frontend/src/main.jsx`, `frontend/src/App.jsx` |
| **關鍵決策** | proxy 設 `/api/*` → `http://localhost:8000`；使用 JSX 非 TS |

### PH1-002: React Canvas2D 組件封裝

| 欄位 | 內容 |
|------|------|
| **ID** | PH1-002 |
| **名稱** | React Canvas2D 組件封裝 |
| **描述** | 將 `poc/01_canvas2d/index.html` 中的 IIFE Canvas2D 引擎抽離為獨立模組，包裝為 React 組件。建立 `useCanvas2D` hook 管理引擎生命週期，透過 Ref 暴露繪圖 API 給外部元件。保留原有的 Entity 模型、碰撞檢測、Snapshot 渲染、Undo/Redo(60步)、DXF匯出 功能。 |
| **前置依賴** | PH1-001（前端骨架） |
| **驗收標準** | 1. Canvas2D 組件在 React 中可渲染<br>2. 工具切換（SELECT/LINE/CIRCLE/ARC/POLYGON/TEXT）可從外部控制<br>3. 滑鼠繪製 LINE/CIRCLE/ARC/POLYGON/TEXT 正常<br>4. Undo/Redo 60步可運作<br>5. Snapshot 渲染效能與 POC 一致<br>6. DXF 匯出正常 |
| **工作量** | 中（2-3 小時） |
| **主要檔案** | `frontend/src/components/Canvas2D/index.jsx`, `frontend/src/components/Canvas2D/engine.js`（從 POC 抽出）, `frontend/src/hooks/useCanvas2D.js` |
| **關鍵決策** | 引擎核心以純 JS 模塊存在（engine.js），React 組件僅負責掛載/卸載/事件橋接。不將引擎改為 React class。 |

### PH1-003: 後端 FastAPI 統一服務

| 欄位 | 內容 |
|------|------|
| **ID** | PH1-003 |
| **名稱** | 後端 FastAPI 統一服務 |
| **描述** | 建立統一的 FastAPI 後端應用，整合三個 POC 後端程式碼（DXF 解析、LLM 規則引擎、WASM/幾何引擎）。建立 router 結構、service 層、model 層。與前端約定統一的 REST 回應格式 `{ success: bool, data: any, error?: string }`。 |
| **前置依賴** | 無（可與 PH1-001/PH1-002 並行） |
| **驗收標準** | 1. 六個 router endpoint 可被呼叫<br>2. DXF 解析回傳正確結構<br>3. LLM 規則引擎可回傳 JSON 命令陣列<br>4. 幾何計算（距離/bbox/相交）正確<br>5. 使用統一回應格式<br>6. `requirements.txt` 僅含 fastapi/uvicorn/pydantic |
| **工作量** | 中（2-3 小時） |
| **主要檔案** | `backend/app/main.py`, `backend/app/routers/canvas.py`, `backend/app/routers/file.py`, `backend/app/routers/layer.py`, `backend/app/routers/llm.py`, `backend/app/services/dxf_parser.py`（移植 POC 02）, `backend/app/services/command.py`, `backend/app/services/geometry.py`, `backend/app/models/entity.py`, `backend/app/models/layer.py`, `backend/requirements.txt` |
| **關鍵決策** | LLM 先用規則引擎（PHP1-006 會升級）；geometry.py 可選用 WASM 或純 Python |

### PH1-004: 前後端 WebSocket + REST 連接

| 欄位 | 內容 |
|------|------|
| **ID** | PH1-004 |
| **名稱** | 前後端 WebSocket + REST 連接 |
| **描述** | 建立前端 api.js（REST 客戶端）和 ws.js（WebSocket 客戶端），後端建立 WebSocket handler。 REST 用於一次性查詢（圖層列表、文件操作），WebSocket 用於即時命令傳遞（LLM 解析結果、繪圖同步）。 |
| **前置依賴** | PH1-002（Canvas 組件）, PH1-003（後端服務） |
| **驗收標準** | 1. REST GET/POST 可正常通訊（經 Vite proxy）<br>2. WebSocket 可連線與雙向通訊<br>3. WebSocket 斷線自動重連（exponential backoff）<br>4. 統一錯誤處理 |
| **工作量** | 小（1-2 小時） |
| **主要檔案** | `frontend/src/services/api.js`, `frontend/src/services/ws.js`, `frontend/src/hooks/useWebSocket.js`, `backend/app/websocket/handler.py`, `frontend/vite.config.js`（proxy 設定） |
| **關鍵決策** | WebSocket 路徑為 `/ws`；使用 JSON 作為通訊格式 |

### PH1-005: 圖層管理系統

| 欄位 | 內容 |
|------|------|
| **ID** | PH1-005 |
| **名稱** | 圖層管理系統（前+後端） |
| **描述** | 建立完整的圖層管理系統。後端透過 LayerPanel 操作圖層 CRUD，前端 LayerPanel React 組件顯示圖層列表（可見性切換、顏色設定、鎖定）。Canvas2D 繪圖時讀取當前圖層，圖元歸屬於所選圖層。從 POC 已有 layer 欄位的 Entity 模型擴充。 |
| **前置依賴** | PH1-002（Canvas 組件需要 layer-aware）, PH1-003（後端 layer API）, PH1-004（前端通訊） |
| **驗收標準** | 1. 可新增/刪除圖層<br>2. 可切換圖層可見性（隱藏時該層圖元不渲染）<br>3. 可設定圖層顏色（新建圖元繼承）<br>4. 可當前圖層切換（繪製歸屬正確）<br>5. 圖層狀態前後端同步<br>6. 圖層0「Default」不可刪除 |
| **工作量** | 中（2-3 小時） |
| **主要檔案** | `frontend/src/components/LayerPanel/index.jsx`, `frontend/src/hooks/useCanvas2D.js`（擴充 layer 控制）, `backend/app/routers/layer.py`, `backend/app/models/layer.py` |
| **關鍵決策** | 圖層操作走 REST API（非 WebSocket），因為不頻繁且需要確認 |

### PH1-006: LLM 命令整合

| 欄位 | 內容 |
|------|------|
| **ID** | PH1-006 |
| **名稱** | LLM 命令整合 |
| **描述** | 整合 LLM 命令到主 UI。前端 CommandInput 組件（取代 POC 03 的獨立聊天 UI），輸入自然語言 → 透過 WebSocket 發送 → 後端規則引擎解析 → JSON 命令陣列回傳 → 前端執行器（useCommand hook）在 Canvas2D 上執行。建立完善的 useCommand hook 包裹執行器邏輯。 |
| **前置依賴** | PH1-002（Canvas 需要 executeCommand 介面）, PH1-003（後端 LLM router）, PH1-004（WebSocket 通道） |
| **驗收標準** | 1. 輸入「畫一條線從 0,0 到 100,50」→ 畫出直線<br>2. 輸入「畫一個圓心在 50,50 半徑 30」→ 畫出圓<br>3. 輸入「刪除圖元 1」→ 刪除指定圖元<br>4. 支援 8 種 NL 指令（與 POC 03 一致）<br>5. 命令回饋顯示在 CommandInput 組件中<br>6. 支援 Undo/Redo（LLM 命令也進入 history）<br>7. 可在後端預留 LLM API 擴充介面 |
| **工作量** | 中（2-3 小時） |
| **主要檔案** | `frontend/src/components/CommandInput/index.jsx`, `frontend/src/hooks/useCommand.js`, `frontend/src/services/ws.js`（擴充命令通道）, `backend/app/routers/llm.py`（移植 POC 03）, `backend/app/services/command.py`（擴充執行器） |
| **關鍵決策** | LLM 命令通過 WebSocket 而非 REST（即時性）；執行器在 client 端操作 Canvas2D state |

### PH1-007: 文件管理

| 欄位 | 內容 |
|------|------|
| **ID** | PH1-007 |
| **名稱** | 文件管理（JSON 儲存載入、DXF 匯入匯出） |
| **描述** | 建立 FileMenu 組件，支援：儲存為 JSON（前後端雙寫）、載入 JSON、匯入 DXF（上傳→後端解析→Canvas 渲染）、匯出 DXF（前端 Canvas2D 既有功能 + 後端另存）。JSON 格式包含版本、圖層、圖元、視圖狀態。 |
| **前置依賴** | PH1-002（Canvas 需 expose entities）, PH1-003（後端 file API 與 DXF parser）, PH1-004（REST 上傳/下載） |
| **驗收標準** | 1. 儲存為 JSON（瀏覽器下載 + 後端儲存）<br>2. 載入 JSON（上傳→Canvas 復原所有圖元與視圖）<br>3. 匯入 DXF（上傳→後端解析→Canvas 顯示）<br>4. 匯出 DXF（Canvas 既有 DXF 匯出可用）<br>5. 支援 .json / .dxf 檔案選擇器 |
| **工作量** | 中（2-3 小時） |
| **主要檔案** | `frontend/src/components/FileMenu/index.jsx`, `frontend/src/services/api.js`, `backend/app/routers/file.py`, `backend/app/services/dxf_parser.py`（移植 POC 02） |
| **關鍵決策** | 前端 Canvas2D 已有 DXF Export（POC 01），直接保留；後端 DXF Import 使用 POC 02 parser；JSON 格式參考 POC 01 README 定義 |

### PH1-008: UI 完整整合

| 欄位 | 內容 |
|------|------|
| **ID** | PH1-008 |
| **名稱** | UI 完整整合與 PropertyPanel |
| **描述** | 在 App.jsx 中將所有組件（Toolbar / Canvas2D / LayerPanel / CommandInput / PropertyPanel / FileMenu）整合為完整佈局。PropertyPanel 從 POC 01 既有功能直接移植。確保所有組件協同工作，CSS 主題一致（Catppuccin 暗色），響應式。 |
| **前置依賴** | PH1-001~PH1-007（所有組件就緒） |
| **驗收標準** | 1. 所有組件在一個頁面中和諧顯示<br>2. 左側工具列、中央 Canvas、右側圖層面板+命令輸入<br>3. PropertyPanel 在選取圖元時顯示<br>4. 鍵盤快捷鍵（V/L/C/A/P/T/H/Delete/Ctrl+Z/Y）正常<br>5. 底部狀態列顯示座標、工具、提示<br>6. 支援 P1 建議：啟動腳本（一鍵啟動前後端） |
| **工作量** | 中→大（3-4 小時） |
| **主要檔案** | `frontend/src/App.jsx`, `frontend/src/App.css`, `frontend/src/components/Toolbar/index.jsx`, `frontend/src/components/PropertyPanel/index.jsx`, `frontend/src/index.css`, `start.bat`, `start.sh` |
| **關鍵決策** | 使用 CSS Grid 佈局；Toolbar 從 POC 01 既有 toolbar 移植為 React 組件 |

---

## 3. 執行順序與相依性

### 3.1 時序圖

```
時間 →
├─── PH1-001 (前端骨架) ─── 1h
├─── PH1-003 (後端服務) ─── 2-3h (可與 001 並行)
│
├─── PH1-002 (Canvas2D React) ─── 2-3h (依賴 001)
│
├─── PH1-004 (前後端連接) ─── 1-2h (依賴 002+003)
│
├─── PH1-005 (圖層管理) ─── 2-3h (依賴 002+003+004)
├─── PH1-006 (LLM 命令) ─── 2-3h (依賴 002+003+004)
├─── PH1-007 (文件管理) ─── 2-3h (依賴 002+003+004)
│   (005/006/007 可在 004 完成後並行開發)
│
└─── PH1-008 (UI 整合) ─── 3-4h (依賴所有)
```

### 3.2 並行策略

**階段一（可並行）**：
- PH1-001 前端骨架 + PH1-003 後端服務

**階段二（可並行）**：
- PH1-002 Canvas2D 封裝（依賴 001）
- PH1-004 前後端連接（依賴 002+003）

**階段三（可完全並行）**：
- PH1-005 圖層管理
- PH1-006 LLM 命令
- PH1-007 文件管理
（三者獨立在 004 完成後並行開發）

**階段四（串行）**：
- PH1-008 UI 整合（必須等所有組件就緒）

### 3.3 啟動腳本（PH1-008 產出）

```batch
:: start.bat (Windows)
@echo off
start "backend" cmd /c "cd backend && python -m uvicorn app.main:app --reload --port 8000"
timeout /t 2 /nobreak >nul
start "frontend" cmd /c "cd frontend && npm run dev"
```

---

## 4. 驗收準則

### 4.1 端到端測試流程

```
步驟 1: 啟動系統
  執行 start.bat → 前端 http://localhost:5173 正常顯示

步驟 2: 繪圖操作（工具列）
  點擊 LINE 工具 → 畫一條線
  點擊 CIRCLE 工具 → 畫一個圓
  點擊 ARC 工具 → 畫一條弧
  點擊 POLYGON 工具 → 畫一個三角形
  點擊 TEXT 工具 → 放置文字

步驟 3: 選取與編輯
  切換 SELECT → 點擊圖元 → 拖曳移動 → 檢查屬性面板

步驟 4: Undo/Redo
  Ctrl+Z → 復原操作（60 步可回溯）
  Ctrl+Y → 重做操作

步驟 5: 圖層管理
  新增圖層「Layer1」→ 設定顏色紅色
  切換當前圖層 → 繪製圖元歸屬正確
  隱藏圖層 → 該層圖元不顯示

步驟 6: LLM 命令
  輸入「畫一條線從 0,0 到 100,50」
  輸入「畫一個圓心在 50,50 半徑 30」
  輸入「刪除圖元 1」

步驟 7: 文件管理
  儲存為 JSON → 重新載入 → 圖元完全恢復
  匯出 DXF → 用第三方工具驗證
  匯入 DXF → Canvas 正確顯示

步驟 8: 完整流程
  開啟 → 繪製 5 個圖元 → LLM 命令新增 3 個
  → 管理圖層 → 選取移動 → Undo 2 步 → Redo
  → 儲存 JSON → 清除 → 載入 JSON → 圖元恢復
```

### 4.2 接受標準（Must Pass）

- [ ] 前端 `npm run dev` 可啟動
- [ ] 後端 `uvicorn app.main:app --reload` 可啟動
- [ ] Canvas2D 繪製 L/C/A/P/T 全部正常
- [ ] 選取+移動圖元
- [ ] Undo/Redo 60 步
- [ ] 圖層新增/刪除/可見性/顏色
- [ ] LLM 自然語言 → 繪圖（至少 LINE/CIRCLE/DELETE）
- [ ] JSON 儲存再載入（圖元完全恢復）
- [ ] DXF 匯出（檔案可被其他 CAD 讀取）
- [ ] PropertyPanel 在選取時顯示
- [ ] 鍵盤快捷鍵正常

---

## 5. 風險評估

| 任務 | 風險 | 等級 | 緩解措施 |
|------|------|:----:|----------|
| PH1-002 | Canvas2D IIFE 模組化改寫引入 runtime 錯誤 | 🟡 中 | 增量抽取：先保持 IIFE 不變只加 wrapper，再逐函數模組化；每個步驟跑手動測試 |
| PH1-003 | DXF parser 在中文路徑或特殊編碼的 DXF 上 crash | 🟡 中 | 加入 `errors="replace"` 和 try/except 保護，Phase 0 已有處理 |
| PH1-004 | WebSocket CORS 或 proxy 配置問題 | 🟢 低 | 後端 `allow_origins=["*"]`，Vite proxy 已驗證 |
| PH1-005 | 圖層可見性切換後 Canvas 渲染不一致 | 🟢 低 | 渲染時過濾 `visible === false` 的圖層；Snapshot 機制需要 layer-aware |
| PH1-006 | 規則引擎無法覆蓋複雜自然語言輸入 | 🟡 中 | 保留 POC 03 的 prompts/ 目錄作為未來 LLM API 升級路徑 |
| PH1-007 | 大檔案 JSON/DXF 載入阻塞 UI | 🟢 低 | MVP 階段不處理超大檔案（< 10MB），檔案操作走 REST 非同步 |
| PH1-008 | 組件間 state 共享混亂 | 🟡 中 | 統一 state 管理：`useCanvas2D` hook 作為唯一真相來源，所有 state 透過它暴露 |
| 整體 | 前後端相依版本衝突（npm package vs Python） | 🟢 低 | 前端僅用 `react` + `react-dom` + `vite`，無其他依賴；後端僅 fastapi + uvicorn |

### 5.1 整體風險彙總

| 類別 | 等級 |
|------|:----:|
| 技術可行性 | 🟢 低 — 全部 POC 已驗證 |
| 整合複雜度 | 🟡 中 — 4 個 POC 整合為 1 個應用 |
| 時程風險 | 🟢 低 — 每個子任務 < 4 小時 |
| 部署風險 | 🟢 低 — start.bat 一鍵啟動 |

---

## 附錄 A：POC 到 MVP 程式碼映射

| POC 檔案 | 用途 | Phase 1 目標檔案 |
|----------|------|-----------------|
| `poc/01_canvas2d/index.html` (JS engine) | Canvas2D 繪圖引擎 | `frontend/src/components/Canvas2D/engine.js` |
| `poc/01_canvas2d/index.html` (DXF export) | DXF 匯出 | `frontend/src/components/Canvas2D/engine.js`（保留） |
| `poc/02_libredwg/src/parser.py` | DXF 解析 | `backend/app/services/dxf_parser.py` |
| `poc/02_libredwg/src/entity_mapper.py` | DXF→Canvas 映射 | `backend/app/services/dxf_parser.py`（合併） |
| `poc/02_libredwg/test_load.html` | Canvas 渲染驗證 | —（功能已併入 Canvas2D） |
| `poc/03_llm_command/app.py` | 規則引擎 | `backend/app/routers/llm.py` |
| `poc/03_llm_command/index.html` | 聊天 UI | `frontend/src/components/CommandInput/index.jsx` |
| `poc/03_llm_command/src/executor.js` | 命令執行器 | `frontend/src/hooks/useCommand.js`（改寫為 React hook） |
| `poc/03_llm_command/prompts/cad_commands.md` | 提示詞保留 | `backend/prompts/cad_commands.md` |
| `poc/04_occt_wasm/src/server.py` | 幾何引擎後端 | `backend/app/services/geometry.py` |
| `poc/04_occt_wasm/dist/occt_core.wasm` | WASM 幾何引擎 | `frontend/public/occt_core.wasm`（保留) |

## 附錄 B：共用的 Entity 模型定義

MVP 中所有前後端共用同一 Entity 模型格式（JSON）：

```json
{
  "id": 1,
  "type": "LINE",
  "layer": "0",
  "color": "#f38ba8",
  "lineWidth": 2,
  "x1": 0, "y1": 0, "x2": 100, "y2": 50
}
```

支援的 type：`LINE`, `CIRCLE`, `ARC`, `POLYGON`, `TEXT`

## 附錄 C：REST API 設計

| Method | Path | 用途 |
|--------|------|------|
| POST | `/api/canvas/command` | 批量執行繪圖命令 |
| GET | `/api/layers` | 取得圖層列表 |
| POST | `/api/layers` | 新增圖層 |
| DELETE | `/api/layers/{id}` | 刪除圖層 |
| PATCH | `/api/layers/{id}` | 更新圖層屬性 |
| POST | `/api/llm/parse` | NL 命令解析（REST 備用） |
| POST | `/api/file/save` | 儲存 JSON |
| POST | `/api/file/load` | 載入 JSON |
| POST | `/api/file/import-dxf` | 匯入 DXF |
| WebSocket | `/ws` | 即時 LLM 命令通道 |
