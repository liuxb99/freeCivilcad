import math
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/llm", tags=["llm"])


class LLMParseRequest(BaseModel):
    text: str
    entities: list = []


class LLMParseResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


def _parse_line(text: str) -> Optional[List[Dict]]:
    m = re.search(
        r'(?:畫|繪製|建立)(?:一條|一根)?(?:線|直線)(?:段)?(?:從|由)\s*'
        r'(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*'
        r'(?:到|至)\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)',
        text,
    )
    if m:
        return [{"type": "LINE", "params": {
            "x1": float(m.group(1)), "y1": float(m.group(2)),
            "x2": float(m.group(3)), "y2": float(m.group(4)),
        }}]
    m = re.search(
        r'(?:畫|繪製|建立).*?線.*?(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?).*?'
        r'(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)',
        text,
    )
    if m:
        return [{"type": "LINE", "params": {
            "x1": float(m.group(1)), "y1": float(m.group(2)),
            "x2": float(m.group(3)), "y2": float(m.group(4)),
        }}]
    return None


def _parse_circle(text: str) -> Optional[List[Dict]]:
    m = re.search(
        r'(?:畫|繪製|建立)(?:一個|一顆)?(?:圓|圓形)(?:心)?(?:在|於|:)?\s*'
        r'(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*'
        r'(?:半徑|r|R|直徑|d|D)?\s*(?:=|:)?\s*(-?\d+(?:\.\d+)?)',
        text,
    )
    if m:
        r = float(m.group(3))
        if re.search(r'直徑', text):
            r /= 2
        return [{"type": "CIRCLE", "params": {
            "cx": float(m.group(1)), "cy": float(m.group(2)), "r": r,
        }}]
    return None


def _parse_arc(text: str) -> Optional[List[Dict]]:
    m = re.search(
        r'(?:畫|繪製|建立)(?:一個|一條)?(?:弧|圓弧|弧線)\s*(?:圓心)?(?:在|於|:)?\s*'
        r'(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*'
        r'(?:半徑|r|R)\s*(?:=|:)?\s*(-?\d+(?:\.\d+)?)\s*'
        r'(?:從|由)\s*(-?\d+(?:\.\d+)?)\s*(?:度|°)?\s*'
        r'(?:到|至)\s*(-?\d+(?:\.\d+)?)\s*(?:度|°)?',
        text,
    )
    if m:
        return [{"type": "ARC", "params": {
            "cx": float(m.group(1)), "cy": float(m.group(2)),
            "r": float(m.group(3)),
            "startAngle": float(m.group(4)) * math.pi / 180,
            "endAngle": float(m.group(5)) * math.pi / 180,
        }}]
    return None


def _parse_rect(text: str) -> Optional[List[Dict]]:
    m = re.search(
        r'(?:畫|繪製|建立)(?:一個|一個)?(?:矩形|長方形|四邊形)\s*'
        r'(?:從|由)?\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*'
        r'(?:到|至)\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)',
        text,
    )
    if m:
        x1, y1, x2, y2 = (
            float(m.group(1)), float(m.group(2)),
            float(m.group(3)), float(m.group(4)),
        )
        return [
            {"type": "LINE", "params": {"x1": x1, "y1": y1, "x2": x2, "y2": y1}},
            {"type": "LINE", "params": {"x1": x2, "y1": y1, "x2": x2, "y2": y2}},
            {"type": "LINE", "params": {"x1": x2, "y1": y2, "x2": x1, "y2": y2}},
            {"type": "LINE", "params": {"x1": x1, "y1": y2, "x2": x1, "y2": y1}},
        ]
    return None


def _parse_polygon(text: str) -> Optional[List[Dict]]:
    m = re.search(
        r'(?:畫|繪製|建立)(?:一個|一個)?(?:三角形|四邊形|五邊形|六邊形|多邊形)\s*'
        r'(?:頂點|點)?\s*'
        r'((?:\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?(?:\s+|,|，|、)?)+)',
        text,
    )
    if m:
        nums = re.findall(r'(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)', m.group(1))
        if len(nums) >= 3:
            vertices = [{"x": float(x), "y": float(y)} for x, y in nums]
            return [{"type": "POLYGON", "params": {"vertices": vertices}}]
    return None


def _parse_select(text: str) -> Optional[List[Dict]]:
    m = re.search(r'(?:選擇|選取|選中|選)\s*(?:圖元|圖形|實體|物件)?\s*(\d+)', text)
    if m:
        return [{"type": "SELECT", "params": {"id": int(m.group(1))}}]
    return None


def _parse_move(text: str) -> Optional[List[Dict]]:
    m = re.search(
        r'(?:把|將)?(?:圖元|圖形|實體|物件)?\s*(\d+)\s*'
        r'(?:移動|移到|移至|移|搬)\s*(?:到|至)?\s*'
        r'(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)',
        text,
    )
    if m:
        return [{"type": "MOVE", "params": {
            "id": int(m.group(1)),
            "dx": float(m.group(2)),
            "dy": float(m.group(3)),
        }}]
    return None


def _parse_delete(text: str) -> Optional[List[Dict]]:
    m = re.search(r'(?:刪除|移除|消除)(?:圖元|圖形|實體|物件)?\s*(\d+)', text)
    if m:
        return [{"type": "DELETE", "params": {"id": int(m.group(1))}}]
    return None


_PARSERS = [
    ("arc", _parse_arc),
    ("rect", _parse_rect),
    ("polygon", _parse_polygon),
    ("circle", _parse_circle),
    ("line", _parse_line),
    ("select", _parse_select),
    ("move", _parse_move),
    ("delete", _parse_delete),
]


@router.post("/parse")
async def parse_nl(req: LLMParseRequest):
    text = req.text.strip()
    for name, parser in _PARSERS:
        result = parser(text)
        if result is not None:
            return {"success": True, "data": {"commands": result, "raw_text": text}, "error": None}
    return {
        "success": False,
        "data": None,
        "error": "無法理解的指令，請嘗試：畫線、畫圓、畫弧、畫矩形、畫多邊形、選擇、移動、刪除",
    }
