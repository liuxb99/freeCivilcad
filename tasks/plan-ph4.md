# Phase 4 實作規劃建議

> 生成時間: TIME_PENDING
> 來源: PLANNER 子代理分析（基於 Phase 0-3 完成狀態、REVIEWER TASK-005 評分報告、產品規格）

---

## 一、Phase 4 目標與定位

**定位**：技術債務回填 + 基礎設施強化 + 前端功能補全
**口號**：「把 Phase 3 的債還完，把 MVP 的洞補齊」

Phase 4 不是向產品規格中遠程目標（3D、橋樑、管線）的大步跳躍，而是**鞏固地基**：

1. **償還技術債務** — Phase 3 REVIEWER 標記的 5 項缺失（engine.js 拆分、測試深度、快捷鍵、常數提取、缺少元件測試）
2. **補齊 MVP 功能** — 產品規格 Phase 1 中尚未實現的關鍵功能（Polyline、Move、DXF 寫出、圖層操作）
3. **建立後端能力** — geometry.py 強化、Layer CRUD API、LLM 命令升級

### 與產品規格 Roadmap 對照

| 當前實際 Phase | 產品規格 Phase | 當前進度 |
|---------------|---------------|---------|
| Phase 0 | Phase 0（技術驗證） | ✅ 完成 |
| Phase 1-3 | Phase 1（MVP 前半） | ✅ 基本繪圖 + 編輯工具 |
| **Phase 4（建議）** | **Phase 1（MVP 後半）** | **補齊 2D 核心 + 檔案 I/O + 圖層** |
| Phase 5+ | Phase 2（完整版） | 3D、土木工程模組、AI 進階 |

---

## 二、建議子任務清單

### 2.1 技術重構組（P0，高優先級）

| ID | 說明 | 工作量 | 優先級 | 依賴 |
|----|------|:------:|:------:|------|
| PH4-001 | **engine.js 拆分多模組**：1378 行/53KB 拆分為 engine-core.js（核心狀態）、engine-render.js（渲染管線）、engine-input.js（事件處理）、engine-commands.js（命令執行） | **大** (3-4 天) | **P0** | 無 |
| PH4-002 | **快捷鍵統一**：engine.js 內建 `_onKeyDown` 全部改讀 `config/keybindings.js`，移除 App.jsx 重複邏輯 | **小** (半天) | **P0** | PH4-001 |
| PH4-003 | **常數提取為配置檔**：硬編碼 offset/snap threshold/arrow size/gridSize 等 → `config/constants.js` | **小** (半天) | **P0** | 無 |
| PH4-004 | **EditTools 實作深度測試**：6 工具各補 ≥2 實際操作測試（模擬 engine → 呼叫 handler → 驗證 entities 變更） | **中** (1-2 天) | **P0** | 無 |
| PH4-005 | **補上 PropertyPanel + StatusBar 元件測試**：@testing-library/react 測試渲染/編輯提交/Escape 取消/資訊輪詢 | **小** (1 天) | **P0** | 無 |

### 2.2 前端功能補全組（P0-P1）

| ID | 說明 | 工作量 | 優先級 | 依賴 |
|----|------|:------:|:------:|------|
| PH4-006 | **Polyline 多段線繪圖**：連續點按繪製，Enter 結束，Escape 取消。儲存為 vertices[]，可選取/拖曳頂點 | **中** (1-2 天) | **P0** | PH4-001 |
| PH4-007 | **Move 移動工具**：選取圖元 → 拖曳到新位置 → undo/redo。與 COPY 共用選取邏輯，差別在不保留原圖元 | **中** (1 天) | **P0** | PH4-001 |
| PH4-008 | **圖層面板功能強化**：新建/刪除/切換可見鎖定/選取目前圖層/顏色選取。與 engine `_activeLayer` 整合 | **中** (1-2 天) | **P1** | PH4-001 |
| PH4-009 | **DXF 匯出（前端→後端）**：新增 `dxf_writer.py`（DXF R12），支援 LINE/CIRCLE/ARC/POLYGON/TEXT 寫出。FileMenu 加入匯出按鈕 | **中** (2 天) | **P1** | 無 |
| PH4-010 | **縮放/旋轉編輯 UI**：選取圖元 → 中心點基準縮放或旋轉，圖形化拖曳手柄 | **中** (1-2 天) | **P1** | PH4-001 |

### 2.3 後端強化組（P1-P2）

