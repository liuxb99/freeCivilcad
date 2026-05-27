# TASK-004 Phase 2 功能強化

## Status
退回

## 目標
在 Phase 1 MVP 基礎上強化三項核心功能：尺寸標註、Undo/Redo 命令記錄、Docker 化部署，並修復 REVIEWER 發現的臭蟲。

## 範圍

### P0 必須
1. **尺寸標註** — 線性標註（兩點間距離）、半徑標註（圓/弧）、角度標註（兩線夾角）
2. **Undo/Redo 強化** — 後端命令記錄（不僅前端）、跨 session 復原
3. **臭蟲修復** — CIRCLE NaN（`geometry.r` vs `radius`）、CommandInput stale closure、id 型別不一致
4. **Docker 部署** — `docker-compose.yml` 一鍵啟動前後端

### P1 建議
5. **更多 DXF 圖元** — 支援 DIMENSION、HATCH、SPLINE
6. **右鍵選單** — 在 Canvas 上按右鍵顯示快捷操作

## 起始日期
2026-05-27

## Current Score
39

## Rework Count
1

## Review Reports
- tasks/reviews/review_TASK-004_1.md (score 39, 退回)
- tasks/reviews/review_TASK-004_2.md (score 50, 退回)
- tasks/reviews/review_TASK-004_3.md (score 92, 合格)

## Rework History
- 第1次循環: 評分39，檢查清單: 可執行=YES, 有錯誤=NO(有錯誤), 滿足需求=NO, 有測試=NO。主要缺失：DIM 工具缺少滑鼠事件處理、後端 undo/redo API 不完整、Command Log 未接線
- 第2次循環: 評分50，檢查清單: 可執行=YES, 有錯誤=NO(有錯誤), 滿足需求=NO, 有測試=YES。主要缺失：DimensionTool/HistoryManager 未獨立、angle DXF 未匯出、前端 undo/redo 未消費後端資料、角度頂點計算簡化、缺前端與整合測試
- 第3次循環: 評分92，檢查清單: 全部 YES ✅。返工項目：HistoryManager 獨立化、DimensionTool 獨立化、angle DXF 匯出、角度頂點交點計算、前端 undo/redo 後端接線、前端測試 17 項

## Final Score
92/100 ✅
