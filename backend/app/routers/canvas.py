from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.command import execute_command
from app.services.command_log import command_log

router = APIRouter(prefix="/api/canvas", tags=["canvas"])


class CommandItem(BaseModel):
    type: str
    params: Dict[str, Any] = {}


class CanvasCommandRequest(BaseModel):
    commands: List[CommandItem]
    canvas_state: Dict[str, Any] = {"entities": [], "layers": []}


class SessionRequest(BaseModel):
    session: str = "default"


@router.post("/command")
async def batch_commands(req: CanvasCommandRequest):
    state = req.canvas_state
    for cmd in req.commands:
        state = execute_command(state, cmd.model_dump())
        command_log.record(
            type=f"CMD_{cmd.type}",
            entity_id="",
            after=cmd.model_dump(),
            description=f"Execute command: {cmd.type}"
        )
    return {"success": True, "data": {"entities": state.get("entities", [])}, "error": None}


@router.get("/commands")
async def get_commands(session: Optional[str] = Query(None), limit: int = Query(100), offset: int = Query(0)):
    records = command_log.get_history(session, limit, offset)
    return {"success": True, "data": {"commands": records, "total": len(records)}}


@router.get("/commands/sessions")
async def get_sessions():
    sessions = command_log.get_sessions()
    return {"success": True, "data": {"sessions": sessions}}


@router.post("/commands/undo")
async def undo_command(req: SessionRequest):
    before_state = command_log.undo(req.session)
    return {"success": True, "data": {"before_state": before_state}}


@router.post("/commands/redo")
async def redo_command(req: SessionRequest):
    after_state = command_log.redo(req.session)
    return {"success": True, "data": {"after_state": after_state}}


@router.get("/commands/replay/{session}")
async def replay_session(session: str):
    commands = command_log.replay(session)
    return {"success": True, "data": {"commands": commands, "count": len(commands)}}
