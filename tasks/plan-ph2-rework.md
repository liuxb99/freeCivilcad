# Phase 2 返工計畫（第 1 次返工）

> 生成時間: 2026-05-27T16:35:00+08:00
> 對應任務: TASK-004（第 1 次返工）
> 前一評分: **39/100** ❌ 不合格
> 評分報告: `tasks/reviews/review_TASK-004_1.md`

---

## 1. 返工目標

將 TASK-004 從 39 分提升至 **90 分以上**。根據評分檢查清單，必須通過以下四項：

| 檢查項目 | 當前 | 目標 | 關鍵行動 |
|----------|:----:|:----:|----------|
| 是否可執行 | YES | YES | 維持即可（目前可啟動） |
| 是否有錯誤 | **NO** | **YES** | 修復 DIM 無滑鼠事件、補齊後端 API、Command Log 接線 |
| 是否滿足需求 | **NO** | **YES** | 完成所有 PH2 功能點 |
| 是否有測試 | **NO** | **YES** | 至少加 command_log.py 測試 |

---

## 2. 返工作項分解

### RWK-001：DIM 工具互動繪製（核心缺口，影響完整性 13 分 + 正確性 18 分）

**評分報告指出**：`engine.js` 第 614 行 `_onMouseDown` 無 `dim` 分支，導致 DIM 工具完全無法互動。

**實作要求**：

| 子項 | 描述 | 難度 | 預估檔案 |
|:----:|------|:----:|----------|
| 1a | `_dimState` machine 初始化（`_startDim()`）：儲存 `dimType`、`points[]`、`step` | ★★☆ | `engine.js` ~第 500 行 |
| 1b | `_onMouseDown` 新增 `'dim'` 分支：依 `dimState.step` 分派到三個流程 | ★★★ | `engine.js` ~第 614 行 |
| 1c | 線性標註流程：step0 記錄起點 → step1 記錄終點 → step2 移動決定 offset → 產生實體 | ★★★ | `engine.js` |
| 1d | 半徑標註流程：點選圓/弧 → `_hitTestEntity` 檢查 → 自動計算 → 產生實體 | ★★★ | `engine.js` |
| 1e | 角度標註流程：點選第一條線 → 點選第二條線 → 計算夾角 → 產生實體 | ★★★ | `engine.js` |
| 1f | `_onMouseMove` 繪製預覽線（即時反饋） | ★★☆ | `engine.js` |
| 1g | ESC 取消繪製、右鍵取消、Enter 確認 | ★☆☆ | `engine.js` |

**狀態機設計**：

```js
// 初始化
_dimState = null;

// 開始標註
_startDim(dimType) {
  this._dimState = { dimType, step: 0, points: [], tempEntity: null };
  this.emit('status', `點選 ${dimTypeDesc} 標註位置...`);
}

// _onMouseDown
if (this._tool === 'dim') {
  if (!this._dimState) return;
  switch (this._dimState.dimType) {
    case 'linear': this._dimLinearMouseDown(e); break;
    case 'radius': this._dimRadiusMouseDown(e); break;
    case 'angle':  this._dimAngleMouseDown(e);  break;
  }
}
```

**線性標註偽代碼**：
```
step 0: 記錄 p1 = {x, y}, step = 1, status = "點選終點"
step 1: 記錄 p2 = {x, y}, step = 2, status = "移動決定偏移距離"
step 2: 計算 mid = midpoint, 計算 offset = distance to cursor
        產生 DIMENSION(dimType=linear, x1=p1.x, y1=p1.y, x2=p2.x, y2=p2.y, offset=offset)
        pushEntity() → 重置 dimState = null
```

**半徑標註偽代碼**：
```
step 0: 點選 → hitTest → 若 type === 'CIRCLE' | 'ARC'
        計算 radius = geometry.radius
        產生 DIMENSION(dimType=radius, cx, cy, radius, leaderAngle=atan2)
        若 type 不是圓/弧 → status = "請點選圓或弧"
```

**角度標註偽代碼**：
```
step 0: 點選 → hitTest → 若 type === 'LINE', 記錄 lineA
        step = 1, status = "點選第二條線"
step 1: 點選 → hitTest → 若 type === 'LINE', 記錄 lineB
        計算夾角 angle = 計算 lineA.dir 與 lineB.dir 的夾角
        產生 DIMENSION(dimType=angle, vertexX, vertexY, angleStart, angleEnd, arcRadius=30)
```

---

### RWK-002：後端 undo/redo API 補全（影響完整性 +5 分）

**評分報告指出**：缺少 `POST /api/commands/undo`、`POST /api/commands/redo`、`GET /api/commands/replay/{session}`。

