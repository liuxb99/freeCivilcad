# Phase 2 功能強化計畫

> 生成時間: 2026-05-27T15:30:00+08:00
> 對應任務: TASK-004
> 基礎: Phase 1 MVP 整合完成（評分 92/100）

---

## 1. Phase 2 架構概覽

### 1.1 尺寸標註資料模型與渲染

```
┌─────────────────────────────────────────────────────────────┐
│                      DIMENSION 實體模型                        │
│                                                             │
│  {                                                          │
│    id: number,                                              │
│    type: "DIMENSION",                                       │
│    dimType: "linear" | "radius" | "angle",                  │
│    layer: string,                                           │
│    color: string,                                           │
│    // 線性標註                                              │
│    x1, y1: number,    // 量測起點                           │
│    x2, y2: number,    // 量測終點                           │
│    offset: number,    // 標註線偏移距離                     │
│    // 半徑標註                                              │
│    cx, cy: number,    // 圓心                               │
│    radius: number,    // 半徑值                              │
│    leaderAngle: number, // 引線角度                          │
│    // 角度標註                                              │
│    vertexX, vertexY: number, // 頂點                        │
│    angleStart, angleEnd: number, // 兩條邊的方向角           │
│    arcRadius: number, // 弧線半徑                           │
│    // 通用                                                  │
│    value: number,     // 標註數值（由引擎自動計算）           │
│    text: string,      // 標註文字（可自訂）                  │
│    scale: number,     // 標註比例                            │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Canvas 渲染方式                          │
│                                                             │
│  線性標註:                                                  │
│    ┌─── 尺寸線（平行於量測兩點連線，偏移 offset 單位）        │
│    ├─── 延伸線（從量測點垂直延伸到尺寸線）                   │
│    ├─── 箭頭（尺寸線兩端，三角形 △ 或斜線）                  │
│    └─── 文字（尺寸線中央上方，顯示距離值）                   │
│                                                             │
│  半徑標註:                                                  │
│    ┌─── 引線（從圓心指向圓周外某點）                         │
│    ├─── 箭頭（引線末端）                                     │
│    └─── 文字（引線旁，顯示 R=xxx）                           │
│                                                             │
│  角度標註:                                                  │
│    ┌─── 弧線（兩線之間，以頂點為圓心）                       │
│    ├─── 延伸線（稍微超出弧線的短線）                         │
│    ├─── 箭頭（弧線兩端，或短線末端）                         │
│    └─── 文字（弧線內側或外側，顯示角度值）                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Undo/Redo 後端 Command Log 架構

```
┌─────────────────────────────────────────────────────────────┐
│                   後端 Command Log 系統                       │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────────┐  │
│  │  REST API         │  │  Command 資料模型                │  │
│  │  ─────────        │  │  ──────────────                  │  │
│  │  GET /api/commands│  │  {                               │  │
│  │     ↕ 查詢記錄    │  │    id: string,    // UUID        │  │
│  │  POST /api/commands│  │    sessionId: string,           │  │
│  │     /undo          │  │    timestamp: number,           │  │
│  │  POST /api/commands│  │    type: string,  // ADD/DEL/   │  │
│  │     /redo          │  │                   // MOVE/UPDATE │  │
│  │                    │  │    entityId: string,            │  │
│  │  ┌──────────────┐  │  │    beforeState: object, // 復原 │  │
│  │  │ SQLite 儲存   │  │  │    afterState: object,  // 重做│  │
│  │  │ commands.db  │  │  │    description: string,        │  │
│  │  │ & memory buf │  │  │  }                              │  │
│  │  └──────────────┘  │  └──────────────────────────────────┘  │
│  └──────────────────┘                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 跨 session 流程                                          │  │
│  │                                                         │  │
│  │  1. 前端每執行一個動作 → 發送 Command 到後端              │  │
│  │  2. 後端記錄到 memory buffer + SQLite                      │  │
│  │  3. Ctrl+Z → 前端本地 Undo + 同步請求後端驗證              │  │
│  │  4. 新 session 啟動 → 從 SQLite 載入最近 N 條記錄          │  │
│  │  5. 支援 replay（從 command log 重建 Canvas 狀態）         │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Docker 部署拓撲

