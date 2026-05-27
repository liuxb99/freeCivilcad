import asyncio
import json
import math
import random
import time
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="freeCivilcad OCC Geometry Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OCC_AVAILABLE = False
try:
    from OCC.Core.gp import gp_Pnt, gp_Dir, gp_Vec, gp_Lin, gp_Plane
    from OCC.Core.BRepBuilderAPI import BRepBuilderAPI_MakeEdge, BRepBuilderAPI_MakeFace, BRepBuilderAPI_MakeWire
    from OCC.Core.BRepPrimAPI import BRepPrimAPI_MakeBox, BRepPrimAPI_MakeSphere, BRepPrimAPI_MakeCylinder
    from OCC.Core.BRepAlgoAPI import BRepAlgoAPI_Fuse, BRepAlgoAPI_Common, BRepAlgoAPI_Cut
    from OCC.Core.BRepAdaptor import BRepAdaptor_Curve, BRepAdaptor_Surface
    from OCC.Core.gp import gp_XYZ
    OCC_AVAILABLE = True
except ImportError:
    pass


class GeometryEngine:
    """Geometry computation engine. Uses pythonocc-core if available, otherwise pure math."""

    def __init__(self):
        self.occc_available = OCC_AVAILABLE

    def line_distance(self, x1, y1, z1, x2, y2, z2):
        dx, dy, dz = x2 - x1, y2 - y1, z2 - z1
        return math.sqrt(dx * dx + dy * dy + dz * dz)

    def generate_random_lines(self, count=1000, max_coord=1000):
        lines = []
        for i in range(count):
            p1 = (
                random.random() * max_coord,
                random.random() * max_coord * 0.5,
                random.random() * max_coord * 0.2,
            )
            p2 = (
                p1[0] + (random.random() - 0.5) * max_coord * 0.2,
                p1[1] + (random.random() - 0.5) * max_coord * 0.2,
                p1[2] + (random.random() - 0.5) * max_coord * 0.1,
            )
            lines.append({"p1": p1, "p2": p2, "id": i})
        return lines

    def compute_bbox(self, lines):
        xs = [p for l in lines for p in (l["p1"][0], l["p2"][0])]
        ys = [p for l in lines for p in (l["p1"][1], l["p2"][1])]
        zs = [p for l in lines for p in (l["p1"][2], l["p2"][2])]
        return {
            "xmin": min(xs), "xmax": max(xs),
            "ymin": min(ys), "ymax": max(ys),
            "zmin": min(zs), "zmax": max(zs),
        }

    def create_box(self, x, y, z, dx, dy, dz):
        return {
            "type": "box",
            "origin": [x, y, z],
            "size": [dx, dy, dz],
            "volume": dx * dy * dz,
            "surface_area": 2 * (dx * dy + dx * dz + dy * dz),
        }

    def create_sphere(self, cx, cy, cz, radius):
        return {
            "type": "sphere",
            "center": [cx, cy, cz],
            "radius": radius,
            "volume": 4.0 / 3.0 * math.pi * radius ** 3,
            "surface_area": 4 * math.pi * radius ** 2,
        }

    def create_cylinder(self, cx, cy, cz, radius, height):
        return {
            "type": "cylinder",
            "center": [cx, cy, cz],
            "radius": radius,
            "height": height,
            "volume": math.pi * radius ** 2 * height,
            "surface_area": 2 * math.pi * radius * (radius + height),
        }

    def plane_point_distance(self, a, b, c, d, px, py, pz):
        denom = math.sqrt(a * a + b * b + c * c)
        if denom < 1e-15:
            return 0.0
        return abs(a * px + b * py + c * pz + d) / denom

    def triangle_area(self, x1, y1, z1, x2, y2, z2, x3, y3, z3):
        ux, uy, uz = x2 - x1, y2 - y1, z2 - z1
        vx, vy, vz = x3 - x1, y3 - y1, z3 - z1
        cx = uy * vz - uz * vy
        cy = uz * vx - ux * vz
        cz = ux * vy - uy * vx
        return 0.5 * math.sqrt(cx * cx + cy * cy + cz * cz)

    def compute_mass_properties(self, shape_type, **params):
        if shape_type == "box":
            result = self.create_box(
                x=params.get("x", 0), y=params.get("y", 0), z=params.get("z", 0),
                dx=params.get("dx", 10), dy=params.get("dy", 10), dz=params.get("dz", 10),
            )
        elif shape_type == "sphere":
            result = self.create_sphere(
                cx=params.get("cx", 0), cy=params.get("cy", 0), cz=params.get("cz", 0),
                radius=params.get("radius", 5),
            )
        elif shape_type == "cylinder":
            result = self.create_cylinder(
                cx=params.get("cx", 0), cy=params.get("cy", 0), cz=params.get("cz", 0),
                radius=params.get("radius", 5), height=params.get("height", 10),
            )
        else:
            return {"error": f"Unknown shape: {shape_type}"}
        return result


