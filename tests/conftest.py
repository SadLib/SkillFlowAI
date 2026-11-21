import pytest


@pytest.fixture(autouse=True)
def isolated_demo_database(monkeypatch, tmp_path):
    monkeypatch.setenv("SKILLFLOW_DB_PATH", str(tmp_path / "workflows.sqlite3"))
