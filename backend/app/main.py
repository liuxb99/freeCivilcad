from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.routers import canvas, file, layer, llm
from app.websocket.handler import handle_websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Server startup: freeCivilcad backend")
    yield
    print("Server shutdown: freeCivilcad backend")


app = FastAPI(
    title="freeCivilcad Backend API",
    description="統一後端服務：繪圖指令、圖層管理、檔案操作、LLM 指令解析、WebSocket 協作",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(canvas.router)
app.include_router(layer.router)
app.include_router(file.router)
app.include_router(llm.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await handle_websocket(websocket)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
