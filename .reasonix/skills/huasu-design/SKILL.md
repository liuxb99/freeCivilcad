---
name: huasu-design
description: 華塑設計 — 科技工程風設計語言（藍紫深色主題），適用於 CAD/工程/技術類產品
---

# hua su-design（華塑設計）

科技工程風設計語言 — 適用於 CAD / 工程 / 基礎建設 / 技術類產品。

## 設計哲學

- **精準**：工程軟體的本質，每個間距、顏色、字級都有數學感
- **冷靜**：低飽和度的科技藍紫配色，讓使用者長時間工作不疲勞
- **專業**：俐落的幾何線條、剋制的動畫過渡、清晰的資訊層級

## 色彩系統

### 主色調（深色基底）
```
--bg-primary:   #0a0e1a    /* 最深底色 */
--bg-secondary: #111827    /* 次要背景／卡片 */
--bg-tertiary:  #1a2332    /*  hover/突顯區塊 */
--bg-surface:   #1e293b    /* 面板／輸入框 */
--border:       #2d3a50    /* 邊界線 */
```

### 強調色（藍紫漸層）
```
--accent-blue:   #3b82f6    /* 主要強調 — 藍 */
--accent-purple: #8b5cf6    /* 次要強調 — 紫 */
--accent-cyan:   #06b6d4    /* 輔助強調 — 青 */
--gradient:      linear-gradient(135deg, #3b82f6, #8b5cf6)  /* 漸層主軸 */
```

### 文字色階
```
--text-primary:   #f1f5f9    /* 主文字 */
--text-secondary: #94a3b8    /* 次要文字 */
--text-tertiary:  #64748b    /* 輔助說明 */
--text-link:      #60a5fa    /* 鏈結 */
```

### 語意色
```
--success: #22c55e   /* 成功/連線 */
--warning: #f59e0b   /* 警告 */
--error:   #ef4444   /* 錯誤 */
--info:    #3b82f6   /* 資訊 */
```

## 排版

- 字型：`'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`
- 等寬字型：`'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace`
- 字級階梯：12 / 13 / 14 / 16 / 18 / 20 / 24 / 32 / 42 / 56 px
- 行高：標題 1.2，正文 1.6，小字 1.4
- 字重：Regular 400, Medium 500, Semibold 600, Bold 700

## 間距系統（4px 基數）

```
space-1: 4px    space-2: 8px    space-3: 12px   space-4: 16px
space-5: 20px   space-6: 24px   space-8: 32px   space-10: 40px
space-12: 48px  space-16: 64px  space-20: 80px  space-24: 96px
```

## 圓角

```css
--radius-sm:  6px     /* 按鈕、輸入框 */
--radius-md:  10px    /* 卡片 */
--radius-lg:  16px    /* 模態框、大區塊 */
--radius-xl:  24px    /* 特殊 Hero */
--radius-full: 9999px /* Badge、頭像 */
```

## 陰影

```css
--shadow-sm:   0 1px 3px rgba(0,0,0,0.3)
--shadow-md:   0 4px 12px rgba(0,0,0,0.4)
--shadow-lg:   0 8px 30px rgba(0,0,0,0.5)
--shadow-glow: 0 0 20px rgba(59,130,246,0.3)  /* 藍色輝光 */
```

## 動畫

- 過渡：`150ms ease`（hover/focus），`300ms ease`（進出場）
- 不建議使用誇張彈跳或延遲動畫
- loading 使用簡潔的 pulse / spin，不用 skeleton 以外的複雜動畫

## 圖示風格

- 使用 SVG 線條圖示（stroke-width: 1.5-2），不用 filled 風格
- 圖示尺寸統一：16 / 20 / 24 / 32 px
- 顏色繼承當前文字色或強調色

## 設計模式

### Hero 區（Landing Page）
- 全寬深色背景 + 幾何網格/線條裝飾
- 大標題使用漸層藍紫文字
- CTA 按鈕使用漸層 background + 輕微 glow shadow

### 卡片區
- 均勻間距的 grid 佈局
- 卡片 hover 時輕微上移（translateY(-4px)）+ border 顏色變亮
- 左上角可選用小型圖示 + 標題

### 分隔線
- 使用半透明漸層線（transparent -> accent -> transparent）替代實線

### 程式碼區塊
- 深色背景（bg-tertiary）
- 等寬字型
- 左上角可選語言 label
