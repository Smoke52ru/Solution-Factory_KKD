def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["latest_completed_run_id"] == "RUN-008"


def test_runs_history_has_failed_run(client):
    items = client.get("/api/runs").json()["items"]
    assert [r["id"] for r in items][:3] == ["RUN-008", "RUN-007", "RUN-006"]
    failed = next(r for r in items if r["id"] == "RUN-006")
    assert failed["status"] == "failed" and failed["totals"] is None and failed["error"]
    # прогон после неуспешного сравнивается с последним успешным
    assert next(r for r in items if r["id"] == "RUN-007")["compared_to_run_id"] == "RUN-005"


def test_summary_metrics_and_delta(client):
    body = client.get("/api/kkd/summary").json()
    assert body["run"]["id"] == "RUN-008" and body["compared_to"]["id"] == "RUN-007"
    keys = {m["key"] for m in body["metrics"]}
    assert {"clean_goals_share", "issues_total", "cascade_coverage"} <= keys
    total = next(m for m in body["metrics"] if m["key"] == "issues_total")["value"]
    assert sum(s["current"] for s in body["issues_by_severity"]) == total
    assert body["delta"]["new"] + body["delta"]["persisting"] == total


def test_first_run_has_no_delta(client):
    body = client.get("/api/kkd/summary?run_id=RUN-001").json()
    assert body["compared_to"] is None
    assert body["delta"] == {"new": None, "persisting": None, "resolved": None}
    assert all(m["previous"] is None for m in body["metrics"])


def test_failed_and_unknown_run(client):
    assert client.get("/api/kkd/summary?run_id=RUN-006").json()["error"]["code"] == "RUN_FAILED"
    assert client.get("/api/kkd/summary?run_id=RUN-999").status_code == 404


def test_demo_units(client):
    units = {u["id"]: u for u in client.get("/api/kkd/units").json()["items"]}
    assert units["TX-SAL"]["issues_total"] == 0 and units["TX-SAL"]["clean_goals_share"] == 100
    assert units["TX-NEW"]["goals_active"] == 0 and units["TX-NEW"]["clean_goals_share"] is None
    assert units["CIB-REG"]["clean_goals_share_delta"] < -10
    assert units["HQ-SME"]["clean_goals_share_delta"] > 0
    # каскад: метрики департамента включают дочерние подразделения
    children = [u for u in units.values() if u["parent_id"] == "HQ-CIB"]
    assert units["HQ-CIB"]["goals_active"] >= sum(u["goals_active"] for u in children)


def test_issue_filters_and_pagination(client):
    page = client.get("/api/kkd/issues?severity=critical&limit=2").json()
    assert page["limit"] == 2 and len(page["items"]) <= 2
    assert all(i["severity"] == "critical" for i in page["items"])
    resolved = client.get("/api/kkd/issues?delta_status=resolved").json()
    assert resolved["total"] > 0 and all(i["delta_status"] == "resolved" for i in resolved["items"])
    assert client.get("/api/kkd/issues?severity=bad").status_code == 422


def test_issue_card_and_goal_card(client):
    issue = client.get("/api/kkd/issues?unit_id=CIB-KEY&rule_code=GOAL_NO_OWNER").json()["items"][0]
    card = client.get(f"/api/kkd/issues/{issue['id']}").json()
    assert card["history"][-1]["present"] is True
    goal = client.get(f"/api/goals/{issue['goal_id']}").json()
    assert goal["owner"] is None and len(goal["issues"]) >= 3


def test_trend_skips_failed_run(client):
    points = client.get("/api/kkd/trend?metric=issues_total").json()["points"]
    assert len(points) == 8
    assert next(p for p in points if p["run_id"] == "RUN-006")["value"] is None


def test_manual_run(client):
    started = client.post("/api/runs")
    assert started.status_code == 202
    run_id = started.json()["id"]
    assert run_id == "RUN-009"
    assert client.get(f"/api/runs/{run_id}").json()["status"] == "completed"
    assert client.get("/api/kkd/summary").json()["compared_to"]["id"] == "RUN-008"


def test_export_csv(client):
    resp = client.get("/api/kkd/issues/export?unit_id=CIB-REG")
    assert resp.status_code == 200 and "text/csv" in resp.headers["content-type"]
    assert resp.text.lstrip("﻿").startswith("ID проблемы;")
