import math
import re
from typing import Any, Dict, List, Optional

from app.models.entity import Entity


DXF_COLOR_MAP: Dict[int, str] = {
    1: "#FF0000", 2: "#FFFF00", 3: "#00FF00", 4: "#00FFFF",
    5: "#0000FF", 6: "#FF00FF", 7: "#FFFFFF", 8: "#808080",
    9: "#C0C0C0",
}


def _dxf_val(code: int, raw: str) -> Any:
    if "e" in raw.lower() or "." in raw:
        try:
            return float(raw)
        except ValueError:
            pass
    try:
        return int(raw)
    except ValueError:
        return raw


def _resolve_color(color_val: Any) -> str:
    if isinstance(color_val, int):
        return DXF_COLOR_MAP.get(color_val, "#%02x%02x%02x" % (color_val, color_val, color_val))
    if isinstance(color_val, str) and color_val.startswith("#"):
        return color_val
    return "#FFFFFF"


def parse_dxf(file_content: str) -> List[Entity]:
    lines = [ln.rstrip("\r\n") for ln in file_content.splitlines()]
    n = len(lines)
    i = 0
    raw_entities: List[Dict[str, Any]] = []

    while i < n:
        if i + 1 >= n:
            break
        try:
            code = int(lines[i].strip())
        except ValueError:
            i += 1
            continue

        if code != 0:
            i += 2
            continue

        value = lines[i + 1].strip()
        i += 2

        if value == "EOF":
            break
        elif value == "SECTION":
            if i + 1 < n:
                try:
                    sc = int(lines[i].strip())
                except ValueError:
                    continue
                if sc == 2:
                    sec_name = lines[i + 1].strip()
                    i += 2
                    if sec_name == "ENTITIES":
                        i = _parse_entities(lines, i, raw_entities)
        elif value == "ENDSEC":
            pass

    return [_build_entity(e) for e in raw_entities if _build_entity(e) is not None]


def _parse_entities(lines: List[str], start: int, out: List[Dict[str, Any]]) -> int:
    i = start
    n = len(lines)
    while i < n:
        if i + 1 >= n:
            break
        try:
            gc = int(lines[i].strip())
        except ValueError:
            i += 1
            continue
        if gc != 0:
            i += 2
            continue
        etype = lines[i + 1].strip()
        i += 2

        if etype == "ENDSEC":
            return i
        if etype == "EOF":
            return i

        pairs: List[tuple] = []
        while i < n:
            if i + 1 >= n:
                break
            try:
                g = int(lines[i].strip())
            except ValueError:
                i += 1
                continue
            if g == 0:
                break
            v = lines[i + 1].strip()
            i += 2
            pairs.append((g, _dxf_val(g, v)))

        ent: Dict[str, Any] = {"type": etype}
        for g, v in pairs:
            ent[g] = v
        out.append(ent)
    return i


def _build_entity(raw: Dict[str, Any]) -> Optional[Entity]:
    etype = raw.get("type", "")
    layer = str(raw.get(8, "0"))
    color_idx = raw.get(62, 7)
    color = _resolve_color(color_idx)

    if etype == "LINE":
        geometry = {
            "x1": float(raw.get(10, 0)), "y1": float(raw.get(20, 0)),
            "x2": float(raw.get(11, 0)), "y2": float(raw.get(21, 0)),
        }
    elif etype == "CIRCLE":
        geometry = {
            "cx": float(raw.get(10, 0)), "cy": float(raw.get(20, 0)),
            "r": float(raw.get(40, 0)),
        }
    elif etype == "ARC":
        geometry = {
            "cx": float(raw.get(10, 0)), "cy": float(raw.get(20, 0)),
            "r": float(raw.get(40, 0)),
            "startAngle": float(raw.get(50, 0)),
            "endAngle": float(raw.get(51, 360)),
        }
    elif etype == "LWPOLYLINE":
        verts: List[Dict[str, float]] = []
        for g, v in raw.items():
            if isinstance(g, int):
                if g == 10:
                    verts.append({"x": float(v) if not isinstance(v, float) else v})
                elif g == 20 and verts:
                    verts[-1]["y"] = float(v) if not isinstance(v, float) else v
        geometry = {"vertices": verts}
        etype = "POLYGON"
    elif etype == "TEXT":
        geometry = {
            "x": float(raw.get(10, 0)), "y": float(raw.get(20, 0)),
            "text": str(raw.get(1, "")),
            "size": float(raw.get(40, 1)),
        }
    else:
        return None

    return Entity(
        id=f"{etype}_{abs(hash(str(raw)))}",
        type=etype if etype != "LWPOLYLINE" else "POLYGON",
        layer=layer,
        color=color,
        geometry=geometry,
    )
