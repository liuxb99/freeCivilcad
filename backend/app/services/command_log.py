import sqlite3
import json
import uuid
import time
import os
from pathlib import Path
from typing import List, Optional

DB_PATH = Path(__file__).parent.parent.parent / "data" / "commands.db"


class CommandLog:
    def __init__(self):
        os.makedirs(str(DB_PATH.parent), exist_ok=True)
        self.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self._init_db()
        self._buffer = []
        self._undo_timestamps = {}

    def _init_db(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS commands (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                timestamp REAL,
                type TEXT,
                entity_id TEXT,
                before_state TEXT,
                after_state TEXT,
                description TEXT
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                created_at REAL,
                last_active_at REAL
            )
        """)
        self.conn.commit()

    def record(self, type: str, entity_id: str, before: dict = None, after: dict = None, description: str = "", session_id: str = None):
        record = {
            "id": str(uuid.uuid4()),
            "session_id": session_id or "default",
            "timestamp": time.time(),
            "type": type,
            "entity_id": entity_id,
            "before_state": json.dumps(before) if before else None,
            "after_state": json.dumps(after) if after else None,
            "description": description,
        }
        self._buffer.append(record)
        self.conn.execute(
            "INSERT INTO commands VALUES (?,?,?,?,?,?,?,?)",
            (record["id"], record["session_id"], record["timestamp"], record["type"],
             record["entity_id"], record["before_state"], record["after_state"], record["description"])
        )
        self.conn.execute(
            "INSERT OR REPLACE INTO sessions VALUES (?,?,?)",
            (record["session_id"], time.time(), time.time())
        )
        self.conn.commit()
        return record

    def _row_to_dict(self, row, cursor):
        return dict(zip([col[0] for col in cursor.description], row))

    def get_history(self, session_id: str = None, limit: int = 100, offset: int = 0) -> List[dict]:
        if session_id:
            cur = self.conn.execute(
                "SELECT * FROM commands WHERE session_id=? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                (session_id, limit, offset)
            )
        else:
            cur = self.conn.execute(
                "SELECT * FROM commands ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                (limit, offset)
            )
        return [self._row_to_dict(row, cur) for row in cur.fetchall()]

    def get_sessions(self) -> List[dict]:
        cur = self.conn.execute("SELECT * FROM sessions ORDER BY last_active_at DESC")
        return [self._row_to_dict(row, cur) for row in cur.fetchall()]

    def undo(self, session_id: str = "default"):
        cur = self.conn.execute(
            "SELECT * FROM commands WHERE session_id=? ORDER BY timestamp DESC LIMIT 1",
            (session_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        record = self._row_to_dict(row, cur)
        self._undo_timestamps[session_id] = record["timestamp"]
        return json.loads(record["before_state"]) if record["before_state"] else None

    def redo(self, session_id: str = "default"):
        ts = self._undo_timestamps.get(session_id)
        if ts is None:
            return None
        cur = self.conn.execute(
            "SELECT * FROM commands WHERE session_id=? AND timestamp >= ? ORDER BY timestamp ASC LIMIT 1",
            (session_id, ts)
        )
        row = cur.fetchone()
        if not row:
            return None
        record = self._row_to_dict(row, cur)
        self._undo_timestamps[session_id] = record["timestamp"] + 0.000001
        return json.loads(record["after_state"]) if record["after_state"] else None

    def replay(self, session_id: str):
        cur = self.conn.execute(
            "SELECT * FROM commands WHERE session_id=? ORDER BY timestamp ASC",
            (session_id,)
        )
        return [self._row_to_dict(row, cur) for row in cur.fetchall()]

    def close(self):
        self.conn.close()


command_log = CommandLog()