| 子項 | 描述 | 主要檔案 |
|:----:|------|----------|
| 2a | `command_log.py` 新增 `undo()`, `redo()`, `replay(session_id)` | `backend/app/services/command_log.py` |
| 2b | `canvas.py` 新增 undo/redo/replay 路由 | `backend/app/routers/canvas.py` |
| 2c | undo: 從記憶體 buffer 取出最後一條 command，回退到 before_state | - |
| 2d | redo: 從 undo stack 取出，還原到 after_state | - |
| 2e | replay: 按時間順序重放某 session 所有 commands | - |

**command_log.py 擴充方法**：

```python
class CommandLog:
    def __init__(self):
        self._commands: list[CommandRecord] = []
        self._undo_stack: list[CommandRecord] = []  # 新增：undo 用
        self._redo_stack: list[CommandRecord] = []  # 新增：redo 用
        self._init_db()

    def add(self, cmd: CommandRecord) -> str:
        self._commands.append(cmd)
        self._undo_stack.append(cmd)
        self._redo_stack.clear()  # 新操作清空 redo
        self._db_insert(cmd)
        return cmd.id

    def undo(self) -> CommandRecord | None:
        """回退最後一條命令，傳回該命令供前端還原"""
        if not self._undo_stack:
            return None
        cmd = self._undo_stack.pop()
        self._redo_stack.append(cmd)
        return cmd  # 前端根據 cmd.before_state 還原

    def redo(self) -> CommandRecord | None:
        """重做上一個 undone 命令"""
        if not self._redo_stack:
            return None
        cmd = self._redo_stack.pop()
        self._undo_stack.append(cmd)
        return cmd  # 前端根據 cmd.after_state 重做

    def replay(self, session_id: str) -> list[CommandRecord]:
        """重放 session 的所有命令（按時間順序）"""
        return [c for c in self._commands if c.session_id == session_id]
```

**canvas.py 新路由**：

```python
@router.post("/api/commands/undo")
async def undo_command():
    cmd = command_log.undo()
    if not cmd:
        raise HTTPException(400, "沒有可回退的命令")
    return {"command": cmd}

@router.post("/api/commands/redo")
async def redo_command():
    cmd = command_log.redo()
    if not cmd:
        raise HTTPException(400, "沒有可重做的命令")
    return {"command": cmd}

@router.get("/api/commands/replay/{session}")
async def replay_session(session: str):
    cmds = command_log.replay(session)
    return {"session": session, "commands": cmds}
```

---

### RWK-003：前後端 Command Log 接線（影響完整性 +4 分，正確性 +3 分）

**評分報告指出**：`setCommandCallback()` 已定義但未實際呼叫發送到後端。

| 子項 | 描述 | 主要檔案 |
|:----:|------|----------|
| 3a | `App.jsx` 初始化時呼叫 `engine.setCommandCallback(...)` 註冊回調 | `App.jsx` |
| 3b | 回調內使用 `canvasApi.logCommand()` 或 fetch → POST /api/commands | `App.jsx` 或 `useCanvas2D.js` |
| 3c | 確保 `addEntity`、`removeEntity`、`moveSelected`、`deleteSelected` 後自動觸發 | `engine.js`（已有 `_logCommand` 僅需確保回調被執行） |
| 3d | 前端 undo/redo 按下時同步呼叫後端 undo/redo API | `engine.js` + `App.jsx` |

**接線方案**：

```js
// engine.js 確保 _logCommand 真的呼叫 callback
_logCommand(type, entityId, beforeState, afterState, description) {
  if (this._commandCallback) {
    const cmd = {
      type, entityId, beforeState, afterState, description,
      timestamp: Date.now(),
      sessionId: this._sessionId
    };
    this._commandCallback(cmd);
  }
}
```

**前端註冊**：

```jsx
// App.jsx
useEffect(() => {
  if (engineRef.current) {
    engineRef.current.setCommandCallback(async (cmd) => {
      try {
        await canvasApi.logCommand(cmd);
      } catch (err) {
        console.warn('Command log 上傳失敗（非致命）', err);
      }
    });
  }
}, [engineReady]);
```

---

### RWK-004：清理與測試（影響測試與驗證 25 分 + 可維護性 3 分）

| 子項 | 描述 | 主要檔案 |
|:----:|------|----------|
| 4a | 移除 `backend/Dockerfile`（保留 `Dockerfile.backend`） | `backend/Dockerfile`（刪除） |
| 4b | DIMENSION DXF 匯出（`engine.js` 匯出分支完成） | `engine.js` |
| 4c | 為 `command_log.py` 寫基本 pytest | `tests/test_command_log.py` |
| 4d | 基本 pytest 配置（`pytest.ini` 或 `pyproject.toml`） | 根目錄 |