engine = GeometryEngine()


@app.get("/api/status")
async def get_status():
    return {
        "status": "ok",
        "engine": "occ-wasm-backend",
        "version": "1.0.0",
        "occ_available": OCC_AVAILABLE,
    }


@app.get("/api/geometry/lines")
async def generate_lines(count: int = 1000, max_coord: float = 1000.0):
    t0 = time.time()
    lines = engine.generate_random_lines(count, max_coord)
    bbox = engine.compute_bbox(lines)
    t1 = time.time()

    enriched = []
    for l in lines:
        d = engine.line_distance(*l["p1"], *l["p2"])
        enriched.append({
            "id": l["id"],
            "p1": list(l["p1"]),
            "p2": list(l["p2"]),
            "length": round(d, 4),
        })

    return {
        "lines": enriched,
        "count": count,
        "bbox": bbox,
        "compute_time_ms": round((t1 - t0) * 1000, 2),
    }


@app.get("/api/geometry/shape")
async def compute_shape(
    shape_type: str = "box",
    x: float = 0, y: float = 0, z: float = 0,
    cx: float = 0, cy: float = 0, cz: float = 0,
    dx: float = 10, dy: float = 10, dz: float = 10,
    radius: float = 5, height: float = 10,
):
    t0 = time.time()
    params = {"x": x, "y": y, "z": z, "cx": cx, "cy": cy, "cz": cz,
              "dx": dx, "dy": dy, "dz": dz,
              "radius": radius, "height": height}
    result = engine.compute_mass_properties(shape_type, **params)
    t1 = time.time()
    result["compute_time_ms"] = round((t1 - t0) * 1000, 2)
    return result


@app.websocket("/ws/geometry")
async def websocket_geometry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action", "")

            t0 = time.time()

            if action == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})

            elif action == "generate_lines":
                count = msg.get("count", 1000)
                max_coord = msg.get("max_coord", 1000.0)
                lines = engine.generate_random_lines(count, max_coord)
                bbox = engine.compute_bbox(lines)
                enriched = []
                for l in lines:
                    d = engine.line_distance(*l["p1"], *l["p2"])
                    enriched.append({
                        "id": l["id"],
                        "p1": list(l["p1"]),
                        "p2": list(l["p2"]),
                        "length": round(d, 4),
                    })
                t1 = time.time()
                await websocket.send_json({
                    "type": "lines_result",
                    "lines": enriched,
                    "count": count,
                    "bbox": bbox,
                    "compute_time_ms": round((t1 - t0) * 1000, 2),
                })

            elif action == "compute_shape":
                shape_type = msg.get("shape_type", "box")
                params = msg.get("params", {})
                result = engine.compute_mass_properties(shape_type, **params)
                t1 = time.time()
                result["compute_time_ms"] = round((t1 - t0) * 1000, 2)
                await websocket.send_json({"type": "shape_result", **result})

            elif action == "batch":
                results = []
                for item in msg.get("operations", []):
                    op = item.get("action", "")
                    if op == "line_distance":
                        p = item.get("params", {})
                        d = engine.line_distance(
                            p.get("x1", 0), p.get("y1", 0), p.get("z1", 0),
                            p.get("x2", 0), p.get("y2", 0), p.get("z2", 0),
                        )
                        results.append({"distance": d})
                    elif op == "triangle_area":
                        p = item.get("params", {})
                        a = engine.triangle_area(
                            p.get("x1", 0), p.get("y1", 0), p.get("z1", 0),
                            p.get("x2", 0), p.get("y2", 0), p.get("z2", 0),
                            p.get("x3", 0), p.get("y3", 0), p.get("z3", 0),
                        )
                        results.append({"area": a})
                    else:
                        results.append({"error": f"Unknown op: {op}"})
                t1 = time.time()
                await websocket.send_json({
                    "type": "batch_result",
                    "results": results,
                    "compute_time_ms": round((t1 - t0) * 1000, 2),
                })

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown action: {action}",
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
