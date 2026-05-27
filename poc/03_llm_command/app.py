import re
import math
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="freeCivilcad LLM 命令映射", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NLRequest(BaseModel):
    text: str
    entities: list = []

class NLResponse(BaseModel):
    commands: list
    raw_text: str

def parse_line(text):
    m = re.search(r'(?:畫|繪製|建立)(?:一條|一根)?(?:線|直線)(?:段)?(?:從|由)\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*(?:到|至)\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)', text)
    if m:
        return [{"action": "create", "type": "line", "params": {
            "x1": float(m.group(1)), "y1": float(m.group(2)),
            "x2": float(m.group(3)), "y2": float(m.group(4))
        }}]
    m = re.search(r'(?:畫|繪製|建立).*?線.*?(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?).*?(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)', text)
    if m:
        return [{"action": "create", "type": "line", "params": {
            "x1": float(m.group(1)), "y1": float(m.group(2)),
            "x2": float(m.group(3)), "y2": float(m.group(4))
        }}]
    return None

def parse_circle(text):
    m = re.search(r'(?:畫|繪製|建立)(?:一個|一顆)?(?:圓|圓形)(?:心)?(?:在|於|:)?\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*(?:半徑|r|R|直徑|d|D)?\s*(?:=|:)?\s*(-?\d+(?:\.\d+)?)', text)
    if m:
        r = float(m.group(3))
        if re.search(r'直徑', text):
            r /= 2
        return [{"action": "create", "type": "circle", "params": {
            "cx": float(m.group(1)), "cy": float(m.group(2)), "radius": r
        }}]
    return None

def parse_arc(text):
    m = re.search(r'(?:畫|繪製|建立)(?:一個|一條)?(?:弧|圓弧|弧線)\s*(?:圓心)?(?:在|於|:)?\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*(?:半徑|r|R)\s*(?:=|:)?\s*(-?\d+(?:\.\d+)?)\s*(?:從|由)\s*(-?\d+(?:\.\d+)?)\s*(?:度|°)?\s*(?:到|至)\s*(-?\d+(?:\.\d+)?)\s*(?:度|°)?', text)
    if m:
        return [{"action": "create", "type": "arc", "params": {
            "cx": float(m.group(1)), "cy": float(m.group(2)),
            "radius": float(m.group(3)),
            "startAngle": float(m.group(4)) * math.pi / 180,
            "endAngle": float(m.group(5)) * math.pi / 180
        }}]
    return None

def parse_delete(text):
    m = re.search(r'(?:刪除|移除|消除)(?:圖元|圖形|實體|物件)?\s*(\d+)', text)
    if m:
        return [{"action": "delete", "params": {"id": int(m.group(1))}}]
    return None

def parse_move(text):
    m = re.search(r'(?:把|將)?(?:圖元|圖形|實體|物件)?\s*(\d+)\s*(?:移動|移到|移至|移|搬)\s*(?:到|至)?\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)', text)
    if m:
        return [{"action": "move", "params": {
            "id": int(m.group(1)),
            "x": float(m.group(2)), "y": float(m.group(3))
        }}]
    return None

def parse_clear(text):
    if re.fullmatch(r'(?:全部|所有|全部清除|清除所有)\s*(?:刪除|移除|清除)?', text.strip()):
        return [{"action": "clear"}]
    if re.search(r'清除\s*(?:所有|全部)?', text):
        return [{"action": "clear"}]
    return None

def parse_grid(text):
    if re.search(r'網格', text):
        return [{"action": "grid"}]
    return None

def parse_zoom_all(text):
    if re.search(r'(?:縮放|視圖|顯示|檢視|全圖)(?:到|至)?(?:全部|所有|全圖|全部圖元)', text):
        return [{"action": "zoomToAll"}]
    return None

def parse_text(text):
    m = re.search(r'(?:畫|繪製|建立|新增|加入)(?:文字|文本|標籤|字)\s*(?:在|於|:)?\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*(?:內容|文字|說|寫|:)?\s*(.+)?', text)
    if m:
        content = m.group(3) or "文字"
        return [{"action": "create", "type": "text", "params": {
            "x": float(m.group(1)), "y": float(m.group(2)),
            "text": content.strip(), "fontSize": 1
        }}]
    return None

def parse_polygon(text):
    m = re.search(r'(?:畫|繪製|建立)(?:一個|一個)?(?:三角形|四邊形|五邊形|六邊形|多邊形)\s*(?:頂點|點)?\s*((?:\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?(?:\s+|,|，|、)?)+)', text)
    if m:
        nums = re.findall(r'(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)', m.group(1))
        if len(nums) >= 3:
            vertices = [{"x": float(x), "y": float(y)} for x, y in nums]
            return [{"action": "create", "type": "polygon", "params": {"vertices": vertices}}]
    return None

def parse_rect(text):
    m = re.search(r'(?:畫|繪製|建立)(?:一個|一個)?(?:矩形|長方形|四邊形)\s*(?:從|由)?\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*(?:到|至)\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)', text)
    if m:
        x1, y1, x2, y2 = float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4))
        return [
            {"action": "create", "type": "line", "params": {"x1": x1, "y1": y1, "x2": x2, "y2": y1}},
            {"action": "create", "type": "line", "params": {"x1": x2, "y1": y1, "x2": x2, "y2": y2}},
            {"action": "create", "type": "line", "params": {"x1": x2, "y1": y2, "x2": x1, "y2": y2}},
            {"action": "create", "type": "line", "params": {"x1": x1, "y1": y2, "x2": x1, "y2": y1}},
        ]
    return None

PARSERS = [
    ("arc", parse_arc),
    ("rect", parse_rect),
    ("polygon", parse_polygon),
    ("circle", parse_circle),
    ("line", parse_line),
    ("text", parse_text),
    ("move", parse_move),
    ("delete", parse_delete),
    ("clear", parse_clear),
    ("grid", parse_grid),
    ("zoom_all", parse_zoom_all),
]

@app.post("/api/parse", response_model=NLResponse)
def parse_nl(req: NLRequest):
    text = req.text.strip()
    for name, parser in PARSERS:
        result = parser(text)
        if result is not None:
            return NLResponse(commands=result, raw_text=text)
    return NLResponse(
        commands=[{"action": "error", "params": {"message": "無法理解的指令，請嘗試：畫線、畫圓、畫弧、刪除、移動、網格、縮放等"}}],
        raw_text=text
    )

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