```
┌─────────────────────────────────────────────────────────────┐
│                     docker-compose.yml                       │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐  │
│  │   frontend (Nginx)   │    │   backend (Uvicorn)         │  │
│  │                      │    │                             │  │
│  │   ┌───────────────┐  │    │   ┌─────────────────────┐  │  │
│  │   │  dist/ (build) │  │    │   │ uvicorn app.main:app│  │  │
│  │   │  index.html    │  │    │   │ --host 0.0.0.0      │  │  │
│  │   │  assets/*.js   │  │    │   │ --port 8000         │  │  │
│  │   └───────────────┘  │    │   └─────────────────────┘  │  │
│  │                      │    │                             │  │
│  │   Port: 80           │    │   Port: 8000                │  │
│  │   nginx.conf:        │    │   Volumes:                  │  │
│  │    /api/* → backend  │    │    - ./data:/app/data       │  │
│  └──────────┬──────────┘    └──────────────┬──────────────┘  │
│             │                               │                 │
│             └──────────network: app-net─────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 任務分解

### PH2-001: 尺寸標註

| 欄位 | 內容 |
|------|------|
| **ID** | PH2-001 |
| **名稱** | 尺寸標註功能（前+後端） |
| **描述** | 在 Canvas 上實作三種尺寸標註：線性標註（兩點距離）、半徑標註（圓/弧半徑）、角度標註（兩線夾角）。新增 DIMENSION 實體類型到 Entity 模型，實作標註繪製引擎（尺寸線、箭頭、文字），並在 toolbar 中加入標註工具按鈕。後端 entity model 同步新增 DIMENSION 支援。 |
| **前置依賴** | PH1-008（UI 整合）+ PH1-002（Canvas 引擎） |
| **驗收標準** | 1. 選取 DIM 工具 → 點選兩點 → 顯示線性標註（含尺寸線+箭頭+數值）<br>2. 選取圓/弧 → 自動/手動產生半徑標註 R=xxx<br>3. 選取兩條線 → 顯示角度標註（含弧線+角度值）<br>4. 標註文字支援自訂內容<br>5. 標註隨選取圖元移動而更新<br>6. 標註可被選取、移動、刪除（與其他圖元一致）<br>7. 後端 Entity model 新增 DIMENSION 類型 |
| **工作量** | 3-4 小時 |
| **主要檔案** | `frontend/src/components/Canvas2D/engine.js`（新增 DIMENSION 繪製邏輯）, `frontend/src/components/Toolbar/index.jsx`（新增 DIM 按鈕）, `backend/app/models/entity.py`（新增 DIMENSION 欄位）, `backend/app/services/command.py`（擴充 DIMENSION 支援） |
| **關鍵決策** | DIMENSION 作為一種特殊 Entity type，而非獨立系統；標註數值在渲染時即時計算（自動跟隨圖元變動）；引線繪製使用現有 Canvas2D API |

### PH2-002: Undo/Redo 強化 + 臭蟲修復

| 欄位 | 內容 |
|------|------|
| **ID** | PH2-002 |
| **名稱** | Undo/Redo 強化與臭蟲修復 |
| **描述** | 強化 Undo/Redo 系統：新增後端 Command Log（支援 SQLite 儲存 + 記憶體緩衝）、跨 session 復原 API（查詢記錄/undo/redo/replay）。同時修復 Phase 1 REVIEWER 發現的三個臭蟲。 |
| **前置依賴** | PH1-003（後端服務）+ PH1-004（前後端通訊） |
| **驗收標準** | 1. 前端操作 → 後端 Command Log 記錄正確<br>2. 後端提供 GET /api/commands 查詢歷史記錄<br>3. 後端提供 POST /api/commands/undo 與 /redo<br>4. 關閉頁面重新開啟後，可從 SQLite 載入歷史記錄<br>5. 臭蟲修復：CIRCLE 屬性面板正常顯示半徑（非 NaN）<br>6. 臭蟲修復：CommandInput 非同步 onResult 使用正確 state<br>7. 臭蟲修復：前端 id 統一為 string（或後端 Layer.id 改為 number） |
| **工作量** | 2-3 小時 |
| **主要檔案** | `backend/app/routers/canvas.py`（新增 command log 路由）, `backend/app/services/command.py`（擴充命令記錄邏輯）, `backend/app/models/entity.py`（新增 CommandRecord model）, `backend/app/main.py`（SQLite 初始化）, `frontend/src/components/PropertyPanel/index.jsx`（修復 geometry.r→radius）, `frontend/src/components/CommandInput/index.jsx`（修復 stale closure）, `frontend/src/components/Canvas2D/engine.js`（統一 id 型別） |
| **關鍵決策** | SQLite 為輕量方案（不引入 Postgres）；memory buffer 為主（效能），SQLite 為輔（persistence）；Command Log 只記錄操作類型與 entity before/after state，不重放完整 Canvas |

#### 臭蟲修復細節

| 臭蟲 | 原因 | 修複方式 |
|:----:|------|----------|
| CIRCLE NaN | PropertyPanel 讀 `geometry.r` 但引擎存 `radius`；後端 entity.py 也定義 CIRCLE_GEOMETRY_KEYS 含 `"r"` 而非 `"radius"` | 統一前端引擎使用 `radius`，修復後端 `CIRCLE_GEOMETRY_KEYS` 為 `radius`，PropertyPanel 讀 `geometry.radius` |
| CommandInput stale closure | 第 57 行 `onResult(result)` 使用過時的 state 變數 `result`，在 `setResult()` 非同步更新後未反映新值 | 將 `onResult` 呼叫移到 `setResult` 的回呼內，或使用局部變數保存新 result |
| id 型別不一致 | 前端 `_idCounter` 生成 number，後端 `Layer.id: str`、`Entity.id: str` | 方案 A：前端改為 string id（如 `"e" + counter`）；方案 B：後端改為 int。建議方案 A（最小改動） |

### PH2-003: Docker 部署

| 欄位 | 內容 |
|------|------|
| **ID** | PH2-003 |
| **名稱** | Docker 部署（Nginx + FastAPI） |
| **描述** | 建立 Docker 部署方案：前端 Nginx Dockerfile（生產 build 靜態檔案）、後端 Uvicorn Dockerfile、docker-compose.yml（一鍵啟動）。包含 nginx.conf 反向代理 /api 和 /ws 到後端。 |
| **前置依賴** | PH2-001 + PH2-002（均完成後驗收完整部署） |
| **驗收標準** | 1. `docker-compose up` 一鍵啟動前端+後端<br>2. 瀏覽器打開 http://localhost 正常顯示 UI<br>3. REST API（/api/*）正常代理到後端<br>4. WebSocket（/ws）正常代理到後端<br>5. 前端靜態資源（JS/CSS）正確加載<br>6. 後端日誌正常輸出 |
| **工作量** | 1-2 小時 |
| **主要檔案** | `Dockerfile.frontend`（Nginx 多階段 build）, `Dockerfile.backend`（Python + Uvicorn）, `docker-compose.yml`, `nginx.conf`, `.dockerignore`（前+後端） |
| **關鍵決策** | 前端使用多階段 build（node build → nginx serve）；後端使用官方 Python 3.10 slim image；Nginx 處理靜態資源和反向代理；WebSocket 需 Nginx 1.3+ 原生支援 upgrade |

---

## 3. 執行順序

```
時間 →
├─── PH2-001 (尺寸標註) ─── 3-4h
│     └── 可與 PH2-002 完全並行（各自獨立模組）
│
├─── PH2-002 (Undo/Redo + 臭蟲修復) ─── 2-3h
│     └── 可與 PH2-001 完全並行
│
└─── PH2-003 (Docker 部署) ─── 1-2h
      └── 必須在 PH2-001 + PH2-002 之後執行（完整驗證）
