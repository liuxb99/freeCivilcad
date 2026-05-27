import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.command_log import CommandLog
import tempfile
import json


def test_record_and_get_history():
    log = CommandLog()
    log.record(type="ADD_ENTITY", entity_id="e1", after={"id": "e1", "type": "LINE"}, description="add line")
    log.record(type="DELETE_ENTITY", entity_id="e2", before={"id": "e2"}, description="delete circle")

    history = log.get_history(session_id="default")
    assert len(history) >= 2

    types = [h["type"] for h in history]
    assert "ADD_ENTITY" in types
    assert "DELETE_ENTITY" in types


def test_sessions():
    log = CommandLog()
    log.record(type="MOVE_ENTITY", entity_id="e3", session_id="session-test")
    sessions = log.get_sessions()
    session_ids = [s["session_id"] for s in sessions]
    assert "session-test" in session_ids


def test_undo():
    log = CommandLog()
    before = {"id": "e4", "x": 10}
    after = {"id": "e4", "x": 20}
    log.record(type="MOVE_ENTITY", entity_id="e4", before=before, after=after, description="move e4")
    result = log.undo()
    assert result is not None
    assert result["x"] == 10


def test_redo():
    log = CommandLog()
    before = {"id": "e5", "x": 0}
    after = {"id": "e5", "x": 100}
    log.record(type="MOVE_ENTITY", entity_id="e5", before=before, after=after, description="move e5")
    log.undo()
    result = log.redo()
    assert result is not None
    assert result["x"] == 100


def test_replay():
    log = CommandLog()
    log.record(type="ADD_ENTITY", entity_id="e6", session_id="replay-test")
    log.record(type="ADD_ENTITY", entity_id="e7", session_id="replay-test")
    commands = log.replay("replay-test")
    assert len(commands) >= 2


def test_multiple_sessions():
    log = CommandLog()
    log.record(type="ADD_ENTITY", entity_id="s1", session_id="session-a")
    log.record(type="ADD_ENTITY", entity_id="s2", session_id="session-b")
    hist_a = log.get_history(session_id="session-a")
    hist_b = log.get_history(session_id="session-b")
    assert len(hist_a) >= 1
    assert len(hist_b) >= 1
