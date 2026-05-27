from typing import Optional
from pydantic import BaseModel, Field


class Layer(BaseModel):
    id: str
    name: str
    color: str = "#FFFFFF"
    visible: bool = True
    locked: bool = False


class LayerCreate(BaseModel):
    name: str
    color: str = "#FFFFFF"


class LayerUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    visible: Optional[bool] = None
    locked: Optional[bool] = None
