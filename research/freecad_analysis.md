# FreeCAD 架構分析報告

> 分析對象：[FreeCAD/FreeCAD](https://github.com/FreeCAD/FreeCAD) 開源專案
> 分析日期：2026-05-27
> 分析版本：shallow clone (depth 1)

---

## 一、整體架構

FreeCAD 是一個基於模組化的 3D CAD 軟體，核心由 C++ 編寫，並透過 Python 提供擴充能力。

### 1.1 核心目錄結構

| 路徑 | 說明 |
|------|------|
| `src/App/` | 核心 C++ 引擎：資料模型、文件管理、屬性系統、幾何特徵 |
| `src/Gui/` | Qt 使用者介面引擎：命令系統、Python 繫結、視圖提供器 |
| `src/Main/` | 程式入口點：CLI (`MainCmd.cpp`)、GUI (`MainGui.cpp`)、Python (`MainPy.cpp`) |
| `src/Mod/` | Python 模組目錄：所有功能模組（Draft, BIM, Part, TechDraw 等） |
| `src/Web/` | Web 模組：內建 HTTP/WebSocket 伺服器 |

### 1.2 核心 C++ 模組（`src/App/`）

| 檔案 | 功能 |
|------|------|
| `Application.cpp` | FreeCAD 應用主程序，初始化管理 |
| `Document.cpp` | 文件管理：創建、保存、加載、版本控制 |
| `DocumentObject.cpp` | 文檔對象基類：所有 CAD 實體的父類 |
| `FeaturePython.cpp` | Python 特性繫結：允許 Python 控制 C++ 對象 |
| `Property*.cpp` | 屬性系統：動態屬性、表達式引擎、單位系統 |
| `Expression*.cpp` | 參數化表達式解析器 |
| `Material.cpp` | 材料管理 |
| `Services.cpp` | 服務層：文件 I/O、控制台橋接 |

### 1.3 GUI C++ 模組（`src/Gui/`）

| 檔案 | 功能 |
|------|------|
| `Command*.cpp` | 命令系統：GUI 命令、宏記錄、命令行解析 |
| `Document.cpp` | GUI 文檔管理器 |
| `ViewProvider*.cpp` | 視圖提供器：3D 場景渲染 |
| `MainWindow.cpp` | 主窗口：菜單、工具列、面板 |

---

## 二、可移除模組與關鍵模組分析

### 2.1 可移除模組（Removable Modules）

以下模組可根據需求移除而不影響核心 CAD 功能：

| 模組 | 路徑 | 說明 | 移除風險 |
|------|------|------|----------|
| `AddonManager` | `src/Mod/AddonManager` | 外掛管理介面 | 低 |
| `CAM` | `src/Mod/CAM` | 計算機數控加工 | 中 |
| `Cloud` | `src/Mod/Cloud` | 雲端服務集成 | 低 |
| `Fem` | `src/Mod/FEM` | 有限元分析 | 中 |
| `Help` | `src/Mod/Help` | 在線幫助 | 低 |
| `Inspection` | `src/Mod/Inspection` | 檢測模組 | 低 |
| `JtReader` | `src/Mod/JtReader` | JT 格式讀取器 | 低 |
| `Material` | `src/Mod/Material` | 材料庫 | 低 |
| `Measure` | `src/Mod/Measure` | 測量工具 | 低 |
| `Mesh` | `src/Mod/Mesh` | 網格處理 | 低 |
| `MeshPart` | `src/Mod/MeshPart` | 網格零件 | 低 |
| `OpenSCAD` | `src/Mod/OpenSCAD` | OpenSCAD 接口 | 低 |
| `Plot` | `src/Mod/Plot` | 繪圖/圖表 | 低 |
| `Points` | `src/Mod/Points` | 點雲處理 | 中 |
| `ReverseEngineering` | `src/Mod/ReverseEngineering` | 逆向工程 | 中 |
| `Robot` | `src/Mod/Robot` | 機器人模擬 | 低 |
| `Show` | `src/Mod/Show` | 演示/展示 | 低 |
| `Spreadsheet` | `src/Mod/Spreadsheet` | 試算表 | 低 |
| `Start` | `src/Mod/Start` | 啟動頁面 | 低 |
| `Surface` | `src/Mod/Surface` | NURBS 曲面 | 中 |
| `TemplatePyMod` | `src/Mod/TemplatePyMod` | 模板模塊 | 低 |
| `Test` | `src/Mod/Test` | 測試框架 | 低 |

### 2.2 關鍵模組（Critical Modules）

以下模組為核心 CAD 功能，不可移除：

| 模組 | 路徑 | 說明 |
|------|------|------|
| `App` (C++) | `src/App` | 核心數據模型引擎 |
| `Gui` (C++) | `src/Gui` | 核心 UI 引擎 |
| `Part` | `src/Mod/Part` | 參數化 3D 幾何建模 |
| `PartDesign` | `src/Mod/PartDesign` | 零件設計：拉伸、旋轉、倒角 |
| `Sketcher` | `src/Mod/Sketcher` | 草圖繪製：約束、尺寸驅動 |
| `TechDraw` | `src/Mod/TechDraw` | 技術圖紙：工程圖輸出 |
| `Draft` | `src/Mod/Draft` | 2D 繪圖工具 |
| `BIM` (Arch) | `src/Mod/BIM` | 建築資訊模型（IFC 支持） |
| `Import` | `src/Mod/Import` | 文件格式導入框架 |

---

## 三、AutoCAD 兼容性分析

### 3.1 DWG 支持

FreeCAD 透過 `Draft` 模組提供 AutoCAD DWG 文件格式導入：

- **文件位置**：`src/Mod/Draft/importDWG.py`
- **支援格式**：DWG（需外部引擎）、DXF（原生支持）
- **依賴**：DWG 導入通常需要第三方引擎（如 LibreDwg 或 Teigha File Format Toolkit）

### 3.2 DXF 支持

- **文件位置**：`src/Mod/Draft/importDXF.py`
- **支援等級**：原生支持，無需外部依賴
- **功能**：讀取 2D 矢量圖形、圖層、線條類型、文字

### 3.3 兼容性限制

| 項目 | 狀態 |
|------|------|
| DWG 讀取 | 需要外部引擎（LibreDwg 或 Teigha） |
| DWG 寫入 | 不直接支持，可通過 DXF 轉換 |
| DXF 讀取/寫入 | 原生支持 |
| 參數化特徵保留 | 不支持（AutoCAD 參數化特徵會轉為幾何圖元） |
| 區塊（Block） | 部分支持 |
| 樣式（文字、線型） | 部分支持 |

### 3.4 BIM/IFC 支持

- **文件位置**：`src/Mod/BIM/ArchIFC.py`
- **支援標準**：IFC4、IFC2x3
- **功能**：建築資訊模型導入/導出，支持建築物、牆體、樓板等 IFC 對象
- **應用場景**：BIM 工作流、OpenBIM 標準

---

## 四、Web / Chrome 瀏覽器能力

### 4.1 內建 Web 伺服器

FreeCAD 包含內建 HTTP/WebSocket 伺服器，允許 Web 瀏覽器直接訪問：

- **文件位置**：`src/Mod/Web/App/Server.cpp`
- **技術棧**：基於 Qt Network 模組
- **功能**：
  - HTTP 伺服器：提供 Web API 和靜態資源
  - WebSocket：支持即時通訊
  - RESTful API：文檔操作、幾何查詢

### 4.2 Web 模組結構

| 文件 | 功能 |
|------|------|
| `Server.cpp` | HTTP/WebSocket 伺服器實現 |
| `Server.h` | 伺服器頭文件 |
| `Init.py` | Python 初始化腳本 |
| `AppWeb.cpp` | Web 應用接口 |

### 4.3 修改為 Web 原生應用所需工作

若要將 FreeCAD 從桌面應用改造為 Web 原生應用，需要以下工作：

| 工作領域 | 估計規模 |
|----------|----------|
| 前端重寫（Qt → Web UI） | 大型：需重寫整個 GUI 層（`src/Gui/`） |
| 3D 渲染（OpenCASCADE → WebGL/Three.js） | 大型：OpenCASCADE 無原生 Web 支持，需移植或替代 |
| Python 後端（Qt Network → 現代 Web 框架） | 中型：需重寫 Web 模組（`src/Mod/Web`） |
| 數據同步（文件 I/O → 雲端存儲） | 中型：需新增雲端接口 |
| 擴展插件生態（Qt 外掛 → Web 擴展） | 大型：需重新設計插件系統 |

**總結**：從桌面應用到 Web 原生應用，估計需要 **6-12 個月** 的重構工作，主要由前端和 3D 渲染層的重寫驅動。

---

## 五、AI / CLI 自動化潛力

### 5.1 命令行接口（CLI）

FreeCAD 提供完整的命令行接口，支持無頭操作：

- **文件位置**：`src/Main/MainCmd.cpp`
- **功能**：
  - 無頭模式運行：`freecad --console`
  - 執行腳本：`freecad -c script.py`
  - 文件轉換：`freecad input.FCSTD -o output.DWG`
  - 批處理：支持批量文件處理

### 5.2 Python API 自動化

FreeCAD 提供豐富的 Python API，適合 AI/自動化場景：

| API 層 | 文件位置 | 功能 |
|--------|----------|------|
| 文檔管理 | `src/App/DocumentPyImp.cpp` | 創建、加載、保存文檔 |
| 特性操作 | `src/App/FeaturePython.cpp` | 創建和操作幾何特性 |
| 屬性控制 | `src/App/PropertyPythonObject.cpp` | 讀寫參數化屬性 |
| 表達式引擎 | `src/App/Expression.cpp` | 參數化約束和表達式 |
| GUI 命令 | `src/Gui/CommandPyImp.cpp` | 執行 GUI 命令 |

### 5.3 AI 整合潛力

| 場景 | 可行性 | 說明 |
|------|--------|------|
| 自然語言轉 CAD 命令 | 高 | 透過 Python API 映射 LLM 輸出到 FreeCAD 操作 |
| 語義草圖理解 | 中 | 結合 CV 模型分析手繪草圖並生成幾何圖元 |
| 參數化優化 | 中 | 利用優化算法自動調整設計參數 |
| 批量文件轉換 | 高 | CLI 已支持，可與 AI 工作流集成 |
| 生成式設計 | 中 | 結合參數化建模和生成算法自動生成幾何 |

### 5.4 自動化示例架構

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   AI Engine  │────│ FreeCAD CLI  │────│  CAD Engine  │
│  (LLM / CV)  │────│ (Python API) │────│ (OpenCASCADE)│
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## 六、技術債務與瓶頸

### 6.1 已知技術債務

| 領域 | 問題 | 影響 |
|------|------|------|
| OpenCASCADE 依賴 | 幾何核心依賴開源但維護活躍的 OpenCASCADE | 中：穩定性取決於 OCCT 版本 |
| Qt 版本兼容性 | 需兼容多個 Qt 版本（5.x, 6.x） | 中：編譯複雜度高 |
| 插件系統 | 舊式插件系統與現代插件架構不匹配 | 中：擴展性受限 |
| Python 繫結 | PyBind11/CMake 繫結過程複雜 | 低：開發者體驗不佳 |
| 文檔不足 | 部分核心 API 缺少文檔 | 中：學習曲線陡峭 |

### 6.2 性能瓶頸

| 場景 | 瓶頸 | 建議 |
|------|------|------|
| 大型組裝體 | 幾何計算耗時 | 利用 OpenCASCADE 並行計算 |
| 3D 渲染 | 場景圖表效率 | 考慮引入 VTK 或現代渲染後端 |
| 文件 I/O | 大文件加載/保存 | 優化序列化格式，引入增量保存 |
| 表達式引擎 | 複雜約束求解 | 優化表達式解析和求解算法 |

---

## 七、總結與建議

### 7.1 架構評估

| 維度 | 評分 (1-10) | 說明 |
|------|-------------|------|
| 模組化程度 | 9 | 清晰的 C++/Python 分離，模組化設計良好 |
| 擴展性 | 8 | Python API 豐富，插件生態活躍 |
| 自動化潛力 | 9 | CLI 和 Python API 支持完善的自動化 |
| Web 兼容性 | 4 | 內建 Web 伺服器存在，但前端/渲染需重構 |
| AutoCAD 兼容 | 6 | DXF 支持良好，DWG 需外部引擎 |
| AI 整合友好度 | 8 | Python API 適合與 AI 引擎集成 |

### 7.2 建議路線

1. **短期（1-3 個月）**：利用 CLI 和 Python API 建立自動化管道，實現文件轉換和批處理。
2. **中期（3-6 個月）**：開發 AI 插件，整合自然語言輸入和語義理解。
3. **長期（6-12 個月）**：若需 Web 原生應用，評估移植 OpenCASCADE 到 WebGL 或採用替代方案（如 three.js + 幾何服務器）。

---

*報告生成：AI Research Agent*
*日期：2026-05-27*
