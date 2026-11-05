"""Mock API модуля ККД — контроля качества данных по целям и ключевым результатам сотрудников."""
import asyncio
import csv
import io
import os
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from . import engine
from . import store as st
from .catalog import (GOAL_LEVELS, RULE_BY_CODE, RULES, SEVERITIES, SEVERITY_ORDER, UNIT_BY_ID,
                      UNITS, ancestors_or_self, descendants_or_self)

app = FastAPI(
    title="Mock API модуля ККД — контроль качества данных по целям",
    description="Синтетические данные модуля контроля качества данных по целям и ключевым результатам.",
    version="1.0.0",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
                   expose_headers=["Content-Disposition"])


@app.middleware("http")
async def latency(request: Request, call_next):
    delay = int(os.getenv("MOCK_LATENCY_MS", "300"))
    if delay and request.url.path.startswith("/api/"):
        await asyncio.sleep(delay / 1000)
    return await call_next(request)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    code, message = exc.detail if isinstance(exc.detail, tuple) else ("ERROR", str(exc.detail))
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": code, "message": message}})


def S() -> st.Store:
    return st.store


def fail(status: int, code: str, message: str):
    raise HTTPException(status, (code, message))


def completed_run(run_id: str) -> dict:
    run = S().find(run_id)
    if run is None:
        fail(404, "RUN_NOT_FOUND", f"Прогон {run_id} не найден")
    status = S().status(run)
    if status == "failed":
        fail(409, "RUN_FAILED", f"Прогон {run_id} завершился с ошибкой — результатов нет")
    if status == "running":
        fail(409, "RUN_IN_PROGRESS", f"Прогон {run_id} ещё выполняется")
    return run


def unit_or_404(unit_id: str) -> dict:
    if unit_id not in UNIT_BY_ID:
        fail(404, "UNIT_NOT_FOUND", f"Подразделение {unit_id} не найдено")
    return UNIT_BY_ID[unit_id]


def unit_view(unit_id: str) -> dict:
    u = UNIT_BY_ID[unit_id]
    path = [{"id": a, "name": UNIT_BY_ID[a]["name"]} for a in reversed(ancestors_or_self(unit_id))]
    return {"id": u["id"], "name": u["name"], "level": u["level"], "parent_id": u["parent_id"], "path": path}


def csv_param(raw: str | None, allowed: set[str], name: str) -> set[str] | None:
    if not raw:
        return None
    values = {v.strip() for v in raw.split(",") if v.strip()}
    unknown = values - allowed
    if unknown:
        fail(422, "INVALID_PARAM", f"Недопустимые значения {name}: {', '.join(sorted(unknown))}")
    return values


# ---------------------------------------------------------------- служебное

@app.get("/health", tags=["service"])
def health():
    s = S()
    latest = s.latest_completed()
    return {"status": "ok", "today": st.today().isoformat(), "runs": len(s.runs),
            "latest_completed_run_id": s.run_id(latest["no"]) if latest else None,
            "goals_in_dataset": len(s.ds.goals), "key_results_in_dataset": len(s.ds.krs),
            "latency_ms": int(os.getenv("MOCK_LATENCY_MS", "300"))}


@app.post("/api/reset", tags=["service"], summary="Вернуть демо-данные в исходное состояние")
def reset():
    st.reset()
    return {"status": "ok"}


@app.get("/api/meta", tags=["справочники"])
def meta():
    depth = {u["id"]: len(ancestors_or_self(u["id"])) - 1 for u in UNITS}
    return {
        "units": [{**u, "depth": depth[u["id"]]} for u in UNITS],
        "rules": RULES,
        "severities": SEVERITIES,
        "goal_levels": [{"code": k, **v} for k, v in GOAL_LEVELS.items()],
        "metrics": [{k: m[k] for k in ("key", "title", "unit", "higher_is_better", "formula")}
                    for m in engine.METRIC_DEFS],
        "delta_statuses": [{"code": "new", "title": "Новая"},
                           {"code": "persisting", "title": "Сохраняется"},
                           {"code": "resolved", "title": "Исправлена"}],
    }


# ---------------------------------------------------------------- прогоны

