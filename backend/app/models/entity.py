from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class Entity(BaseModel):
    id: str
    type: str = Field(..., pattern=r"^(LINE|CIRCLE|ARC|POLYGON|TEXT|DIMENSION)$")
    layer: str = "0"
    color: str = "#FFFFFF"
    lineWidth: float = 1.0
    geometry: Dict[str, Any] = Field(default_factory=dict)


LINE_GEOMETRY_KEYS = {"x1", "y1", "x2", "y2"}
CIRCLE_GEOMETRY_KEYS = {"cx", "cy", "radius"}
ARC_GEOMETRY_KEYS = {"cx", "cy", "radius", "startAngle", "endAngle"}
POLYGON_GEOMETRY_KEYS = {"vertices"}
TEXT_GEOMETRY_KEYS = {"x", "y", "text", "size"}
DIMENSION_GEOMETRY_KEYS = {"dimType", "x1", "y1", "x2", "y2", "offset", "cx", "cy", "radius", "leaderAngle", "vertexX", "vertexY", "angleStart", "angleEnd", "arcRadius", "value", "text"}