**test_command_log.py 測試案例**：

```python
def test_add_command():
    log = CommandLog()
    cmd_id = log.add(cmd_data)
    assert cmd_id is not None

def test_undo():
    log = CommandLog()
    log.add(cmd_data)
    cmd = log.undo()
    assert cmd is not None
    assert cmd.type == "ADD_ENTITY"

def test_redo():
    log = CommandLog()
    log.add(cmd_data)
    log.undo()
    cmd = log.redo()
    assert cmd is not None

def test_replay():
    log = CommandLog()
    log.add(cmd_data)  # session "s1"
    cmds = log.replay("s1")
    assert len(cmds) == 1
```

---

## 3. 執行順序

```
時間 →
├─── RWK-001 (DIM 互動繪製) ─── 最優先，核心缺口
│     └── 1a→1b→1c→1f→1g 依序 → 1d→1e 可並行
│
├─── RWK-002 (後端 undo/redo API) ─── 可與 RWK-001 並行
│     └── 2a→2b（command_log.py → canvas.py）
│
├─── RWK-003 (前後端接線) ─── 依賴 RWK-002 完成 API
│     └── 3a→3b→3c→3d
│
└─── RWK-004 (清理測試) ─── 最後，與以上可並行收尾
      └── 4a→4b→4c→4d
```

### 並行建議

| 建議 | 說明 |
|------|------|
| RWK-001 與 RWK-002 完全並行 | DIM 前端互動 與 後端 API 無相依 |
| RWK-003 必須在 RWK-002 之後 | 因為需要後端 API 才能接線 |
| RWK-004 與所有 RWK 並行 | 刪除 Dockerfile、DXF 匯出、測試獨立 |

---

## 4. 分數提升預估

| 評分項目 | 當前 | 修復後 | 提升原因 |
|----------|:----:|:------:|----------|
| 完整性 | 12/25 | **22/25** | RWK-001 補齊核心互動 → +5；RWK-002/003 補 API+接線 → +5 |
| 正確性 | 7/25 | **24/25** | DIM 互動修復 → 檢查清單「有錯誤」變 YES → 從上限 10 恢復正常評分 |
| 可維護性 | 20/25 | **22/25** | 移除重複 Dockerfile → +1；測試文件 → +1 |
| 測試與驗證 | 0/25 | **22/25** | 加入 command_log.py 基本測試 → 檢查清單「有測試」變 YES → 從 0 恢復 |
| **總分** | **39** | **90** | |

**目標：90/100 ✅ 通過**

---

## 5. 檔案變更清單

| 檔案 | 動作 | 說明 |
|------|:----:|------|
| `frontend/src/components/Canvas2D/engine.js` | **修改** | 新增 `_startDim`、`_dimState`、`_onMouseDown` 'dim' 分支、`_onMouseMove` 預覽、ESC 取消 |
| `backend/app/services/command_log.py` | **修改** | 新增 `undo()`、`redo()`、`replay()` 方法，`_undo_stack`、`_redo_stack` |
| `backend/app/routers/canvas.py` | **修改** | 新增 `POST /api/commands/undo`、`POST /api/commands/redo`、`GET /api/commands/replay/{session}` |
| `frontend/src/App.jsx` 或 `src/hooks/useCanvas2D.js` | **修改** | 透過 `engine.setCommandCallback()` 註冊回調發送到後端 |
| `backend/Dockerfile` | **刪除** | 移除重複文件，僅保留 `Dockerfile.backend` |
| `tests/test_command_log.py` | **新增** | 基本 pytest 測試 |
| `pytest.ini` 或 `pyproject.toml` | **新增** | pytest 配置 |

---

## 6. 驗收標準

- [ ] **DIM 工具可互動繪製三種標註**：點選 DIM → 選類型（或依點選物件自動判斷）→ 點選畫布完成標註
- [ ] **半徑/角度標註**：點選圓/弧產生 R 標註，點選兩條線產生角度標註
- [ ] **預覽線**：滑鼠移動時顯示標註預覽（offset/引線/弧線）
- [ ] **ESC 取消**：繪製中途可按 ESC 取消
- [ ] **POST /api/commands/undo** 可正常回退，回傳 before_state
- [ ] **POST /api/commands/redo** 可重做
- [ ] **前後端 Command Log 接線**：操作後自動發送到後端
- [ ] **backend/Dockerfile 已移除**（保留 Dockerfile.backend）
- [ ] **DXF 匯出**包含 DIMENSION 圖元
- [ ] **pytest 測試通過**：`test_command_log.py` 覆蓋 add/undo/redo/replay