@app.get("/api/runs", tags=["прогоны"])
def list_runs(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    runs = list(reversed(S().runs))
    return {"items": [S().run_view(r) for r in runs[offset:offset + limit]],
            "total": len(runs), "limit": limit, "offset": offset}


@app.get("/api/runs/{run_id}", tags=["прогоны"])
def get_run(run_id: str):
    run = S().find(run_id)
    if run is None:
        fail(404, "RUN_NOT_FOUND", f"Прогон {run_id} не найден")
    return S().run_view(run)


@app.post("/api/runs", status_code=202, tags=["прогоны"],
          summary="Запустить внеплановый прогон ККД (выполняется несколько секунд)")
def start_run():
    if S().running():
        fail(409, "RUN_IN_PROGRESS", "Прогон уже выполняется — дождитесь завершения")
    return S().run_view(S().start_run())


# ---------------------------------------------------------------- результаты ККД

@app.get("/api/kkd/summary", tags=["результаты ККД"])
def summary(run_id: str = "latest", unit_id: str = "B2B"):
    unit_or_404(unit_id)
    s = S()
    run = completed_run(run_id)
    prev = s.previous_completed(run)
    res = s.results(run)
    cur_m = engine.compute_metrics(res["snap"], res["issues"], unit_id)
    prev_m = prev_issues = None
    if prev:
        pres = s.results(prev)
        prev_m = engine.compute_metrics(pres["snap"], pres["issues"], unit_id)
        prev_issues = engine.in_scope(pres["issues"], unit_id)
    cur_issues = engine.in_scope(res["issues"], unit_id)
    issues, resolved = s.enriched_issues(run)
    issues, resolved = engine.in_scope(issues, unit_id), engine.in_scope(resolved, unit_id)

    def rows(cur: dict, prv: dict | None, catalog: list[dict], extra) -> list[dict]:
        out = []
        for item in catalog:
            c = cur[item["code"]]
            p = prv[item["code"]] if prv is not None else None
            out.append({"code": item["code"], "title": item["title"], **extra(item),
                        "current": c, "previous": p, "delta": c - p if p is not None else None})
        return out

    return {
        "run": s.run_view(run, with_totals=False),
        "compared_to": s.run_view(prev, with_totals=False) if prev else None,
        "unit": unit_view(unit_id),
        "metrics": engine.metric_rows(cur_m, prev_m),
        "issues_by_severity": rows(engine.by_severity(cur_issues),
                                   engine.by_severity(prev_issues) if prev else None,
                                   SEVERITIES, lambda _: {}),
        "issues_by_rule": rows(engine.by_rule(cur_issues),
                               engine.by_rule(prev_issues) if prev else None,
                               RULES, lambda r: {"severity": r["severity"], "object_type": r["object_type"]}),
        "delta": {
            "new": sum(1 for i in issues if i["delta_status"] == "new") if prev else None,
            "persisting": sum(1 for i in issues if i["delta_status"] == "persisting") if prev else None,
            "resolved": len(resolved) if prev else None,
        },
    }


@app.get("/api/kkd/units", tags=["результаты ККД"],
         summary="Метрики по оргструктуре (с учётом каскада: подразделение + все дочерние)")
def units(run_id: str = "latest"):
    s = S()
    run = completed_run(run_id)
    prev = s.previous_completed(run)
    res = s.results(run)
    pres = s.results(prev) if prev else None
    issues, resolved = s.enriched_issues(run)
    items = []
    for u in UNITS:
        cur = engine.compute_metrics(res["snap"], res["issues"], u["id"])
        prv = engine.compute_metrics(pres["snap"], pres["issues"], u["id"]) if pres else None
        share, share_prev = cur["clean_goals_share"], prv["clean_goals_share"] if prv else None
        u_issues = engine.in_scope(issues, u["id"])
        items.append({
            "id": u["id"], "name": u["name"], "level": u["level"], "parent_id": u["parent_id"],
            "depth": len(ancestors_or_self(u["id"])) - 1,
            "goals_active": cur["goals_active"], "goals_with_issues": cur["goals_with_issues"],
            "issues_total": cur["issues_total"], "critical_issues": cur["critical_issues"],
            "clean_goals_share": share, "clean_goals_share_previous": share_prev,
            "clean_goals_share_delta": round(share - share_prev, 1)
            if share is not None and share_prev is not None else None,
            "new_issues": sum(1 for i in u_issues if i["delta_status"] == "new") if prev else None,
            "resolved_issues": len(engine.in_scope(resolved, u["id"])) if prev else None,
        })
    return {"run": s.run_view(run, with_totals=False),
            "compared_to": s.run_view(prev, with_totals=False) if prev else None, "items": items}


def filtered_issues(run_id, unit_id, rule_code, severity, delta_status, object_type, q, sort):
    unit_or_404(unit_id)
    run = completed_run(run_id)
    rules = csv_param(rule_code, set(RULE_BY_CODE), "rule_code")
    sevs = csv_param(severity, set(SEVERITY_ORDER), "severity")
    statuses = csv_param(delta_status, {"new", "persisting", "resolved"}, "delta_status")
    issues, resolved = S().enriched_issues(run)
    pool = issues + resolved if statuses and "resolved" in statuses else issues
    items = [i for i in engine.in_scope(pool, unit_id)
             if (not rules or i["rule_code"] in rules)
             and (not sevs or i["severity"] in sevs)
             and (not statuses or i["delta_status"] in statuses)
             and (not object_type or i["object_type"] == object_type)]
    if q:
        needle = q.strip().lower()
        items = [i for i in items if needle in " ".join(filter(None, [
            i["goal_id"], i["goal_title"], i["kr_title"], i["kr_id"],
            i["owner"]["full_name"] if i["owner"] else None])).lower()]
    keys = {
        "severity": lambda i: (SEVERITY_ORDER[i["severity"]], -(i["runs_in_row"] or 0), i["object_id"]),
        "age": lambda i: (-(i["runs_in_row"] or 0), SEVERITY_ORDER[i["severity"]], i["object_id"]),
        "unit": lambda i: (i["unit_name"], SEVERITY_ORDER[i["severity"]], i["object_id"]),
        "rule": lambda i: (i["rule_code"], i["object_id"]),
    }
    return run, sorted(items, key=keys[sort])


IssueSort = Literal["severity", "age", "unit", "rule"]


@app.get("/api/kkd/issues", tags=["результаты ККД"])
def list_issues(
    run_id: str = "latest", unit_id: str = "B2B",
    rule_code: str | None = Query(None, description="Через запятую: GOAL_NO_OWNER,KR_NO_TARGET"),
    severity: str | None = Query(None, description="Через запятую: critical,major,minor"),
    delta_status: str | None = Query(None, description="Через запятую: new,persisting,resolved"),
    object_type: Literal["goal", "key_result"] | None = None,
    q: str | None = Query(None, description="Поиск по ID/названию цели или КР и ФИО ответственного"),
    sort: IssueSort = "severity",
    limit: int = Query(20, ge=1, le=200), offset: int = Query(0, ge=0),
):
    run, items = filtered_issues(run_id, unit_id, rule_code, severity, delta_status, object_type, q, sort)
    return {"run_id": S().run_id(run["no"]), "items": items[offset:offset + limit],
            "total": len(items), "limit": limit, "offset": offset}


@app.get("/api/kkd/issues/export", tags=["результаты ККД"], summary="Выгрузка проблем в CSV (UTF-8, ;)")
def export_issues(
    run_id: str = "latest", unit_id: str = "B2B", rule_code: str | None = None,
    severity: str | None = None, delta_status: str | None = None,
    object_type: Literal["goal", "key_result"] | None = None, q: str | None = None,
):
    run, items = filtered_issues(run_id, unit_id, rule_code, severity, delta_status, object_type, q, "severity")
    buf = io.StringIO()
    buf.write("﻿")
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(["ID проблемы", "Правило", "Важность", "Статус", "Подразделение", "Цель",
                     "Название цели", "КР", "Ответственный", "Описание", "Рекомендация"])
    sev_title = {s["code"]: s["title"] for s in SEVERITIES}
    status_title = {"new": "Новая", "persisting": "Сохраняется", "resolved": "Исправлена"}
    for i in items:
        writer.writerow([i["id"], i["rule_title"], sev_title[i["severity"]], status_title[i["delta_status"]],
                         i["unit_name"], i["goal_id"], i["goal_title"], i["kr_title"] or "",
                         i["owner"]["full_name"] if i["owner"] else "", i["details"], i["recommendation"]])
    name = f"kkd_issues_{S().run_id(run['no'])}_{unit_id}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{name}"'})


@app.get("/api/kkd/issues/{issue_id}", tags=["результаты ККД"],
         summary="Карточка проблемы с историей по прогонам")
def get_issue(issue_id: str, run_id: str = "latest"):
    s = S()
    run = completed_run(run_id)
    issues, resolved = s.enriched_issues(run)
    issue = next((i for i in issues + resolved if i["id"] == issue_id), None)
    if issue is None:
        fail(404, "ISSUE_NOT_FOUND", f"Проблема {issue_id} не найдена в прогоне {s.run_id(run['no'])}")
    history = []
    for r in s.runs:
        if r["no"] > run["no"]:
            break
        status = s.status(r)
        present = None
        if status == "completed":
            present = any(i["id"] == issue_id for i in s.results(r)["issues"])
        history.append({"run_id": s.run_id(r["no"]), "snapshot_date": r["snapshot_date"].isoformat(),
                        "run_status": status, "present": present})
    return {**issue, "history": history}


@app.get("/api/kkd/trend", tags=["результаты ККД"], summary="Динамика метрики по последним прогонам")
def trend(unit_id: str = "B2B", metric: str = "clean_goals_share", limit: int = Query(8, ge=2, le=52)):
    unit_or_404(unit_id)
    defs = {m["key"]: m for m in engine.METRIC_DEFS}
    if metric not in defs:
        fail(422, "INVALID_PARAM", f"Неизвестная метрика {metric}. Допустимо: {', '.join(defs)}")
    s = S()
    points = []
    for r in s.runs[-limit:]:
        status = s.status(r)
        value = None
        if status == "completed":
            res = s.results(r)
            value = engine.compute_metrics(res["snap"], res["issues"], unit_id)[metric]
        points.append({"run_id": s.run_id(r["no"]), "snapshot_date": r["snapshot_date"].isoformat(),
                       "run_status": status, "value": value})
    m = defs[metric]
    return {"unit": unit_view(unit_id), "metric": {k: m[k] for k in ("key", "title", "unit", "higher_is_better")},
            "points": points}


# ---------------------------------------------------------------- цели

def goal_short(goal: dict, snap: dict) -> dict:
    owner = S().ds.employees.get(goal["owner_id"]) if goal["owner_id"] else None
    return {"id": goal["id"], "title": goal["title"], "level": goal["level"], "status": goal["status"],
            "unit_id": goal["unit_id"], "unit_name": UNIT_BY_ID[goal["unit_id"]]["name"],
            "owner": {"id": owner["id"], "full_name": owner["full_name"]} if owner else None,
            "key_results_count": sum(1 for k in goal["kr_ids"] if k in snap["krs"])}


@app.get("/api/goals", tags=["цели"])
def list_goals(
    run_id: str = "latest", unit_id: str = "B2B",
    level: Literal["block", "hq", "unit", "employee"] | None = None,
    has_issues: bool | None = None, q: str | None = None,
    limit: int = Query(20, ge=1, le=200), offset: int = Query(0, ge=0),
):
    unit_or_404(unit_id)
    run = completed_run(run_id)
    res = S().results(run)
    scope = descendants_or_self(unit_id)
    issue_count: dict[str, int] = {}
    for i in res["issues"]:
        issue_count[i["goal_id"]] = issue_count.get(i["goal_id"], 0) + 1
    goals = [g for g in res["snap"]["goals"].values() if g["unit_id"] in scope
             and (not level or g["level"] == level)
             and (has_issues is None or (issue_count.get(g["id"], 0) > 0) == has_issues)
             and (not q or q.lower() in (g["id"] + " " + g["title"]).lower())]
    goals.sort(key=lambda g: (GOAL_LEVELS[g["level"]]["order"], g["id"]))
    return {"run_id": S().run_id(run["no"]),
            "items": [{**goal_short(g, res["snap"]), "issues_count": issue_count.get(g["id"], 0)}
                      for g in goals[offset:offset + limit]],
            "total": len(goals), "limit": limit, "offset": offset}


@app.get("/api/goals/{goal_id}", tags=["цели"], summary="Карточка цели: КР, каскад и проблемы")
def get_goal(goal_id: str, run_id: str = "latest"):
    s = S()
    run = completed_run(run_id)
    res = s.results(run)
    snap = res["snap"]
    goal = snap["goals"].get(goal_id)
    if goal is None:
        fail(404, "GOAL_NOT_FOUND", f"Цель {goal_id} отсутствует в данных прогона {s.run_id(run['no'])}")
    issues, _ = s.enriched_issues(run)
    parent = snap["goals"].get(goal["parent_id"]) if goal["parent_id"] else None
    children = sorted((g for g in snap["goals"].values() if g["parent_id"] == goal_id), key=lambda g: g["id"])
    krs = [snap["krs"][k] for k in goal["kr_ids"] if k in snap["krs"]]
    return {
        **goal_short(goal, snap),
        "unit": unit_view(goal["unit_id"]),
        "deadline": goal["deadline"].isoformat(),
        "period": {"from": f"{snap['year']}-01-01", "to": f"{snap['year']}-12-31"},
        "key_results": [{
            "id": k["id"], "title": k["title"], "metric_unit": k["metric_unit"], "baseline": k["baseline"],
            "target": k["target"], "fact": k["fact"], "weight": k["weight"],
            "progress_updated_at": k["progress_updated_at"].isoformat(),
        } for k in krs],
        "parent": goal_short(parent, snap) if parent else None,
        "children": [goal_short(c, snap) for c in children],
        "issues": [i for i in issues if i["goal_id"] == goal_id],
        "run_id": s.run_id(run["no"]),
    }
