(function() {
  "use strict";

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function Executor(canvasState, historyManager) {
    const state = canvasState;
    const history = historyManager;

    const DEFAULT_COLORS = {
      'line': '#f38ba8',
      'circle': '#89b4fa',
      'arc': '#f9e2af',
      'polygon': '#a6e3a1',
      'text': '#f5c2e7'
    };

    let _nextId = 1;
    function nextId() { return _nextId++; }

    function makeEntity(type, props) {
      const e = { id: nextId(), type: type.toUpperCase(), layer: '0', color: DEFAULT_COLORS[type.toLowerCase()] || '#cdd6f4', lineWidth: 2 };
      Object.assign(e, props);
      if (e.type === 'POLYGON' && !e.vertices) e.vertices = [];
      return e;
    }

    function addEntity(e) {
      state.entities.push(e);
    }

    function removeEntityById(id) {
      const idx = state.entities.findIndex(e => e.id === id);
      if (idx >= 0) {
        const entity = state.entities[idx];
        state.entities.splice(idx, 1);
        if (state.selectedEntity === entity) {
          state.selectedEntity = null;
        }
        return true;
      }
      return false;
    }

    function moveEntityById(id, nx, ny) {
      const e = state.entities.find(e => e.id === id);
      if (!e) return false;
      const type = e.type;
      if (type === 'LINE') {
        const dx = nx - e.x1, dy = ny - e.y1;
        e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy;
      } else if (type === 'CIRCLE') {
        e.cx = nx; e.cy = ny;
      } else if (type === 'ARC') {
        e.cx = nx; e.cy = ny;
      } else if (type === 'POLYGON' && e.vertices.length > 0) {
        const dx = nx - e.vertices[0].x, dy = ny - e.vertices[0].y;
        for (const v of e.vertices) { v.x += dx; v.y += dy; }
      } else if (type === 'TEXT') {
        e.x = nx; e.y = ny;
      }
      return true;
    }

    function zoomToAll(ctx) {
      if (state.entities.length === 0) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const e of state.entities) {
        if (e.type === 'LINE') {
          minX = Math.min(minX, e.x1, e.x2); maxX = Math.max(maxX, e.x1, e.x2);
          minY = Math.min(minY, e.y1, e.y2); maxY = Math.max(maxY, e.y1, e.y2);
        } else if (e.type === 'CIRCLE' || e.type === 'ARC') {
          minX = Math.min(minX, e.cx - e.radius); maxX = Math.max(maxX, e.cx + e.radius);
          minY = Math.min(minY, e.cy - e.radius); maxY = Math.max(maxY, e.cy + e.radius);
        } else if (e.type === 'POLYGON') {
          for (const v of e.vertices) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
          }
        } else if (e.type === 'TEXT') {
          minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x);
          minY = Math.min(minY, e.y); maxY = Math.max(maxY, e.y);
        }
      }
      const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
      const w = ctx.canvas.width, h = ctx.canvas.height;
      const worldW = maxX - minX + 20, worldH = maxY - minY + 20;
      if (worldW <= 0 || worldH <= 0) return;
      const zoomX = (w * 0.8) / (worldW * state.gridSize);
      const zoomY = (h * 0.8) / (worldH * state.gridSize);
      state.zoom = Math.min(zoomX, zoomY);
      state.zoom = Math.max(0.1, Math.min(10, state.zoom));
      state.panX = w / 2 - midX * state.zoom * state.gridSize;
      state.panY = h / 2 - midY * state.zoom * state.gridSize;
    }

    function toggleGrid() {
      state.showGrid = !state.showGrid;
    }

    function executeCommand(cmd) {
      switch (cmd.action) {
        case 'create': {
          const p = cmd.params;
          const type = cmd.type;
          const entity = makeEntity(type, p);
          addEntity(entity);
          return { success: true, id: entity.id, type: type, message: '已建立 ' + type + ' #' + entity.id };
        }
        case 'delete': {
          const ok = removeEntityById(cmd.params.id);
          return ok ? { success: true, message: '已刪除圖元 #' + cmd.params.id } : { success: false, message: '找不到圖元 #' + cmd.params.id };
        }
        case 'move': {
          const ok = moveEntityById(cmd.params.id, cmd.params.x, cmd.params.y);
          return ok ? { success: true, message: '已移動圖元 #' + cmd.params.id } : { success: false, message: '找不到圖元 #' + cmd.params.id };
        }
        case 'clear': {
          state.entities.length = 0;
          state.selectedEntity = null;
          return { success: true, message: '已清除所有圖元' };
        }
        case 'grid': {
          toggleGrid();
          return { success: true, message: (state.showGrid ? '已顯示' : '已隱藏') + '網格' };
        }
        case 'zoomToAll': {
          zoomToAll(ctx);
          return { success: true, message: '已縮放到全部' };
        }
        case 'error': {
          return { success: false, message: cmd.params.message || '指令錯誤' };
        }
        default:
          return { success: false, message: '未知動作: ' + cmd.action };
      }
    }

    let ctx = null;
    function setContext(canvasCtx) {
      ctx = canvasCtx;
    }

    function executeBatch(commands) {
      const results = [];
      for (const cmd of commands) {
        const r = executeCommand(cmd);
        results.push(r);
      }
      return results;
    }

    return { executeBatch, executeCommand, setContext, makeEntity, addEntity, removeEntityById, zoomToAll };
  }

  window.Executor = Executor;
})();
