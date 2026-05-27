# Phase 3 總結報告 — Snapping 捕捉系統與編輯工具強化

## 評分
- **最終評分：93/100 ✅（第 1 次循環即合格，無需返工）**
- 完整性：25/25
- 正確性：24/25
- 可維護性：22/25
- 測試與驗證：22/25

## 新增功能

### PH3-001: SnapManager 捕捉系統
- **SnapManager.js**（獨立新檔案）
- **捕捉模式**：
  - snap-to-grid：吸附到網格點（gridSize 預設 10）
  - snap-to-endpoint：吸附到圖元端點
  - snap-to-midpoint：吸附到圖元中點（LINE 中點 / POLYGON 各邊中點 / CIRCLE 圓心）
  - snap-to-intersection：兩條 LINE 的交點
  - ortho 正交模式：限制滑鼠移動為水平或垂直方向
- **機制**：
  - `findNearestPoint()` 在 threshold 範圍內找最近點
  - `findLineIntersections()` 計算兩線交點
  - `snapPoint()` 整合入口，依優先級順序（endpoint > midpoint > intersection > grid）回傳其餘原座標
  - `_invalidateCache()` 在圖元變更時清除快取
  - `getSnapState()` / `setSnapEnabled()` / `setOrthoEnabled()` 控制開關
- **engine.js 整合**：
  - `getSnapState()`、`getEntities()` 供外部輪詢狀態
  - `_onMouseMove` 呼叫 snapPoint() 取得吸附座標並顯示指示器（淡藍色 + 小方塊）
- **測試**：11 項（utility 函數 + SnapManager 核心行為）

### PH3-002: EditTools 六個編輯工具
- **EditTools.js**（獨立新檔案）
- **工具**：
  | 工具 | 按鍵 | 行為 |
  |------|------|------|
  | RECT | R | 兩點畫矩形 → 產生 POLYGON 4 頂點 |
  | COPY | X | 點選圖元 → 偏移複製（dx=30, dy=30） |
  | ROTATE |（快捷鍵待定）| 選取圖元 → 設 base 點 → 拖曳旋轉 → mouse up 提交 |
  | MIRROR | M | 選取圖元 → 兩點定義鏡射軸 |
  | OFFSET | O | 點選圖元 → 平行偏移（LINE 垂直偏移, CIRCLE 半徑±15） |
  | TRIM |（快捷鍵待定）| 刪除點選圖元（同 Delete 行為） |
- **滑鼠事件**：
  - `isEditCommand(tool)` 判斷是否為編輯工具
  - `getEditToolCursor()` 回傳對應游標
  - `handleEditMouseDown()` / `handleEditMouseMove()` / `handleEditMouseUp()` / `drawEditPreview()`
- **engine.js 整合**：
  - `_editState` 管理編輯中狀態（含 `rotateBase`、`rotateStartAngle`、`mirrorTarget`、`mirrorP1`、`mirrorPreview` 等）
  - `_onMouseDown` / `_onMouseMove` / `_onMouseUp` 中呼叫編輯工具處理函數
  - `renderEditPreview(ctx)` 繪製即時預覽線條
- **測試**：15 項（isEditCommand、getEditToolCursor、函數存在性檢查等）

### PH3-003: PropertyPanel 互動編輯
- **PropertyPanel/index.jsx** 重構為可編輯模式
- **功能**：
  - 點擊數值 → 自動變為 `<input>`（autoFocus、select all）
  - 支援編輯屬性：
    - LINE：x1, y1, x2, y2
    - CIRCLE：cx, cy, radius
    - ARC：cx, cy, radius, startAngle, endAngle
    - TEXT：x, y, text, fontSize
  - Enter 提交修改、Escape 取消、blur 自動提交
  - 唯獨欄位保持顯示（ID、類型、顏色、圖層等）
- **engine.js** 新增 `updateEntity(id, props)` 方法：
  - deepClone entity before 狀態
  - Object.assign 更新屬性
  - 透過 `history.execute(_makeUpdateCmd(entity, before))` 支援 undo/redo
  - 觸發 `_invalidateSnapshot()` + `_snap._invalidateCache()` + `render()`

### PH3-004: StatusBar 獨立元件 + 快捷鍵集中管理
- **StatusBar/index.jsx**（新建獨立 React 元件）
  - 顯示資訊：工具名稱、螢幕座標 (px)、世界座標 (world)、圖元總數、捕捉 ON/OFF、正交 ON/OFF、縮放百分比、連線狀態
  - 捕捉/正交用顏色區分（ON=#a6e3a1, OFF=#f38ba8）
  - 每 200ms setInterval 輪詢 engine 狀態（entityCount、snapState、zoom）
  - onMouseMove 事件即時更新座標
- **config/keybindings.js**（新建集中設定檔）
  - `TOOL_KEYS`：v→SELECT, h→HAND, l→LINE, c→CIRCLE, a→ARC, p→POLYGON, r→RECT, t→TEXT, d→DIM, x→COPY, m→MIRROR
  - `ACTION_KEYS`：z→UNDO, y→REDO
- **App.jsx** 簡化：
  - 移除 inline status bar 與 `mousePos` state
  - 改用 `<StatusBar engine={engine} activeTool={activeTool} connected={connected} />`
  - handleKeyDown 改用 `TOOL_KEYS[e.key.toLowerCase()]` 映射
  - 移除 `handleCanvasMouseMove`（由 StatusBar 自行處理）

## 測試覆蓋
- **總測試數：43 項（全部通過）**
  - HistoryManager.test.js：7 項
  - DimensionTool.test.js：10 項 + 2 項共用
  - SnapManager.test.js：11 項
  - EditTools.test.js：15 項
- **後端 pytest**：6 項（DXF 匯出測試）

## Build 結果
- 49 modules，525ms，無錯誤
- 無任何 lint warning

## 核心成就
1. **Phase 3 首次評分即合格（93/100）**，無需返工，開發效率顯著提升
2. 捕捉系統支援 5 種捕捉模式 + 正交，涵蓋常見 CAD 操作
3. 6 種編輯工具覆蓋基本幾何修改需求
4. 屬性面板從純顯示升級為互動編輯，支援 undo/redo
5. 狀態列獨立為可重用元件，快捷鍵集中管理

## 剩餘/未來工作
- [ ] engine.js（1378 行）拆分為多模組
- [ ] 補上 PropertyPanel 與 StatusBar 的元件測試
- [ ] EditTools 測試深度不足，需補實際操作測試
- [ ] 處理快捷鍵分散（engine.js 內建 `_onKeyDown` vs keybindings.js）
- [ ] 常數提取（offset 距離、snap threshold、arrow size 等）
- [ ] OFFSET 距離改為可配置參數
