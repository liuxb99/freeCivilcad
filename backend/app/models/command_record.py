from pydantic import BaseModel
from typing import Optional, Any


class CommandRecord(BaseModel):
    id: str
    session_id: str
    timestamp: float
    type: str
    entity_id: str
    before_state: Optional[dict] = None
    after_state: Optional[dict] = None
    description: str
