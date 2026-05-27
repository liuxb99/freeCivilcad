import json
import time
from typing import Any, Dict, Set

from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        dead: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.discard(ws)

    @property
    def count(self) -> int:
        return len(self.active)


manager = ConnectionManager()


async def handle_websocket(websocket: WebSocket):
    from app.routers.llm import _PARSERS

    await manager.connect(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type", "")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})

            elif msg_type == "llm":
                text = msg.get("text", "").strip()
                commands = None
                for name, parser in _PARSERS:
                    result = parser(text)
                    if result is not None:
                        commands = result
                        break
                await websocket.send_json({
                    "type": "llm_result",
                    "data": {
                        "success": commands is not None,
                        "commands": commands or [],
                        "raw_text": text,
                    },
                })

            elif msg_type == "broadcast":
                payload = msg.get("data", {})
                payload["sender"] = id(websocket)
                await manager.broadcast({"type": "broadcast", "data": payload})

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"未知訊息類型: {msg_type}",
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        manager.disconnect(websocket)
