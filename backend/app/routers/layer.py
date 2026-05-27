from typing import Dict, List
from fastapi import APIRouter, HTTPException

from app.models.layer import Layer, LayerCreate, LayerUpdate

router = APIRouter(prefix="/api/layers", tags=["layers"])

_layers: Dict[str, Layer] = {
    "0": Layer(id="0", name="Default", color="#FFFFFF", visible=True, locked=False),
}
_next_id = 1


@router.get("")
async def list_layers():
    return {"success": True, "data": list(_layers.values()), "error": None}


@router.post("")
async def create_layer(body: LayerCreate):
    global _next_id
    lid = str(_next_id)
    _next_id += 1
    layer = Layer(id=lid, name=body.name, color=body.color)
    _layers[lid] = layer
    return {"success": True, "data": layer, "error": None}


@router.delete("/{layer_id}")
async def delete_layer(layer_id: str):
    if layer_id == "0":
        raise HTTPException(status_code=400, detail="不能刪除預設圖層 0")
    if layer_id not in _layers:
        raise HTTPException(status_code=404, detail="圖層不存在")
    del _layers[layer_id]
    return {"success": True, "data": {"deleted": layer_id}, "error": None}


@router.patch("/{layer_id}")
async def update_layer(layer_id: str, body: LayerUpdate):
    if layer_id not in _layers:
        raise HTTPException(status_code=404, detail="圖層不存在")
    layer = _layers[layer_id]
    if body.name is not None:
        layer.name = body.name
    if body.color is not None:
        layer.color = body.color
    if body.visible is not None:
        layer.visible = body.visible
    if body.locked is not None:
        layer.locked = body.locked
    return {"success": True, "data": layer, "error": None}
