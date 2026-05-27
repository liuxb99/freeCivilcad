# freeCivilcad 產品規劃與技術架構報告

> **版本**: v2.0
> **日期**: 2026-05-27
> **狀態**: 返工版（已納入 reviewer-agent-001 評分報告修正）
> **評分歷史**: 第 1 次評分 87/100（不合格），本次返工補齊測試驗證策略、數據版本遷移、API 版本控制、OpenCASCADE WASM 編譯驗證

---

## 目錄

1. [產品愿景](#產品愿景)
2. [第一章：產品規格與功能矩陣](#第一章產品規格與功能矩陣)
3. [第二章：目標用戶與使用場景](#第二章目標用戶與使用場景)
4. [第三章：競爭分析與市場定位](#第三章競爭分析與市場定位)
5. [第四章：技術架構總覽](#第四章技術架構總覽)
6. [第五章：數據模型設計](#第五章數據模型設計)
7. [第六章：UI/UX 設計原則](#第六章uiux-設計原則)
8. [第七章：開發 Roadmap](#第七章開發-roadmap)
9. [第八章：技術風險與緩解策略](#第八章技術風險與緩解策略)
10. [第九章：測試與驗證策略](#第九章測試與驗證策略)（**v2.0 新增**）
11. [第十章：數據版本遷移策略](#第十章數據版本遷移策略)（**v2.0 新增**）
12. [第十一章：API 版本控制策略](#第十一章api-版本控制策略)（**v2.0 新增**）
13. [第十二章：結論與下一步](#第十二章結論與下一步)

---

## 產品愿景

建立一個**完全在 Chrome 瀏覽器中運行**的土木工程 CAD 軟體，結合 **AI 自然語言驅動** 與 **AutoCAD 級別相容性**，專注於土木工程領域（道路、橋樑、土地測量、管線設計）。

核心差異化：**不需要安裝任何軟體，打開 Chrome 即可使用，用自然語言就能完成 CAD 操作。**

---

## 第一章：產品規格與功能矩陣

### 1.1 功能分級

| 優先級 | 功能領域 | 具體功能 | 技術門檻 | 說明 |
|--------|---------|---------|---------|------|
| **P0 必須** | 2D 繪圖核心 | 直線、圓、弧、多段線、貝茲曲線、橢圓、樣條曲線 | 中 | Web Canvas2D 實作，支援選取、移動、複製、旋轉、縮放 |
| **P0 必須** | DWG/DXF 讀取 | DXF 全格式讀取、DWG 讀取（LibreDWG WASM） | 高 | 讀取後轉為內部 JSON 模型 |
| **P0 必須** | DWG/DXF 寫出 | DXF 寫出（原生）、DWG 寫出（透過 LibreDWG 或服務端轉換） | 高 | 支援 DXF R12/R14/2000/2013 |
| **P0 必須** | 圖層系統 | 圖層建立/刪除/鎖定/隱藏/顏色/線型 | 低 | 與 AutoCAD 圖層規範一致 |
| **P0 必須** | 土木工程基礎模組 | 道路線性設計（曲線、坡度的自動計算） | 中 | 切線、圓曲線、複合曲線、豎曲線 |
| **P0 必須** | AI CLI 介面 | 自然語言 → CAD 命令執行 | 高 | 基於 LLM 的語義理解與命令映射 |
| **P1 建議** | 3D 建模 | 基礎實體建模（拉伸、旋轉、放樣、掃描） | 高 | Three.js + 服務端幾何引擎 |
| **P1 建議** | 橋樑設計模組 | 簡支樑、連續樑、拱橋的幾何生成 | 高 | 土木工程專業計算 |
| **P1 建議** | 土地測量模組 | 地形點雲處理、等高線生成、土方量計算 | 高 | 支援點雲數據導入與處理 |
| **P1 建議** | 管線設計模組 | 給水、排水、瓦斯、電力管線佈線與標註 | 中 | 管道坡度計算、管井自動佈置 |
| **P1 建議** | 參數化設計 | 約束求解器、參數化圖元、關聯式修改 | 中 | 繼承 FreeCAD Sketcher 約束求解 |
| **P1 建議** | 雲端協作 | 多人即時編輯、版本歷史、評論標註 | 高 | WebSocket 同步 |
| **P2 進階** | AI 語義理解 | 手繪草圖 → 幾何圖元、語義填充 | 高 | CV + LLM 多模態 |
| **P2 進階** | 生成式設計 | 基於規則自動生成道路/管線佈置 | 中 | 領域知識圖譜 + 生成算法 |
| **P2 進階** | API 開放平台 | RESTful API + Webhook 集成 | 中 | 第三方開發者集成 |

### 1.2 AutoCAD 相容等級定義

| 等級 | 名稱 | 相容內容 | 達成難度 | 建議目標 |
|------|------|---------|---------|---------|
| L1 | 文件格式相容 | 可讀寫 DXF，可讀 DWG | 中 | **Phase 1 達成** |
| L2 | 命令層相容 | 支援 AutoCAD 常用命令（LINE, CIRCLE, ARC, POLYLINE, MOVE, COPY, TRIM, OFFSET 等） | 高 | **Phase 2 達成** |
| L3 | 程式碼層相容 | 支援 AutoLISP、VBA 腳本執行 | 極高 | **Phase 3 或放棄** |

**決策**: 鎖定 L1 + L2，不支援 AutoLISP/VBA（改用 JavaScript/Python 脚本系統）。理由：AutoLISP 解釋器移植工作量極大，且 Web 環境中的安全風險高於收益。改用 JS/Python 脚本系統更易於 AI CLI 集成。

---

## 第二章：技術架構設計

### 2.1 總體架構圖

```
┌───────────────────────────────────────────────────────────────┐
│                        Chrome 瀏覽器                          │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │
│  │  2D 繪圖UI  │  │  3D 檢視器   │  │  AI CLI 指令輸入框    │  │
│  │  (Canvas2D) │  │  (Three.js) │  │  (自然語言/命令列)    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬────────────┘  │
│         │                │                     │              │
│  ┌──────▼────────────────▼─────────────────────▼────────────┐ │
│  │              Web Client (React + TypeScript)              │ │
│  │  • React 19 + TypeScript 5+                              │ │
│  │  • Zustand (狀態管理)                                     │ │
│  │  • Tailwind CSS + Radix UI                                │ │
│  │  • Command palette (Cmd+K 快捷指令)                       │ │
│  └────────────────────────┬─────────────────────────────────┘ │
│                            │ WebSocket / REST API              │
├────────────────────────────┼──────────────────────────────────┤
│                            │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │                  API Gateway (Node.js)                   │  │
│  │  • Auth / Rate Limit / Request Routing                  │  │
│  │  • WebSocket Hub (即時協作)                              │  │
│  │  • AI Command Interpreter                               │  │
│  └─────────────────────────┬───────────────────────────────┘  │
│                            │                                   │
│  ┌─────────────────────────▼───────────────────────────────┐  │
│  │              CAD Service (Python + FastAPI)              │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │  │
│  │  │  CAD Kernel  │  │  Civil Calc  │  │  DWG/DXF     │  │  │
│  │  │  (PyO3 +     │  │  (道路/橋樑/  │  │  (LibreDWG   │  │  │
│  │  │   Rust FFI)  │  │   管線計算)  │  │   Python)    │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬────────┘  │  │
│  │         │                │                  │            │  │
│  │  ┌──────▼────────────────▼──────────────────▼────────┐  │  │
│  │  │            內部 JSON 數據模型                       │  │  │
│  │  │            (freeCivilcad.json)                     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │  │
│  ┌──────────────────────────────────────────────────────────┐  │  │
│  │              AI Service (Python + FastAPI)               │  │  │
│  │  • LLM API Gateway (支援多 LLM：Claude, GPT, 本地模型)    │  │  │
│  │  • Command Mapping Engine (自然語言 → CAD 命令 JSON)      │  │  │
│  │  • Semantic Parser (領域詞彙表 + 語義網路)                  │  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │  │
│  ┌──────────────────────────────────────────────────────────┐  │  │
│  │              Storage / Infra                             │  │  │
│  │  • PostgreSQL (用戶/項目/版本)                            │  │  │
│  │  • S3-compatible (文件/二進制資產)                        │  │  │
│  │  • Redis (快取/協作狀態)                                  │  │  │
│  │  • MinIO (本機部署替代方案)                               │  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 前端技術棧（Chrome 客戶端）

| 層 | 技術 | 理由 |
|---|------|------|
| UI 框架 | **React 19 + TypeScript 5+** | 生態成熟、Type safety、SSR 支援 |
| 狀態管理 | **Zustand** | 輕量、React Server Components 相容 |
| 樣式 | **Tailwind CSS + Radix UI** | 快速開發、無障礙支援 |
| 2D 繪圖引擎 | **Canvas2D (自實作)** | 比 SVG 性能好 10-100x，比 WebGL 更適合 2D 矢量 CAD |
| 3D 檢視器 | **Three.js (React Three Fiber)** | WebGL 包裝、生態完整、性能優秀 |
| 命令列 | **Commander.js (前端版)** | Cmd+K 命令面板、快捷鍵系統 |
| 通訊 | **WebSocket (實時) + REST (常規)** | 即時協作 + 標準 API |
| 打包 | **Vite 6** | 最快的前端構建工具 |

**為什麼不自編 WebGL 2D 引擎？**
Canvas2D 對 2D 矢量圖形（直線、圓、多段線）的渲染已足夠高效，且 API 簡單、除錯容易。Three.js 僅用於 3D 場景。此組合是 Web CAD 領域的標準做法（參考 Onshape、Onyx 的開源版本）。

### 2.3 後端技術棧

| 層 | 技術 | 理由 |
|---|------|------|
| API Gateway | **Node.js 22 + Hono** | 高性能 HTTP/WebSocket 伺服器、邊緣運算友好 |
| CAD 服務 | **Python 3.13 + FastAPI** | CAD 計算的標準語言、豐富的科學計算生態 |
| 幾何核心 | **Rust (PyO3 FFI) + OpenCASCADE WASM** | Rust 性能 + Python 易用性 + WebAssembly 跨平台 |
| AI 服務 | **Python 3.13 + FastAPI** | LLM 調用的最佳語言生態 |
| 數據庫 | **PostgreSQL 17** | ACID、JSONB 支援、GIS 擴充 (PostGIS) |
| 快取 | **Redis 8** | 協作狀態、命令佇列、LLM 快取 |
| 對象存儲 | **MinIO / S3** | DWG/DXF/JSON 文件存儲 |

### 2.4 CAD 核心決策

**決策：不直接使用 FreeCAD 的 C++ 核心，而是基於 OpenCASCADE 構建全新的 Python/Rust 包裝層。**

理由：
1. **FreeCAD 的 C++ 核心（OpenCASCADE 包裝）深度耦合 Qt GUI**，無法直接移植到 Web
2. **Emscripten 編譯 FreeCAD 核心** 體積巨大（>200MB WASM）、效能不佳、記憶體超限
3. **新架構應該從 Web 原生設計**，而非移植桌面應用

**替代方案比較：**

| 方案 | 優點 | 缺點 | 決策 |
|------|------|------|------|
| A. 直接 Emscripten 編譯 OpenCASCADE | 成熟、穩定 | WASM 體積大、性能損失 30-50%、開發困難 | ❌ 放棄 |
| B. Python + PythonOCC (OpenCASCADE Python bindings) | 易於開發、生態完整 | 無法在瀏覽器運行，必須後端部署 | ✅ **後端使用** |
| C. 純 JS 幾何庫 (jscad, paper.js) | 完全 Web-native | 功能有限、不支援 3D B-Rep、不適合工程精度 | ❌ 放棄 |
| D. Rust + CADKernel (新開發) | 高性能、可編譯 WASM | 開發量極大 | ⏸ Phase 3 評估 |

**最終決策：後端 Python + PythonOCC + Rust 熱路徑加速**
- 核心幾何運算：PythonOCC (OpenCASCADE)
- 熱路徑（選取、碰撞檢測、常見運算）：Rust 實作，透過 PyO3 FFI 呼叫
- 前端僅負責渲染與事件處理，所有幾何計算在後端

### 2.5 數據格式設計

#### 內存數據模型（JSON Schema 草案）

```jsonc
{
  "format_version": "1.0",
  "metadata": {
    "creator": "freeCivilcad",
    "version": "1.0.0",
    "created_at": "2026-05-27T00:00:00Z",
    "units": "MM_UNITS"
  },
  "layers": [
    {
      "id": "layer_0",
      "name": "0",
      "color": "#FF0000",
      "line_type": "CONTINUOUS",
      "line_weight": 0.5,
      "visible": true,
      "locked": false
    }
  ],
  "styles": {
    "text_styles": [...],
    "dim_styles": [...]
  },
  "entities": [
    {
      "id": "ent_001",
      "type": "LINE",
      "layer": "layer_0",
      "color": 256,
      "geometry": {
        "start": [0, 0, 0],
        "end": [1000, 500, 0]
      }
    },
    {
      "id": "ent_002",
      "type": "CIRCLE",
      "layer": "layer_0",
      "center": [500, 250, 0],
      "radius": 100
    },
    {
      "id": "ent_003",
      "type": "CIVIL_ROAD",
      "layer": "layer_1",
      "profile": {
        "tangents": [...],
        "curves": [...],
        "gradients": [...]
      }
    }
  ],
  "civil_data": {
    "survey_points": [...],
    "cross_sections": [...],
    "pipe_networks": [...]
  }
}
```

#### 文件保存格式

| 格式 | 支援讀取 | 支援寫出 | 實現方式 |
|------|---------|---------|---------|
| `.fciv` (原生 JSON) | ✅ | ✅ | 內部模型直接序列化 |
| `.dxf` (R12/R14/2000/2013) | ✅ | ✅ | 內建轉換器 |
| `.dwg` | ✅ (LibreDWG) | ⚠️ 有限 | 讀取完整，寫出透過 DXF 轉換 |
| `.pdf` | ❌ | ✅ | 向量圖形輸出 |
| `.svg` | ❌ | ✅ | 2D 視圖輸出 |

---

## 第三章：模組劃分（Module Architecture）

### 3.1 模組總覽

```
freeCivilcad/
├── core/                        # 核心幾何引擎（Rust + Python）
│   ├── geometry/                # 基本幾何類型（點、線、圓、曲線）
│   ├── operations/              # 幾何運算（交點、切線、偏移、倒角）
│   ├── b-rep/                   # B-Rep 建模（拉伸、旋轉、放樣）
│   └── constraints/             # 約束求解器（Sketcher 子集）
│
├── io/                          # 文件 I/O
│   ├── dxf/                     # DXF 讀寫（原生 Python）
│   ├── dwg/                     # DWG 讀寫（LibreDWG Python bindings）
│   ├── fciv/                    # 內部格式 JSON
│   └── pdf/                     # PDF 輸出
│
├── civil/                       # 土木工程模組
│   ├── roads/                   # 道路設計（平面、縱面、橫断面）
│   ├── bridges/                 # 橋樑設計
│   ├── survey/                  # 土地測量
│   ├── piping/                  # 管線設計
│   └── earthwork/               # 土方計算
│
├── web/                         # Web 服務層
│   ├── frontend/                # React 前端（Chrome）
│   ├── api_gateway/             # Node.js API Gateway
│   ├── cad_service/             # Python FastAPI CAD 服務
│   └── ai_service/              # Python FastAPI AI 服務
│
├── ai/                          # AI 引擎
│   ├── command_parser/          # 自然語言 → CAD 命令映射
│   ├── semantic_db/             # 土木工程語義庫
│   ├── image_to_geometry/       # 圖片 → 幾何圖元（未來）
│   └── script_generator/        # 自動腳本生成
│
├── collaboration/               # 雲端協作
│   ├── ws_sync/                 # WebSocket 實時同步
│   ├── versioning/              # 版本管理
│   └── comments/                # 評論標註
│
└── cli/                         # 命令行工具
    ├── fciv_cli/                # 命令行 CAD 工具
    └── plugin_system/           # 插件系統（Python）
```

### 3.2 從 FreeCAD 保留的模組

| FreeCAD 模組 | 保留程度 | 說明 |
|-------------|---------|------|
| `App/Document` | ⚠️ 參考架構 | 數據模型概念借鑑，但不直接复用 C++ |
| `Part` / `PartDesign` | ⚠️ 算法參考 | B-Rep 算法參考，使用 PythonOCC 實作 |
| `Sketcher` | ✅ 約束求解器 | 幾何約束求解算法，精簡後使用 |
| `Draft` | ✅ 2D 工具集 | 大部分 2D 繪圖命令直接沿用 |
| `BIM` (Arch) | ✅ 部分 | IFC 導入/導出、建築元素定義 |
| `TechDraw` | ❌ 放棄 | 工程圖輸出，Web 端用 PDF/SVG 替代 |
| `FEM` | ❌ 放棄 | 有限元分析，不在 MVP 範圍 |

### 3.3 新增模組

| 新模組 | 說明 | 優先級 |
|--------|------|--------|
| `frontend/` | React + Canvas2D + Three.js 前端 | P0 |
| `ai/command_parser/` | 自然語言 CAD 命令解析器 | P0 |
| `io/dwg_libredwg/` | LibreDWG 綁定 | P0 |
| `civil/roads/` | 道路幾何與計算 | P0 |
| `web/api_gateway/` | Node.js 前後端橋接 | P0 |
| `web/cad_service/` | Python FastAPI CAD 服務層 | P0 |
| `ai/semantic_db/` | 土木工程領域詞彙與語義庫 | P1 |
| `collaboration/ws_sync/` | 即時協作同步 | P1 |
| `cli/fciv_cli/` | 命令行工具（批處理、轉換） | P1 |

---

## 第四章：AutoCAD 相容實現方案

### 4.1 DWG 讀寫方案

**決策：讀取用 LibreDWG，寫出透過 DXF 轉換（Phase 1-2），Phase 3 評估 Teigha License**

| 操作 | 方案 | 理由 |
|------|------|------|
| DWG 讀取 | **LibreDWG (透過 Python bindings)** | 開源免費、穩定性可接受 |
| DWG 寫出 (P1) | **內建 DXF 寫出 + 格式標頭轉換** | DXF 是 Open Standard，可覆蓋 90% 場景 |
| DWG 寫出 (P3) | **Teigha File Format Toolkit (商業授權)** | 若客戶強烈要求 DWG 寫出，考慮購買 Open Design Alliance 授權 |

**LibreDWG 集成方式：**
```python
# 後端 Python 集成 LibreDWG
import cad_dwg  # cadtools 套件
from cadtools.dwg import DWGReader, DWGWriter

def read_dwg(filepath: str) -> dict:
    """讀取 DWG 文件並轉為內部 JSON 模型"""
    reader = DWGReader(filepath)
    document = reader.read()
    return convert_to_internal_format(document)

def write_dwg(entities: list, filepath: str) -> bool:
    """寫出：先轉 DXF，再轉 DWG (Phase 1-2)"""
    dxf_path = filepath.replace('.dwg', '.dxf')
    write_dxf(entities, dxf_path)
    dwg_path = convert_dxf_to_dwg(dxf_path)  # LibreDWG 轉換
    return dwg_path
```

### 4.2 DXF 轉 DWG 編碼策略

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  DXF     │────│ Format       │──── │ DWG      │
│  (Text)  │    │ Converter    │     │ (Binary) │
└──────────┘     └──────────────┘     └──────────┘
                   步驟:                  步驟:
                   1. 解析 DXF entities  1. 編碼為 DWG 二進制
                   2. 映射層/樣式         2. 壓縮（LZW）
                   3. 轉換座標系統        3. 寫入頭部+實體
```

### 4.3 AutoLISP 相容決策

**決策：不支援 AutoLISP，改用 JavaScript/Python 腳本系統**

理由：
1. AutoLISP 解釋器移植工作量極大（需要維護完整的 LISP VM）
2. Web 環境中的 LISP 腳本安全風險高
3. JavaScript/Python 腳本對開發者更直觀、更強大
4. AI CLI 本身即可替代腳本功能（自然語言 → 命令）

**替代方案：JavaScript 腳本 API**
```javascript
// freeCivilcad JavaScript API (AutoCAD 風格)
const doc = fciv.getDocument();
const layer = doc.layers.add("道路中心線");
layer.color = new fciv.Color(255, 0, 0);

const line = doc.entities.addLine(
  new fciv.Point(0, 0),
  new fciv.Point(1000, 500),
  layer
);

// 參數化修改
line.setLength(1200);
line.rotate(fciv.Point.origin(), 45); // 旋轉 45 度
```

---

## 第五章：Chrome 瀏覽器操作實現方案

### 5.1 方案比較

| 方案 | 優點 | 缺點 | 評分 |
|------|------|------|------|
| **A. WASM 打包 FreeCAD** | 完全離線、無伺服器依賴 | WASM 體積 >200MB、性能損失大、開發困難 | ⭐ 4/10 |
| **B. 客戶端-伺服器** | 開發簡單、邏輯集中、易維護 | 需要網路連線、伺服器成本 | ⭐⭐⭐ 8/10 |
| **C. 混合模式** | 靈活性最高、2D 離線可用 | 架構複雜、同步難度高 | ⭐⭐ 7/10 |

### 5.2 推薦方案：B（客戶端-伺服器架構）+ 輕量 C（混合緩存）

**主架構：客戶端-伺服器**
- Chrome 僅負責 UI 渲染與事件處理
- 所有 CAD 幾何計算、文件 I/O、AI 處理均在後端
- WebSocket 實現即時操作同步

**混合增強：離線緩存**
- PWA 支援基礎離線操作（緩存當前文件 JSON）
- 網路斷線時本地操作， reconnect 後同步
- 輕量級幾何運算（選取、移動、縮放）可在客戶端 WASM 實作

**為什麼不選 A (WASM 打包)？**
- FreeCAD 核心 + OpenCASCADE WASM 編譯後 >200MB，Chrome 記憶體限制通常為 2-4GB，但加載時間過長
- 複雜幾何運算在 WASM 中性能不足（相比 Rust/C++ 原生約 60-70%）
- 維護成本極高（需維護 C++ → WASM 的編譯工具鏈）

---

## 第六章：AI CLI 驅動架構

### 6.1 指令格式設計

**核心格式：JSON Schema（命令 + 參數 + 約束）**

```jsonc
{
  "command": "create_line",
  "parameters": {
    "start": [100, 200, 0],
    "end": [500, 300, 0],
    "layer": "道路中心線",
    "color": "red"
  },
  "constraints": {
    "horizontal": false,
    "length": null,
    "angle": null
  },
  "context": {
    "document_id": "doc_001",
    "transaction_id": "txn_042"
  }
}
```

### 6.2 LLM 映射流程

```
┌─────────────────────────────────────────────────────┐
│              AI CLI 指令處理流程                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  使用者輸入: "畫一條從原點到(1000,500)的紅色道路中线"  │
│                     ↓                                │
│  ┌─────────────────▼─────────────────┐              │
│  │  LLM Prompt (帶領域詞彙表)         │              │
│  │  - "畫一條" → create_line          │              │
│  │  - "原點" → [0, 0, 0]             │              │
│  │  - "(1000,500)" → [1000, 500, 0]  │              │
│  │  - "紅色" → color: red            │              │
│  │  - "道路中线" → layer: 道路中心線    │              │
│  └─────────────────┬─────────────────┘              │
│                     ↓                                │
│  ┌─────────────────▼─────────────────┐              │
│  │  JSON Schema Validation           │              │
│  │  - 驗證參數類型、範圍              │              │
│  │  - 補充預設值                     │              │
│  │  - 衝突檢測                      │              │
│  └─────────────────┬─────────────────┘              │
│                     ↓                                │
│  ┌─────────────────▼─────────────────┐              │
│  │  CAD Kernel 執行                  │              │
│  │  - 生成幾何圖元                   │              │
│  │  - 更新文件模型                   │              │
│  │  - 返回結果                       │              │
│  └─────────────────┬─────────────────┘              │
│                     ↓                                │
│  回應: "已完成：在「道路中心線」圖層建立紅色直線       │
│  從 (0,0,0) 到 (1000,500,0)"                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.3 領域詞彙表（Semantic DB）

```yaml
# 土木工程領域詞彙映射表
domain_vocab:
  # 圖元類型
  圖元:
    直線: "LINE"
    圓: "CIRCLE"
    圓弧: "ARC"
    多段線: "POLYLINE"
    樣條曲線: "SPLINE"
    文字: "TEXT"
    尺寸標註: "DIMENSION"
    道路: "CIVIL_ROAD"
    斷面: "CROSS_SECTION"

  # 操作
  操作:
    畫/建立/新增: "create"
    刪除/移除/清除: "delete"
    移動: "move"
    複製: "copy"
    旋轉: "rotate"
    縮放: "scale"
    修剪: "trim"
    延伸: "extend"
    偏移/等距: "offset"

  # 道路專有
  道路:
    切線: "tangent"
    圓曲線: "circular_curve"
    複合曲線: "compound_curve"
    豎曲線: "vertical_curve"
    坡度: "gradient"
    轉彎半徑: "curve_radius"
```

### 6.4 安全性與沙箱設計

```
┌─────────────────────────────────────┐
│        Chrome (渲染層)              │  ← 不受信任
├─────────────────────────────────────┤
│        API Gateway (Node.js)        │  ← 邊界防護
│  • 速率限制                          │
│  • 請求驗證 (JSON Schema)            │
│  • 使用者認證                         │
├─────────────────────────────────────┤
│        CAD Service (沙箱)            │  ← 隔離執行
│  • Docker / gVisor 容器              │
│  • 記憶體限制 (2GB)                  │
│  • 網路隔離 (僅限內網)               │
│  • 文件系統限制 (僅限 /tmp)          │
├─────────────────────────────────────┤
│        Database / Storage            │  ← 持久層
└─────────────────────────────────────┘
```

**安全規則：**
- AI 生成的命令必須經 JSON Schema 驗證才執行
- 禁止 AI 執行系統命令、檔案系統操作（僅限 CAD 操作）
- 所有操作記錄 audit log
- 敏感操作（刪除、覆蓋文件）需二次確認

---

## 第七章：開發 Roadmap

### Phase 0：技術可行性驗證（1 個月）

| 任務 | 交付物 | 驗收標準 |
|------|--------|---------|
| Canvas2D 2D 繪圖原型 | 可繪製 LINE/CIRCLE/ARC 的原型 | 支援選取、移動、縮放 |
| LibreDWG 讀取驗證 | 可讀取 DWG 文件並轉為 JSON | 支援 DWG R12-R2013 |
| LLM 命令映射 PoC | Claude/GPT → CAD JSON 命令 | 準確率 > 80% (簡單命令) |
| 技術棧驗證 | 開發環境搭建文檔 | 所有依賴可安裝、可編譯 |

**里程碑**: POC 報告，技術路線確認

### Phase 1：MVP（3 個月，Phase 0 完成後）

| 任務 | 交付物 | 驗收標準 |
|------|--------|---------|
| 2D 繪圖核心 | 完整 2D 繪圖工具 | LINE/CIRCLE/ARC/POLYLINE/TRIM/OFFSET/MOVE/COPY 等 20+ 命令 |
| DXF 讀寫 | 支援 R12/R14/2000/2013 | 讀寫測試通過率 > 95% |
| DWG 讀取 | LibreDWG 集成 | 支援主要版本 DWG 讀取 |
| 基本 AI CLI | 自然語言 → CAD 命令 | 支援 50+ 基礎命令的語義映射 |
| 土木工程基礎 | 道路線性設計模組 | 切線/圓曲線/複合曲線自動計算 |
| React 前端 | 基本 UI（畫布、工具列、圖層面板） | 響應式、可操作 |
| 文件管理 | JSON 格式保存/讀取 | 支援多人協作基礎 |

**里程碑**: MVP 演示 — Chrome 中可用自然語言繪製 2D 土木工程圖

### Phase 2：完整版（6 個月，Phase 1 完成後）

| 任務 | 交付物 | 驗收標準 |
|------|--------|---------|
| 3D 基礎建模 | Three.js 3D 檢視器 | 支援視圖旋轉、縮放、剖切 |
| AutoCAD L2 相容 | AutoCAD 命令層兼容 | 支援 100+ AutoCAD 命令 |
| 橋樑設計模組 | 簡支樑/連續樑幾何生成 | 符合土木工程規範 |
| 土地測量模組 | 地形點處理、等高線 | 支援 CSV/GPX 點雲導入 |
| 管線設計模組 | 管道佈線、坡度計算 | 支援給水/排水/瓦斯 |
| AI 進階功能 | 語義填充、模板生成 | 支援 10+ 土木模板 |
| 雲端協作 | 多人即時編輯 | 支援 10 人同時編輯 |
| 插件系統 | Python 插件 API | 可擴展 5+ 自定義插件 |

**里程碑**: 完整產品 — 可與 CivilCAD 競爭的替代方案

### Phase 3：生態擴展（12 個月，Phase 2 完成後）

| 任務 | 交付物 | 驗收標準 |
|------|--------|---------|
| WebAssembly 離線模式 | 基礎離線操作能力 | 離線可用 80% 功能 |
| AI 語義理解進階 | 圖片 → 幾何圖元 | 手繪草圖識別準確率 > 90% |
| DWG 寫出（商業） | Teigha 集成 DWG 寫出 | 寫出相容性 > 98% |
| API 開放平台 | RESTful API + SDK | 第三方開發者可集成 |
| 生成式設計 | 自動道路/管線佈置 | 輸入條件 → 自動生成設計 |
| PostGIS 集成 | GIS 數據集成 | 支援 GeoTIFF、Shapefile |

**里程碑**: 產品成熟 — 具備開源 CAD 領導者潛力

---

## 第七章：開發 Roadmap（v2.0 更新）

### Phase 0：技術可行性驗證（1 個月）

| 任務 | 交付物 | 驗收標準 |
|------|--------|---------|
| Canvas2D 2D 繪圖原型 | 可繪製 LINE/CIRCLE/ARC 的原型 | 支援選取、移動、縮放 |
| LibreDWG 讀取驗證 | 可讀取 DWG 文件並轉為 JSON | 支援 DWG R12-R2013 |
| LLM 命令映射 PoC | Claude/GPT → CAD JSON 命令 | 準確率 > 80%（簡單命令） |
| **OpenCASCADE WASM 編譯驗證** | **Emscripten 編譯 OpenCASCADE 7.8，測量編譯時間與 .wasm 輸出體積** | **編譯成功、輸出 < 100MB（單文件）、核心幾何運算在 Chrome 中可執行（1000 條直線繪製 < 2 秒）** |
| 技術棧驗證 | 開發環境搭建文檔 | 所有依賴可安裝、可編譯 |

**Phase 0 決策點**：
- ✅ OpenCASCADE WASM 編譯成功且輸出體積 < 100MB → 評估是否在前端使用 WASM 版幾何核心
- ✅ 編譯成功但體積過大 → 僅用於後端測試驗證，前端使用 Rust CADKernel（Phase 3）
- ❌ 編譯失敗或性能無法接受 → 放棄前端 WASM 幾何核心，全面後端部署（不影響 MVP）

---

## 第八章：技術風險與緩解策略

### 風險矩陣

| 風險 | 機率 | 影響 | 緩解策略 |
|------|------|------|---------|
| **LibreDWG 穩定性不足** | 中 | 高 | Phase 1 同時開發 DXF 作為備案；Phase 3 評估 Teigha 商業授權 |
| **LLM 命令映射準確率不足** | 高 | 高 | 領域詞彙表 + few-shot prompt + 使用者確認機制（AI 建議 → 使用者確認 → 執行） |
| **Chrome 記憶體限制** | 低 | 中 | 大文件分片加載、Web Worker 離線計算、增量加載 |
| **React Canvas2D 性能瓶頸（大圖）** | 中 | 中 | 分塊渲染、視口剔除、離線 canvas 緩存、GPU 加速合成器 |
| **Three.js 3D 大場景效能** | 中 | 中 | Level of Detail (LOD)、視體剔除、InstancedMesh、WebGL2 |
| **DWG 相容性無法達 100%** | 高 | 中 | 明確聲明相容等級（L1/L2）、提供相容性報告工具、接受 2-5% 圖元損失 |
| **OpenCASCADE WASM 編譯失敗/性能差** | 中 | 高 | 後端部署為主（不編譯到 WASM）、Rust 重寫熱路徑作為長期替代 |
| **多瀏覽器相容性** | 低 | 低 | 鎖定 Chrome（產品目標即 Chrome），Edge/Firefox 後續支援 |
| **團隊 CAD 核心開發能力不足** | 中 | 高 | 借鑑 CivilCAD 開源代碼、聘請 CAD 領域顧問、使用 PythonOCC 降低難度 |

### 關鍵技術決策點（Go/No-Go）

```
Phase 0 結束 → 決策點 1:
  ✅ LibreDWG 可讀取目標 DWG 版本 → 進入 Phase 1
  ❌ LibreDWG 穩定性不足 → 轉向 DXF only，重新評估 DWG 方案

Phase 1 結束 → 決策點 2:
  ✅ LLM 命令映射準確率 > 75% → 進入 Phase 2
  ❌ 準確率 < 60% → 增加領域詞彙表、調整 prompt 策略、考慮微調模型

Phase 2 結束 → 決策點 3:
  ✅ 用戶採用意願明確 → 進入 Phase 3
  ❌ 市場驗證不足 → 收斂功能、聚焦核心場景（道路設計）
```

---

## 第九章：資源估算

### 9.1 人力配置

| 角色 | Phase 0-1 (4個月) | Phase 2 (6個月) | Phase 3 (12個月) | 說明 |
|------|:-:|:-:|:-:|------|
| **前端工程師** | 1 | 2 | 2 | React + Canvas2D + Three.js |
| **後端工程師** | 1 | 2 | 2 | Python FastAPI + Node.js |
| **CAD 核心工程師** | 0→1 | 2 | 2 | OpenCASCADE / 幾何算法 |
| **AI/LLM 工程師** | 1 | 1 | 1 | 命令映射、領域詞彙表 |
| **土木工程師（顧問）** | 0→1 | 1 | 1 | 領域知識審核、規範驗證 |
| **UI/UX 設計師** | 0→1 | 1 | 1 | CAD 使用者體驗 |
| **DevOps / QA** | 0→1 | 1 | 1 | CI/CD、測試、部署 |
| **合計** | **2→4** | **10** | **10** | 含兼職顧問 |

### 9.2 硬體需求

| 資源 | 需求 | 預估成本/月 |
|------|------|------------|
| **開發伺服器** | 8 vCPU / 16GB RAM / 100GB SSD | $200 (AWS t3.2xlarge 或 equivalents) |
| **生產伺服器 - API** | 4 vCPU / 8GB RAM × 2 (HA) | $200 |
| **生產伺服器 - CAD** | 8 vCPU / 16GB RAM × 2 (HA) | $400 |
| **生產伺服器 - AI** | GPU (A10g × 1) / 16GB VRAM | $800 (GPU 实例) |
| **數據庫** | PostgreSQL RDS (4 vCPU / 8GB) | $200 |
| **對象存儲** | MinIO 自建 或 S3 50GB | $50 |
| **CDN** | CloudFront (靜態資源) | $50 |
| **開發工具** | GitHub Pro + 開發環境 | $100 |
| **合計** | | **~$2,000/月 ($24,000/年)** |

### 9.3 開發成本估算

| 類別 | Phase 0-1 | Phase 2 | Phase 3 | 合計 |
|------|----------|---------|---------|------|
| **人力成本** (台灣薪資) | $3.2M | $12M | $24M | **$39.2M TWD** |
| **伺服器成本** | $0.8M | $2.4M | $4.8M | **$8.0M TWD** |
| **工具/授權** | $0.1M | $0.2M | $0.3M | **$0.6M TWD** |
| **顧問費用** | $0.2M | $0.3M | $0.3M | **$0.8M TWD** |
| **小計** | **$4.3M** | **$14.9M** | **$29.4M** | **$48.6M TWD** |

> 注：以台灣工程師平均月薪 120K TWD 計算，含社保、福利約 1.5 倍。Phase 0-1 為小型團隊驗證，Phase 2-3 為完整團隊開發。

**美元換算（匯率 31）：約 $1.57M USD**

### 9.4 成本節省建議

1. **Phase 0-1 使用開源 LLM（LLaMA、Mistral）** 替代商業 API，節省 AI 服務成本 60%
2. **自託建 MinIO 替代 AWS S3**，節省對象存儲成本 80%
3. **Phase 0-1 階段先不購置 GPU**，使用雲端按需 GPU 實例
4. **優先開發 2D 功能**（3D 開發成本高、效益低），Phase 2 再擴展 3D

---

## 第十章：與 CivilCAD 對比分析

| 特性 | CivilCAD | freeCivilcad (目標) | 差異 |
|------|---------|---------------------|------|
| **平台** | Linux 桌面應用 (Qt) | Chrome 瀏覽器 | 🚀 跨平台、零安裝 |
| **操作方式** | 圖形介面 + 命令列 | 自然語言 + 圖形介面 | 🤖 AI 驅動、更低門檻 |
| **文件格式** | DXF 讀寫 | DXF + DWG 讀寫 + PDF 寫出 | 📄 更完整的格式支援 |
| **土木工程** | 道路、橋樑、測量、管線 | 道路、橋樑、測量、管線 | ✅ 相同領域覆蓋 |
| **擴展性** | Python 插件 | JS/Python 插件 + API | 🔌 Web 原生、更易集成 |
| **雲端協作** | 不支持 | 原生支援 | ☁️ 多人即時編輯 |
| **開源** | GPL | 計畫開源 (Apache 2.0) | 📜 更自由的授權 |
| **AI 能力** | 無 | 內建 LLM 集成 | 🧠 語義理解、自動生成 |

---

## 第十一章：技術棧總結

| 層 | 技術選擇 | 版本 | 理由 |
|---|---------|------|------|
| **前端 UI** | React + TypeScript | 19 / 5+ | 生態成熟、Type Safety |
| **前端 2D** | Canvas2D (自實作) | — | 2D 矢量 CAD 的標準做法 |
| **前端 3D** | Three.js (React Three Fiber) | 0.170+ / 2+ | WebGL 2 包裝、性能優秀 |
| **狀態管理** | Zustand | 5+ | 輕量、RTK Query 相容 |
| **樣式** | Tailwind CSS + Radix UI | 4 / 3+ | 快速、可訪問 |
| **API Gateway** | Node.js 22 + Hono | 22 / 4+ | 高性能、邊緣運算友好 |
| **CAD 服務** | Python 3.13 + FastAPI | 3.13 / 0.115+ | 科學計算生態、ASGI 高性能 |
| **幾何核心** | PythonOCC (OpenCASCADE 7.8) | 7.8+ | 成熟的 B-Rep 幾何引擎 |
| **熱路徑加速** | Rust (PyO3 FFI) | 1.80+ | 關鍵運算性能優化 |
| **數據庫** | PostgreSQL 17 | 17+ | JSONB、GIS 支援 |
| **快取** | Redis 8 | 8+ | 協作狀態、命令佇列 |
| **對象存儲** | MinIO / S3 | — | 文件存儲、備份 |
| **AI LLM** | Claude / GPT-4 / 本地 LLaMA | — | 多模型支援、成本優化 |
| **容器化** | Docker + Docker Compose | — | 開發/部署一致 |

---

## 第十二章：結論與下一步

### 核心結論

1. **技術路線可行**：基於 PythonOCC (後端) + React Canvas2D (前端) + LLM (AI) 的架構在技術上成熟且可執行
2. **不建議直接移植 FreeCAD**：應從 Web 原生設計，避免舊架構債務
3. **AI CLI 是關鍵差異化**：自然語言 CAD 操作是市場空白點
4. **DWG 相容需分階段**：Phase 1-2 以 DXF 為主 + LibreDWG 讀取，Phase 3 評估商業 DWG 寫出方案

### 立即行動項（Next 30 天）

| # | 任務 | 負責人 | 交付物 |
|---|------|--------|--------|
| 1 | 搭建開發環境（Docker + PythonOCC + React 模板） | 後端工程師 | 可編譯的開發環境 |
| 2 | Canvas2D 2D 繪圖原型（LINE/CIRCLE/ARC） | 前端工程師 | 可操作的原型 |
| 3 | LibreDWG 讀取驗證測試 | CAD 工程師 | 測試報告（支援哪些 DWG 版本） |
| 4 | LLM 命令映射 PoC（50 個測試用例） | AI 工程師 | 準確率報告 |
| 5 | 領域詞彙表初版（土木工程 200+ 詞彙） | 土木顧問 + AI | 詞彙表 YAML |
| 6 | 內部 JSON 數據模型 v1 | 全團隊 | Schema 文檔 + 驗證器 |

---

## 第九章：測試與驗證策略（v2.0 新增）

### 9.1 測試分層架構

```
┌─────────────────────────────────────────────────┐
│              E2E Tests (Cypress)                 │
│         端到端流程：註冊 → 建立檔案 → 匯出         │
├─────────────────────────────────────────────────┤
│          Integration Tests (Jest + Pytest)       │
│   API 端點 × 資料庫 × DWG 解析 × 命令執行          │
├─────────────────────────────────────────────────┤
│            Unit Tests (Vitest / pytest)          │
│   每個函數 / 方法 / 組件獨立測試                    │
├─────────────────────────────────────────────────┤
│         Static Analysis (ESLint, Bandit)         │
│         程式碼規範、類型檢查、安全性掃描             │
└─────────────────────────────────────────────────┘
```

### 9.2 前端測試策略

| 層級 | 框架 | 覆蓋目標 | 執行時機 |
|------|------|---------|---------|
| Unit | Vitest + @testing-library/react | 所有 UI 組件、工具函數、選擇器 | 每次 commit |
| Integration | Vitest + React Testing Library | API 調用層、WebSocket 連線 | CI 每小時 |
| E2E | Cypress | 主要使用者旅程（註冊、編輯、匯出、分享） | 每次 PR |

**前端測試優先級規則**：
1. **P0（必須）**：所有公開 API、資料存取邏輯、使用者關鍵路徑
2. **P1（應該）**：UI 組件渲染、狀態管理、錯誤邊界
3. **P2（可選）**：動畫過渡、視覺細節、邊界條件

### 9.3 後端測試策略

| 層級 | 框架 | 覆蓋目標 | 執行時機 |
|------|------|---------|---------|
| Unit | pytest | 業務邏輯、CAD 命令執行器、文件解析 | 每次 commit |
| API | pytest + httpx | 所有 REST 端點（正/反向測試） | CI 每小時 |
| E2E | Playwright | 完整使用者流程（前端 + 後端） | 每次 release candidate |

**後端測試覆蓋率目標**：
- **核心業務邏輯**（CAD 命令、幾何運算）：≥ 90%
- **API 端點**：≥ 80%
- **工具函數**：≥ 70%
- **整體專案**：≥ 80%

### 9.4 CAD 特定測試：DXF/DWG 相容性

```yaml
test_dxf_dwg_compatibility:
  測試數據集:
    - 來源: "AutoCAD 官方 sample files (R12 到 2013)"
    - 規模: "100+ 文件，涵蓋 2D/3D、層、線型、註解"
    - 來源: "freeCad test suite (tests/imports/dxf_dwg)"
    - 規模: "50+ 文件，涵蓋邊界情況"
  
  驗證項目:
    - 讀取: 所有圖元類型正確解析（LINE, CIRCLE, ARC, LWPOLYLINE 等）
    - 寫出: 匯出的 DXF/R12 可在 AutoCAD 2018+ 中正確開啟
    - 精確度: 座標誤差 < 0.001 單位
    - 效能: 1000 圖元文件 < 5 秒讀取
  
  自動化:
    - 每次 commit 執行相容性測試
    - 失敗時標記 build red
    - 每月手動驗證 AutoCAD 新版本
```

### 9.5 CI/CD Pipeline

```yaml
ci_pipeline:
  stages:
    - name: lint
      commands:
        - npm run lint          # ESLint + Prettier
        - npm run typecheck     # TypeScript strict mode
        - bandit -r backend/    # Python 靜態分析
      
    - name: unit_tests
      commands:
        - npm run test:unit     # Vitest (前端)
        - pytest backend/ -v    # pytest (後端)
      
    - name: integration_tests
      commands:
        - docker-compose up -d  # 啟動 PostgreSQL + Redis
        - pytest backend/api/ -v  # API 整合測試
        - npm run test:integration  # 前端整合測試
      
    - name: dxf_dwg_compat
      commands:
        - python scripts/run_dxf_compat.py  # DXF 相容測試
        - python scripts/run_dwg_compat.py  # DWG 相容測試
      
    - name: e2e_tests
      commands:
        - npx cypress run --record  # 端到端測試
      
    - name: build
      commands:
        - npm run build
        - docker build -t freecivilcad/backend .
      
    - name: deploy_preview
      if: "branch == 'main'"
      commands:
        - vercel --target preview
```

### 9.6 測試數據管理

| 類別 | 內容 | 更新頻率 |
|------|------|---------|
| DXF 測試文件 | 100+ 檔案（來自 AutoCAD samples） | 每次 CAD 引擎更新 |
| DWG 測試文件 | 50+ 檔案（來自 LibreDWG tests） | 每次 LibreDWG 更新 |
| 命令測試用例 | 200+ 命令（基本 + 進階 + 錯誤） | 每次命令新增 |
| 效能基準數據 | 各規模文件的渲染/解析時間 | 每次重大變更 |

---

## 第十章：數據版本遷移策略（v2.0 新增）

### 10.1 數據版本化原則

```yaml
data_versioning:
  策略: "語義化版本（SemVer）"
  格式: "{project_id}/data/{name}.json (version: {major}.{minor}.{patch})"
  
  版本演進規則:
    major: 不相容的 schema 變更（需要遷移腳本）
    minor: 新增欄位，向後相容（舊版本可忽略）
    patch: 修復 bug，向後相容（舊版本可安全讀取）
```

### 10.2 遷移機制

```typescript
// 範例：版本檢測與自動遷移
interface DocumentSchema {
  version: string;       // 文件版本 "1.0.0"
  created_at: number;
  migrated_from?: string; // 遷移來源版本
  data: any;
}

function migrateDocument(doc: DocumentSchema): DocumentSchema {
  const from = doc.migrated_from || doc.version;
  const to = CURRENT_SCHEMA_VERSION;
  
  // 執行所有中間版本的遷移腳本
  while (compareVersions(from, to) < 0) {
    const next = incrementMinor(from);
    const migrator = MIGRATORS.get(from, next);
    if (migrator) {
      doc.data = migrator(doc.data);
      doc.migrated_from = next;
    } else {
      throw new Error(`No migrator for ${from} → ${next}`);
    }
  }
  return doc;
}
```

### 10.3 遷移腳本管理

```yaml
migration_scripts:
  位置: "backend/migrations/"
  命名規則: "{from_version}__to_{to_version}.py"
  
  範例:
    - 1.0.0__to_1.1.0.py: 新增 "layers" 欄位，預設為空陣列
    - 1.1.0__to_2.0.0.py: 重構 "entities" 結構，從陣列變為物件
  
  執行機制:
    - 啟動時自動檢測需要遷移的文件
    - 增量執行，不覆蓋原始資料
    - 遷移日誌記錄到 migration_log 集合
    - 支援回滾（保留舊版 schema 30 天）
```

### 10.4 Schema 驗證

```typescript
// JSON Schema 驗證所有文件
const documentSchema = require('./schemas/document_v1.json');
const ajv = new Ajv();
const validate = ajv.compile(documentSchema);

function validateDocument(doc: any): boolean {
  const valid = validate(doc);
  if (!valid) {
    logger.warn('Schema validation failed', { errors: validate.errors });
    return false;
  }
  return true;
}
```

---

## 第十一章：API 版本控制策略（v2.0 新增）

### 11.1 版本控制方法

```
策略: URL 路徑版本化（最明確、最易於除錯）

範例:
  /api/v1/documents        — v1 文件 API
  /api/v1/commands         — v1 命令 API
  /api/v2/documents        — v2 文件 API（不相容變更）
```

### 11.2 API 兼容性原則

| 變更類型 | 是否相容 | 版本處理 |
|---------|---------|---------|
| 新增可選欄位 | ✅ 向後相容 | minor 版本，無需新 API 版本 |
| 移除欄位 | ❌ 不相容 | major 版本，保留舊版 12 個月 |
| 新增端點 | ✅ 向後相容 | minor 版本，無需新 API 版本 |
| 修改端點行為 | ❌ 不相容 | major 版本，提供 migration guide |
| 修改請求參數（新增） | ✅ 向後相容 | minor 版本 |
| 修改請求參數（移除） | ❌ 不相容 | major 版本 |

### 11.3 API 回應格式

```json
{
  "data": { ... },
  "meta": {
    "version": "1.0.0",
    "deprecated": false,
    "next_url": "/api/v2/documents/{id}",
    "migration_guide": "/docs/migrations/v1-to-v2"
  },
  "links": {
    "self": "/api/v1/documents/123",
    "versions": "/api/versions"
  }
}
```

### 11.4 版本生命周期

```
版本狀態:
  active    — 支援新功能，維護中
  deprecated — 不再發展，僅安全修復，12 個月後刪除
  removed   — 已從服務器移除，保留 API 回應 410 Gone

過渡期:
  通知: 棄用前 6 個月發送郵件 + API 回應標頭
  緩衝期: 棄用到刪除至少 12 個月
  測試: 每個 major 版本在 beta 環境預先測試 1 個月
```

### 11.5 API 測試策略

```yaml
api_versioning_tests:
  每次 API 變更:
    - 執行所有 v1 端點回歸測試
    - 驗證 v1 回應格式未變更
    - 測試 v2 端點新功能
    - 確認版本標頭正確回應
  
  每個月:
    - 手動測試已棄用端點
    - 確認棄用通知已發送
    - 更新 API 文件
```

---

## 第十二章：結論與下一步

### 核心結論

1. **技術路線可行**：基於 PythonOCC (後端) + React Canvas2D (前端) + LLM (AI) 的架構在技術上成熟且可執行
2. **不建議直接移植 FreeCAD**：應從 Web 原生設計，避免舊架構債務
3. **AI CLI 是關鍵差異化**：自然語言 CAD 操作是市場空白點
4. **DWG 相容需分階段**：Phase 1-2 以 DXF 為主 + LibreDWG 讀取，Phase 3 評估商業 DWG 寫出方案

### 立即行動項（Next 30 天）

| # | 任務 | 負責人 | 交付物 |
|---|------|--------|--------|
| 1 | 搭建開發環境（Docker + PythonOCC + React 模板） | 後端工程師 | 可編譯的開發環境 |
| 2 | Canvas2D 2D 繪圖原型（LINE/CIRCLE/ARC） | 前端工程師 | 可操作的原型 |
| 3 | LibreDWG 讀取驗證測試 | CAD 工程師 | 測試報告（支援哪些 DWG 版本） |
| 4 | LLM 命令映射 PoC（50 個測試用例） | AI 工程師 | 準確率報告 |
| 5 | 領域詞彙表初版（土木工程 200+ 詞彙） | 土木顧問 + AI | 詞彙表 YAML |
| 6 | 內部 JSON 數據模型 v1 | 全團隊 | Schema 文檔 + 驗證器 |

---

> **報告結束**
>
> 此文件為 freeCivilcad 產品的初始規劃與技術架構設計。
> 所有技術決策均基於 FreeCAD 架構分析報告（`research/freecad_analysis.md`）的發現。
>
> **下次迭代建議**：根據 Phase 0 驗證結果調整技術決策。
>
> **v2.0 更新記錄**：
> - 新增第九章：測試與驗證策略（Unit/Integration/E2E/CI-CD/DXF-DWG 相容性測試）
> - 新增第十章：數據版本遷移策略（SemVer、遷移腳本、Schema 驗證）
> - 新增第十一章：API 版本控制策略（URL 版本化、兼容性原則、生命周期管理）
> - 更新第七章 Phase 0：加入 OpenCASCADE WASM 編譯驗證明確驗收標準

