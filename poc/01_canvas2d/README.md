# freeCivilcad Canvas2D POC

## 概述

這是一個 2D 繪圖原型，可在瀏覽器中繪製 LINE / CIRCLE / ARC 圖元，並支援選取、移動、縮放功能。純 JavaScript 實作，無需任何框架。

## 快速開始

1. 直接在瀏覽器中開啟 `index.html` 即可運行
2. 支援 Chrome 90+、Firefox 90+、Edge 90+

## 功能說明

### 工具列

| 工具 | 快速鍵 | 說明 |
|------|--------|------|
| 選取 | V | 點擊選取圖元，拖曳移動圖元 |
| 直線 | L | 點擊起點，再點擊終點繪製直線 |
| 圓 | C | 點擊圓心，拖曳設定半徑繪製圓 |
| 弧線 | A | 點擊圓心，拖曳設定半徑與角度繪製弧線 |
| 平移 | H | 拖曳平移畫布 |

### 視窗操作

- **滾輪縮放**：以滑鼠位置為中心的無級縮放
- **中鍵拖曳**：直接平移畫布
- **縮放按鈕**：工具列上的 + / - / 1:1 按鈕
- **網格開關**：切換背景網格顯示

### 圖元操作

- **選取**：點擊圖元即可選取，選取時顯示虛線選取框和控制點
- **移動**：選取後拖曳即可移動
- **刪除**：選取圖元後按 Delete / Backspace，或點擊右側面板的刪除按鈕

### 右側屬性面板

選取圖元後會顯示屬性面板，包含圖元 ID、類型、幾何參數等資訊。

### 底部狀態列

即時顯示滑鼠座標、目前工具和操作提示。

## 圖元資料結構

```typescript
interface Entity {
  type: 'LINE' | 'CIRCLE' | 'ARC';
  id: number;
  layer: string;
  color: string;
  lineWidth: number;
  // LINE
  x1?: number; y1?: number; x2?: number; y2?: number;
  // CIRCLE / ARC
  cx?: number; cy?: number; radius?: number;
  // ARC
  startAngle?: number; endAngle?: number;
}
```

## 內部 JSON 模型格式（規劃）

```json
{
  "version": "1.0",
  "layers": [
    { "id": "0", "name": "Default", "visible": true, "locked": false }
  ],
  "entities": [
    { "type": "LINE", "id": 1, "layer": "0", "color": "#f38ba8", "x1": 0, "y1": 0, "x2": 5, "y2": 5 }
  ],
  "views": [
    { "id": "view-1", "zoom": 1, "panX": 0, "panY": 0, "tool": "select" }
  ]
}
```

## 技術細節

### 碰撞檢測

- **直線**：點到線段的距離
- **圓**：點到圓心的距離與半徑的差值
- **弧線**：點到圓弧的距離（考慮角度範圍）

容差：8px / zoom 因子

### 座標系統

- 邏輯單位：1 單位 = 1 grid cell
- 螢幕單位：logicalPos * zoom * gridSize + panOffset
- 網格大小：20 像素（未縮放時）

### 選取邏輯

```
1. 將螢幕座標轉換為世界座標
2. 從後向前遍歷圖元陣列（後繪制的優先）
3. 對每個圖元執行對應的碰撞檢測
4. 若距離小於閾值則命中
```

## 未來擴充方向

- [ ] 圖層系統（多層切換、顯示/隱藏、鎖定）
- [ ] 圖元編輯（縮放、旋轉、複製、貼上）
- [ ] 儲存/載入（JSON 匯出匯入）
- [ ] 撤销/重做（歷史記錄）
- [ ] 更多圖元類型（多段線、多貝茲曲線、文字）
- [ ] 尺寸標註
- [ ] 選取框選（拖曳矩形選取多個圖元）
- [ ] 縮圖/總覽面板
- [ ] 列印輸出
