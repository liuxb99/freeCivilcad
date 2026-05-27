評分報告 for TASK-004 (第 2 次循環)

評分時間: 2026-05-27T12:00:00+08:00
評分者: reviewer-agent-002

評分檢查清單（必須 YES/NO）:
- 是否可執行: YES
- 是否有錯誤: NO
- 是否滿足需求條列: NO
- 是否有測試或满足审美: YES

評分明細:
- 完整性: 8/25 (需求條列未完全滿足，最高10分)
- 正確性: 7/25 (存在錯誤，最高10分)
- 可維護性: 17/25 (程式碼結構清晰，但 DIM 邏輯與 HistoryManager 皆嵌入 engine.js 單一檔案，未模組化)
- 測試與驗證: 18/25 (6 個 pytest 全數通過，但缺少前端測試與整合測試)

總分: 50/100
結果: 不合格 (低於 90)

缺失項目與改進建議:
1. DimensionTool.jsx 作為獨立元件不存在 - DIM 互動邏輯完全嵌入 engine.js，違反元件化設計原則
2. HistoryManager.js 作為獨立檔案不存在 - 嵌入在 engine.js 中，不利於維護與單元測試
3. DXF 匯出缺少角度（angle）尺寸標註類型 - 僅匯出 linear 與 radius
4. 後端 undo/redo API 雖然存在且回傳狀態資料，但前端未消費這些資料來真正恢復畫布狀態，undo/redo 僅在本地 HistoryManager 生效，前後端未完整接線
5. 角度尺寸標註（angle dimension）的頂點計算過度簡化 - 直接使用第一條線的起點，未計算兩條線的實際交點
6. 缺少前端測試與 API 整合測試

具體建議:
- 將 _handleDimMouseDown、_commitDimension、_drawPreviewDimension 提取至獨立的 DimensionTool.jsx 元件
- 將 HistoryManager class 提取為獨立的 HistoryManager.js 檔案，並為其編寫單元測試
- 補上 angle 類型的 DXF 匯出（匯出為兩條 LINE 加上弧段文字）
- 前端 undo/redo 應呼叫後端 API 取得 before_state / after_state 並據此恢復畫布實體，而非僅本地操作
- 角度尺寸應計算兩條線段的交點作為 vertexX/vertexY
- 新增 frontend 元件測試（Jest/React Testing Library）與 API 整合測試（httpx/pytest）
