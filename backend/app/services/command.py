import copy
from typing import Any, Dict, List, Optional


def _generate_id(existing_ids: set) -> str:
    i = 1
    while f"e{i}" in existing_ids:
        i += 1
    return f"e{i}"


def execute_command(canvas_state: Dict[str, Any], command: Dict[str, Any]) -> Dict[str, Any]:
    state = copy.deepcopy(canvas_state)
    entities: List[Dict] = state.get("entities", [])
    existing_ids = {e["id"] for e in entities}
    cmd_type = command.get("type", "")
    params = command.get("params", {})

    if cmd_type == "ADD_ENTITY":
        entity = dict(params)
        if "id" not in entity or not entity["id"]:
            entity["id"] = _generate_id(existing_ids)
        entities.append(entity)

    elif cmd_type == "DELETE_ENTITY":
        eid = params.get("id", "")
        entities = [e for e in entities if e["id"] != eid]

    elif cmd_type == "MOVE_ENTITY":
        eid = params.get("id", "")
        dx = params.get("dx", 0)
        dy = params.get("dy", 0)
        for e in entities:
            if e["id"] == eid:
                geo = e.get("geometry", {})
                for key in ("x", "x1", "cx", "vertexX"):
                    if key in geo:
                        geo[key] = float(geo.get(key, 0)) + dx
                for key in ("y", "y1", "cy", "vertexY"):
                    if key in geo:
                        geo[key] = float(geo.get(key, 0)) + dy
                if "x2" in geo:
                    geo["x2"] = float(geo["x2"]) + dx
                if "y2" in geo:
                    geo["y2"] = float(geo["y2"]) + dy
                if "vertices" in geo:
                    for v in geo["vertices"]:
                        v["x"] = float(v.get("x", 0)) + dx
                        v["y"] = float(v.get("y", 0)) + dy
                break

    elif cmd_type == "UPDATE_ENTITY":
        eid = params.get("id", "")
        updates = params.get("updates", {})
        for e in entities:
            if e["id"] == eid:
                for k, v in updates.items():
                    if k in e:
                        e[k] = v
                    elif "geometry" in e and k in e["geometry"]:
                        e["geometry"][k] = v
                break

    state["entities"] = entities
    return state