```

### 3.1 並行策略

**階段一（可完全並行）**：
- PH2-001 尺寸標註（前+後端獨立模組）
- PH2-002 Undo/Redo + 臭蟲修復（獨立於標註功能）

**階段二（串行）**：
- PH2-003 Docker 部署（必須等兩個功能完成）

### 3.2 臭蟲修復優先級

臭蟲修復可在 PH2-002 開始時立即進行（非依賴性高）：
1. CIRCLE NaN（PropertyPanel）— 單檔修改，風險最低，建議最先修
2. CommandInput stale closure — 單檔修改，次優先
3. id 型別不一致 — 可能影響多處，需評估影響範圍

---

## 4. 驗收準則

### 4.1 端到端測試流程

```
步驟 1: 尺寸標註
  點擊 DIM 工具 → 點選兩點 → 確認線性標註顯示
  選取圓 → 右鍵選單 → 半徑標註 → 確認 R=xxx 顯示
  選取兩條線 → 角度標註 → 確認角度值顯示

步驟 2: Undo/Redo 強化
  繪製數個圖元 → Ctrl+Z → 圖元逐一消失（前端本地 Undo）
  關閉頁面 → 重新開啟 → 載入後端 command log
  查詢 GET /api/commands → 確認歷史記錄完整

步驟 3: 臭蟲驗證
  繪製一個圓 → 選取 → PropertyPanel 顯示正常半徑（非 NaN）
  CommandInput 輸入命令 → 確認 onResult 正確顯示
  檢查所有 Entity id 型別一致

