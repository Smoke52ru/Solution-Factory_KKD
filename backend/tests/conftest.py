import os

os.environ["MOCK_LATENCY_MS"] = "0"
os.environ["MOCK_RUN_DURATION_SEC"] = "0"
os.environ.setdefault("MOCK_TODAY", "2026-10-28")

import pytest
from fastapi.testclient import TestClient

from app import store
from app.main import app


@pytest.fixture()
def client():
    store.reset()
    return TestClient(app)
