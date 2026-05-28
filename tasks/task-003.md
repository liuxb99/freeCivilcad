# TASK-003 Phase 1 MVP 整合開發

## Status
已完成

## 目標
將 Phase 0 的 5 個 POC 模組整合為統一的 MVP 應用，可在 Chrome 瀏覽器中完成基本 CAD 操作。

## 範圍

### P0 必須
1. **前端整合（React + Canvas2D）** — 將獨立 Canvas2D HTML 轉為 React 組件，加上工具列、圖層面板、命令輸入框
2. **後端整合（FastAPI + Python）** — 統一後端服務，整合 DXF 解析、LLM 命令、幾何引擎
3. **前後端連接** — WebSocket + REST API 通信
4. **基本圖層系統** — 圖層新增/刪除/顯示隱藏/顏色設定
5. **LLM 命令整合** — 自然語言輸入 → CAD 操作
6. **文件管理** — JSON 格式儲存/載入、DXF 匯入/匯出
7. **端到端驗證** — 完整流程可運作

### P1 建議
8. **尺寸標註** — 線性/半徑/角度標註
9. **Undo/Redo 整合** — 60 步 Command Pattern
10. **啟動腳本** — 一鍵啟動前後端

## 需求詳情

### 前端架構
```
frontend/
├── src/
│   ├── components/
│   │   ├── Canvas2D/       # Canvas2D React 組件（封裝 Phase 0 引擎）
│   │   ├── Toolbar/        # 繪圖工具列
│   │   ├── LayerPanel/     # 圖層面板
│   │   ├── CommandInput/   # LLM 命令輸入框
│   │   ├── PropertyPanel/  # 屬性面板
│   │   └── FileMenu/       # 檔案選單（儲存/載入/匯出）
│   ├── hooks/
│   │   ├── useCanvas2D.js  # Canvas2D 封裝 hook
│   │   ├── useWebSocket.js # WebSocket hook
│   │   └── useCommand.js   # LLM 命令 hook
│   ├── services/
│   │   ├── api.js          # REST API 客戶端
│   │   └── ws.js           # WebSocket 客戶端
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

### 後端架構
```
backend/
├── app/
│   ├── main.py           # FastAPI 入口
│   ├── routers/
│   │   ├── canvas.py     # Canvas 命令 API
│   │   ├── file.py       # 文件管理 API（JSON/DXF）
│   │   ├── layer.py      # 圖層管理 API
│   │   └── llm.py        # LLM 命令 API
│   ├── services/
│   │   ├── dxf_parser.py # DXF 解析（來自 POC）
│   │   ├── command.py    # CAD 命令執行器
│   │   └── geometry.py   # 幾何計算
│   ├── models/
│   │   ├── entity.py     # 圖元模型
│   │   └── layer.py      # 圖層模型
│   └── websocket/
│       └── handler.py    # WebSocket 處理
├── requirements.txt
└── Dockerfile
```

### 使用者流程
1. 開啟瀏覽器 → 看到 CAD 畫布 + 工具列 + 圖層面板
2. 用工具列繪製 LINE/CIRCLE/ARC/POLYGON
3. 用 LLM 輸入「畫一條從 0,0 到 100,50 的紅線」
4. 管理圖層（新增/刪除/隱藏/改顏色）
5. 選擇圖元並移動/縮放/刪除
6. 儲存為 JSON 檔案
7. 匯出為 DXF
8. 載入已有檔案繼續編輯

## 起始日期
2026-05-27

## Current Score
92/100

## Rework Count
0

## Review Reports
- tasks/reviews/review_TASK-003_1.md (score 92, 合格)

## Final Score (when completed)
92/100 ✅ 合格

## Status
已完成
