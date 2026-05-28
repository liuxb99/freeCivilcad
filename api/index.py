"""
Vercel ASGI handler — Mangum wrapper for FastAPI app

在 Vercel 的 Python Serverless 環境中，無法直接執行 uvicorn。
此檔案將 FastAPI app 包裝為 Mangum handler，供 Vercel 呼叫。
"""
import sys
from pathlib import Path

# backend/ 目錄在專案根目錄下，加入 Python 路徑
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from mangum import Mangum
from app.main import app

# Vercel 無 serverless handler — Mangum 將 ASGI 請求轉為 AWS Lambda / Vercel 格式
handler = Mangum(app, lifespan="off")
