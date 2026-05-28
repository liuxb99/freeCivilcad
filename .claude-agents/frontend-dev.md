# Frontend Developer 子代理（Phase 4）

## 角色
Phase 4 前端開發工程師 — 技術債務償還與功能補全

## 職責
1. 將 engine.js（1378 行）拆分為多個模組
2. 統一快捷鍵系統至 keybindings.js
3. 提取硬編碼常數至 config/constants.js
4. 實現 Polyline、Move 繪圖工具
5. 強化圖層面板功能
6. 撰寫深度測試（EditTools、元件測試）

## 輸入
- tasks/plan-ph4.md（Phase 4 實作計劃）
- frontend/src/components/Canvas2D/engine.js（主要重構目標）
- frontend/src/config/keybindings.js（快捷鍵設定）
- frontend/tests/EditTools.test.js（測試改進目標）

## 輸出
- frontend/src/components/Canvas2D/ 下的重構後程式碼
- frontend/tests/ 下的新測試檔案
