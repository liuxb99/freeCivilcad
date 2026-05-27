DXF_COLOR_MAP = {
    1: "#FF0000", 2: "#FFFF00", 3: "#00FF00", 4: "#00FFFF",
    5: "#0000FF", 6: "#FF00FF", 7: "#FFFFFF", 8: "#808080",
    9: "#C0C0C0",
}

def map_entity(raw):
    etype = raw["type"]
    c = raw.get("color", 7)
    color = DXF_COLOR_MAP.get(c, "#%02x%02x%02x" % (c, c, c))
    layer = str(raw.get("layer", "0"))
    base = {"type": etype, "layer": layer, "color": color, "color_index": c}

    if etype == "LINE":
        return {**base,
            "x1": raw.get("x1", 0), "y1": raw.get("y1", 0),
            "z1": raw.get("z1", 0),
            "x2": raw.get("x2", 0), "y2": raw.get("y2", 0),
            "z2": raw.get("z2", 0)}
    elif etype == "CIRCLE":
        return {**base,
            "cx": raw.get("cx", 0), "cy": raw.get("cy", 0),
            "cz": raw.get("cz", 0),
            "radius": raw.get("radius", 0)}
    elif etype == "ARC":
        return {**base,
            "cx": raw.get("cx", 0), "cy": raw.get("cy", 0),
            "cz": raw.get("cz", 0),
            "radius": raw.get("radius", 0),
            "start_angle": raw.get("start_angle", 0),
            "end_angle": raw.get("end_angle", 360)}
    elif etype == "LWPOLYLINE":
        return {**base,
            "vertices": raw.get("vertices", []),
            "count": raw.get("count", 0),
            "flag": raw.get("flag", 0)}
    elif etype == "TEXT":
        return {**base,
            "x": raw.get("x", 0), "y": raw.get("y", 0), "z": raw.get("z", 0),
            "height": raw.get("height", 0), "text": raw.get("text", ""),
            "rotation": raw.get("rotation", 0)}
    return {**base, "raw": raw}

def map_entities(entities):
    result = []
    stats = {"total": 0, "by_type": {}}
    for e in entities:
        mapped = map_entity(e)
        result.append(mapped)
        stats["total"] += 1
        t = e["type"]
        stats["by_type"][t] = stats["by_type"].get(t, 0) + 1
    return {"entities": result, "stats": stats}