步驟 4: Docker 部署
  docker-compose up → 瀏覽器打開 http://localhost
  執行繪圖操作 → REST API + WebSocket 正常運作
  docker-compose down → 乾淨關閉
```

### 4.2 接受標準（Must Pass）

- [ ] 三種尺寸標註（線性/半徑/角度）可正常繪製
- [ ] 標註可選取、移動、刪除
- [ ] 後端 Command Log 跨 session 可回溯
- [ ] GET /api/commands 回傳歷史記錄
- [ ] CIRCLE 屬性面板顯示正常半徑值（非 NaN）
- [ ] CommandInput 非同步結果正確顯示
- [ ] Entity id 前後端型別一致（皆為 string）
- [ ] docker-compose up 一鍵啟動
- [ ] http://localhost 前端正常顯示
- [ ] WebSocket 經 Nginx 代理正常連線

---

## 5. 風險評估

| 任務 | 風險 | 等級 | 緩解措施 |
|------|------|:----:|----------|
| PH2-001 | 尺寸標註繪製複雜，可能與既有選取/移動邏輯衝突 | 🟡 中 | DIMENSION 作為獨立 Entity type，不修改既有 L/C/A/P/T 邏輯；先實作線性標註，半徑/角度逐步追加 |
| PH2-001 | 角度標註需計算兩線夾角與弧線範圍，邊界情況多 | 🟡 中 | 使用 `Math.atan2` 標準化角度；先處理 acute/obtuse 常見情況，reflex angle 放在 P1 |
| PH2-002 | SQLite 檔案鎖定（多執行緒/多行程） | 🟢 低 | Uvicorn 單行程；SQLite 使用 WAL mode 避免鎖定 |
| PH2-002 | id 型別統一後可能影響既有 JSON/DXF 相容性 | 🟡 中 | 修改後跑完整測試（儲存→載入 JSON、匯出→驗證 DXF）；保留 `_idCounter` 為 number 內部計數，輸出時轉 string |
| PH2-003 | Nginx WebSocket proxy 配置錯誤 | 🟢 低 | 使用標準 `proxy_set_header Upgrade` 與 `proxy_pass http://backend:8000`；docker-compose 內網路名稱解析 |
| 整體 | 三個子任務相依於既有引擎，改動可能引入 regression | 🟡 中 | 每次改動後手動執行端到端測試（繪製 L/C/A/P/T → 選取移動 → Undo/Redo → JSON 儲存載入） |

### 5.1 整體風險彙總

| 類別 | 等級 |
|------|:----:|
| 技術可行性 | 🟢 低 — 尺寸標註是標準 Canvas 繪圖，無未驗證技術 |
| 整合複雜度 | 🟡 中 — 需要修改 Engine 核心渲染邏輯和後端服務 |
| 時程風險 | 🟢 低 — 每個子任務 < 4 小時 |
| API 穩定性 | 🟢 低 — 後端 API 向後相容，僅新增 endpoint |

---

## 附錄 A：新增 REST API

| Method | Path | 用途 |
|--------|------|------|
| GET | `/api/commands` | 查詢命令歷史記錄（支援 `?session=&limit=&offset=`） |
| POST | `/api/commands/undo` | 後端 Undo（回退最後一個命令） |
| POST | `/api/commands/redo` | 後端 Redo（重做上一個 Undone 命令） |
| GET | `/api/commands/sessions` | 列出所有 session |
| GET | `/api/commands/replay/{session}` | 重放特定 session 的命令序列 |

## 附錄 B：Entity 模型變更（原模型 + DIMENSION）

```json
{
  "id": "e1",
  "type": "DIMENSION",
  "layer": "0",
  "color": "#a6e3a1",
  "lineWidth": 1.5,
  "dimType": "linear",
  "x1": 10, "y1": 20,
  "x2": 100, "y2": 50,
  "offset": 15,
  "value": 94.3,
  "text": "94.3"
}
```

## 附錄 C：後端 CommandRecord 模型

```python
class CommandRecord(BaseModel):
    id: str                    # UUID
    session_id: str            # session 識別
    timestamp: float           # unix timestamp
    type: str                  # ADD_ENTITY | DELETE_ENTITY | MOVE_ENTITY | UPDATE_ENTITY
    entity_id: str             # 操作目標 entity id
    before_state: dict | None  # undo 用（操作前狀態）
    after_state: dict | None   # redo 用（操作後狀態）
    description: str           # 人類可讀描述（如"繪製 LINE #1"）
```