| ID | 說明 | 工作量 | 優先級 | 依賴 |
|----|------|:------:|:------:|------|
| PH4-011 | **幾何計算服務強化**：geometry.py 擴充為支援線段相交、點到線段最近點、offset 平行線、弧長計算 | **中** (1-2 天) | **P1** | 無 |
| PH4-012 | **Layer CRUD API**：新增 create/delete/update/list 端點（目前只有 GET） | **小** (1 天) | **P1** | 無 |
| PH4-013 | **LLM 指令解析器強化**：從純 regex 升級為 plugin 架構（regex fallback + LLM API），帶入領域詞彙表 | **特大** (5-7 天) | **P2** | 無 |
| PH4-014 | **後端 pytest 擴充**：補上 geometry/dxf_parser/command 測試 | **小** (1 天) | **P1** | 無 |

### 2.4 測試與品質組（P1）

| ID | 說明 | 工作量 | 優先級 | 依賴 |
|----|------|:------:|:------:|------|
| PH4-015 | **前端測試基礎設施**：安裝 @testing-library/react，建立測試 helper（canvas mock、engine mock），vitest 全域 setup | **小** (1 天) | **P1** | 無 |
| PH4-016 | **整合測試（engine + tools）**：模擬完整繪圖流程（選擇工具→點擊→驗證 entities） | **中** (1-2 天) | **P1** | PH4-015 |
| PH4-017 | **CI/CD Pipeline**：GitHub Actions（lint → unit test → build） | **小** (1 天) | **P1** | 無 |
| PH4-018 | **Vercel 前後端一體部署**：vercel.json + Mangum ASGI wrapper + SQLite→Vercel Postgres + WS 改 REST polling | **中** (2 天) | **P1** | PH4-001~008（已拆好） |

---

## 三、REVIEWER 建議對照表

| Phase 3 REVIEWER 缺失項（93/100） | Phase 4 任務 | 狀態 |
|----------------------------------|-------------|:----:|
| engine.js 拆分（1378 行過大） | PH4-001 | ✅ |
| 快捷鍵分散兩處不一致 | PH4-002 | ✅ |
| 硬編碼常數未提取 | PH4-003 | ✅ |
| EditTools 測試深度不足（僅函數存在性） | PH4-004 | ✅ |
| 缺少 PropertyPanel + StatusBar 測試 | PH4-005 | ✅ |

## 四、執行順序建議

```
PH4-001 (engine拆分) ─┬─→ PH4-002 (快捷鍵) ─→ PH4-003 (常數)
                      │
                      ├─→ PH4-004 (EditTools測試) ─┐
                      ├─→ PH4-005 (元件測試) ─────┤
                      │                           │
                      ├─→ PH4-006 (Polyline) ────┤
                      ├─→ PH4-007 (Move) ────────┤ 並行可能
                      ├─→ PH4-008 (圖層面板) ────┤
                      └─→ PH4-010 (縮放旋轉) ────┘

PH4-009 (DXF匯出) ─── 獨立，可與前端並行
PH4-011 (幾何強化) ──┐
PH4-012 (Layer API) ─┤ 後端組，無前端依賴
PH4-014 (pytest) ────┘

PH4-015 (測試基建) → PH4-016 (整合測試) → PH4-017 (CI/CD)
PH4-013 (LLM強化) ─── 可獨立進行，P2 優先級最低
```

## 五、風險評估

| 風險 | 機率 | 影響 | 緩解策略 |
|------|:----:|:----:|---------|
| engine.js 拆分導致回歸 | 高 | 高 | 逐步拆分，每次抽一個模組後立即跑 43 測試 |
| Polyline vs POLYGON 混淆 | 中 | 中 | type 明確區分，Polyline 用 `isClosed=false` |
| LLM 強化需外部 API key | 中 | 低 | Plugin 架構：無 API key 時自動降級 regex |
| DXF 寫出格式相容性 | 低 | 中 | 鎖定 DXF R12，先支援 5 種基本圖元 |
| 測試基建建立時間 | 低 | 低 | @testing-library/react + jsdom 成熟方案，1 天完成 |

## 六、驗收標準

| 層級 | 標準 |
|------|------|
| **總分** | REVIEWER 評分 ≥ 90/100 |
| **P0 完成率** | 100%（PH4-001 ~ PH4-007） |
| **測試數量** | 從 43 測試擴充至 ≥ 80 測試 |
| **Build** | `npm run build` 無錯誤 |
| **無回歸** | Phase 0-3 既有功能全部正常 |

---

## 七、工作量總計

| 組別 | 任務數 | 工作量估計 |
|------|:------:|:----------:|
| 技術重構（P0） | 5 | 約 6-8 天 |
| 前端功能（P0-P1） | 5 | 約 6-8 天 |
| 後端強化（P1-P2） | 4 | 約 4-6 天 |
| 測試與品質（P1） | 3 | 約 3-4 天 |
| **總計** | **17 任務** | **約 19-26 天** |
