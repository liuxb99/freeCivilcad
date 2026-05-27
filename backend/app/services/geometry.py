import math
from typing import Any, Dict, Tuple


def distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2)


def bbox(entity: Dict[str, Any]) -> Dict[str, float]:
    etype = entity.get("type", "")
    geo = entity.get("geometry", {})
    pts: list = []

    if etype == "LINE":
        pts = [(geo.get("x1", 0), geo.get("y1", 0)), (geo.get("x2", 0), geo.get("y2", 0))]
    elif etype == "CIRCLE":
        cx, cy, r = geo.get("cx", 0), geo.get("cy", 0), geo.get("r", 0)
        pts = [(cx - r, cy - r), (cx + r, cy + r)]
    elif etype == "ARC":
        cx, cy, r = geo.get("cx", 0), geo.get("cy", 0), geo.get("r", 0)
        pts = [(cx - r, cy - r), (cx + r, cy + r)]
    elif etype == "POLYGON":
        verts = geo.get("vertices", [])
        pts = [(v.get("x", 0), v.get("y", 0)) for v in verts]
    elif etype == "TEXT":
        pts = [(geo.get("x", 0), geo.get("y", 0))]

    if not pts:
        return {"xmin": 0, "ymin": 0, "xmax": 0, "ymax": 0}

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return {"xmin": min(xs), "ymin": min(ys), "xmax": max(xs), "ymax": max(ys)}


def _point_in_bbox(pt: Tuple[float, float], bb: Dict[str, float]) -> bool:
    return bb["xmin"] <= pt[0] <= bb["xmax"] and bb["ymin"] <= pt[1] <= bb["ymax"]


def _line_bbox_cross(bb: Dict[str, float],
                     x1: float, y1: float, x2: float, y2: float) -> bool:
    if _point_in_bbox((x1, y1), bb) or _point_in_bbox((x2, y2), bb):
        return True
    edges = [
        ((bb["xmin"], bb["ymin"]), (bb["xmax"], bb["ymin"])),
        ((bb["xmax"], bb["ymin"]), (bb["xmax"], bb["ymax"])),
        ((bb["xmax"], bb["ymax"]), (bb["xmin"], bb["ymax"])),
        ((bb["xmin"], bb["ymax"]), (bb["xmin"], bb["ymin"])),
    ]
    for (ex1, ey1), (ex2, ey2) in edges:
        if _segments_intersect(ex1, ey1, ex2, ey2, x1, y1, x2, y2):
            return True
    return False


def _segments_intersect(
    ax1: float, ay1: float, ax2: float, ay2: float,
    bx1: float, by1: float, bx2: float, by2: float,
) -> bool:
    def orient(px, py, qx, qy, rx, ry):
        return (qx - px) * (ry - py) - (qy - py) * (rx - px)

    o1 = orient(ax1, ay1, ax2, ay2, bx1, by1)
    o2 = orient(ax1, ay1, ax2, ay2, bx2, by2)
    o3 = orient(bx1, by1, bx2, by2, ax1, ay1)
    o4 = orient(bx1, by1, bx2, by2, ax2, ay2)

    if o1 == 0 and _on_segment(ax1, ay1, ax2, ay2, bx1, by1):
        return True
    if o2 == 0 and _on_segment(ax1, ay1, ax2, ay2, bx2, by2):
        return True
    if o3 == 0 and _on_segment(bx1, by1, bx2, by2, ax1, ay1):
        return True
    if o4 == 0 and _on_segment(bx1, by1, bx2, by2, ax2, ay2):
        return True

    return (o1 > 0) != (o2 > 0) and (o3 > 0) != (o4 > 0)


def _on_segment(ax: float, ay: float, bx: float, by: float,
                cx: float, cy: float) -> bool:
    return (min(ax, bx) <= cx <= max(ax, bx) and
            min(ay, by) <= cy <= max(ay, by))


def entities_intersect(e1: Dict[str, Any], e2: Dict[str, Any]) -> bool:
    bb1 = bbox(e1)
    bb2 = bbox(e2)

    if (bb1["xmax"] < bb2["xmin"] or bb2["xmax"] < bb1["xmin"] or
        bb1["ymax"] < bb2["ymin"] or bb2["ymax"] < bb1["ymin"]):
        return False

    t1 = e1.get("type", "")
    t2 = e2.get("type", "")
    g1 = e1.get("geometry", {})
    g2 = e2.get("geometry", {})

    if t1 == "LINE" and t2 == "LINE":
        return _line_bbox_cross(bb2, g1.get("x1", 0), g1.get("y1", 0),
                                g1.get("x2", 0), g1.get("y2", 0))

    if t1 in ("CIRCLE", "ARC") and t2 in ("CIRCLE", "ARC"):
        c1 = (g1.get("cx", 0), g1.get("cy", 0))
        c2 = (g2.get("cx", 0), g2.get("cy", 0))
        r_sum = g1.get("r", 0) + g2.get("r", 0)
        return distance(c1, c2) <= r_sum

    return True


def wasm_available() -> bool:
    try:
        import google  # noqa
        return True
    except ImportError:
        return False


def wasm_bridge(action: str, params: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "available": wasm_available(),
        "action": action,
        "params": params,
        "message": "WASM bridge - not connected" if not wasm_available() else "WASM bridge - available",
    }
