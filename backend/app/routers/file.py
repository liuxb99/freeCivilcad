import json
import os
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from app.services.dxf_parser import parse_dxf

router = APIRouter(prefix="/api/file", tags=["file"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
os.makedirs(DATA_DIR, exist_ok=True)

SAVE_FILE = DATA_DIR / "canvas.json"


class SaveRequest(BaseModel):
    entities: list = []
    layers: list = []
    viewport: Dict[str, Any] = {}


@router.post("/save")
async def save_file(body: SaveRequest):
    data = body.model_dump()
    with open(SAVE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return {"success": True, "data": {"path": str(SAVE_FILE)}, "error": None}


@router.post("/load")
async def load_file():
    if not SAVE_FILE.exists():
        return {"success": True, "data": {"entities": [], "layers": [], "viewport": {}}, "error": None}
    with open(SAVE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {"success": True, "data": data, "error": None}


@router.post("/import-dxf")
async def import_dxf(file: UploadFile = File(...)):
    content = (await file.read()).decode("utf-8", errors="replace")
    entities = parse_dxf(content)
    return {
        "success": True,
        "data": {
            "entities": [e.model_dump() for e in entities],
            "count": len(entities),
        },
        "error": None,
    }
