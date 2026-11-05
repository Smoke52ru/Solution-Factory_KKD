"""Прогоны ККД и кэш результатов. Всё хранится в памяти — перезапуск сбрасывает состояние."""
import os
import random
from datetime import date, datetime, timedelta, timezone

from . import engine
from .catalog import UNIT_BY_ID
from .data import Dataset

MSK = timezone(timedelta(hours=3))
HISTORY_RUNS = 8
FAILED_RUN_NO = 6
FAILED_REASON = "Таймаут выгрузки данных из системы управления целями. Результаты не сохранены."


def today() -> date:
    raw = os.getenv("MOCK_TODAY")
    return date.fromisoformat(raw) if raw else date.today()


def run_duration() -> float:
    return float(os.getenv("MOCK_RUN_DURATION_SEC", "6"))


class Store:
    def __init__(self):
        self.ds = Dataset(last_run_no=HISTORY_RUNS)
        self.runs: list[dict] = []
        self._results: dict[int, dict] = {}
        rng = random.Random(7)
        last_monday = today() - timedelta(days=today().weekday())
        for no in range(1, HISTORY_RUNS + 1):
            day = last_monday - timedelta(weeks=HISTORY_RUNS - no)
            started = datetime(day.year, day.month, day.day, 6, 0, tzinfo=MSK)
            failed = no == FAILED_RUN_NO
            self.runs.append({
                "no": no, "snapshot_date": day, "trigger": "schedule",
                "started_at": started,
                "finished_at": started + timedelta(minutes=rng.randint(2, 9) if failed else rng.randint(4, 14)),
                "failed": failed,
            })

    # ---------- прогоны ----------
    @staticmethod
    def run_id(no: int) -> str:
        return f"RUN-{no:03d}"

    def status(self, run: dict) -> str:
        if run["failed"]:
            return "failed"
        if run["finished_at"] > datetime.now(MSK):
            return "running"
        return "completed"

    def find(self, run_id: str) -> dict | None:
        if run_id == "latest":
            return self.latest_completed()
        return next((r for r in self.runs if self.run_id(r["no"]) == run_id), None)

    def latest_completed(self) -> dict | None:
        done = [r for r in self.runs if self.status(r) == "completed"]
        return done[-1] if done else None

    def previous_completed(self, run: dict) -> dict | None:
        done = [r for r in self.runs if r["no"] < run["no"] and self.status(r) == "completed"]
        return done[-1] if done else None

    def running(self) -> dict | None:
        return next((r for r in self.runs if self.status(r) == "running"), None)

    def start_run(self) -> dict:
        now = datetime.now(MSK)
        run = {"no": self.runs[-1]["no"] + 1, "snapshot_date": today(), "trigger": "manual",
               "started_at": now, "finished_at": now + timedelta(seconds=run_duration()),
               "failed": False}
        self.runs.append(run)
        return run

    # ---------- результаты ----------
    def results(self, run: dict) -> dict:
        if run["no"] not in self._results:
            snap = engine.build_snapshot(self.ds, run["no"], run["snapshot_date"])
            self._results[run["no"]] = {"snap": snap, "issues": engine.check_rules(snap)}
        return self._results[run["no"]]

    def totals(self, run: dict) -> dict | None:
        if self.status(run) != "completed":
            return None
        res = self.results(run)
        m = engine.compute_metrics(res["snap"], res["issues"], "B2B")
        return {"goals_active": m["goals_active"], "key_results": m["key_results"],
                "issues_total": m["issues_total"], **engine.by_severity(res["issues"]),
                "clean_goals_share": m["clean_goals_share"]}

    def run_view(self, run: dict, with_totals: bool = True) -> dict:
        status = self.status(run)
        prev = self.previous_completed(run)
        view = {
            "id": self.run_id(run["no"]), "number": run["no"], "status": status,
            "trigger": run["trigger"],
            "snapshot_date": run["snapshot_date"].isoformat(),
            "started_at": run["started_at"].isoformat(timespec="seconds"),
            "finished_at": run["finished_at"].isoformat(timespec="seconds") if status != "running" else None,
            "compared_to_run_id": self.run_id(prev["no"]) if prev else None,
            "error": FAILED_REASON if status == "failed" else None,
        }
        if with_totals:
            view["totals"] = self.totals(run)
        return view

    # ---------- проблемы с дельтой ----------
    def enriched_issues(self, run: dict) -> tuple[list[dict], list[dict]]:
        """(проблемы прогона с delta_status new/persisting, исправленные с delta_status resolved)."""
        current = self.results(run)["issues"]
        prev = self.previous_completed(run)
        prev_issues = self.results(prev)["issues"] if prev else []
        prev_fps = {i["fingerprint"] for i in prev_issues}
        cur_fps = {i["fingerprint"] for i in current}
        history = [r for r in self.runs if r["no"] <= run["no"] and self.status(r) == "completed"]
        fp_sets = [(r, {i["fingerprint"] for i in self.results(r)["issues"]}) for r in history]

        def first_detected(fp: str) -> tuple[dict, int]:
            first, streak = run, 0
            for r, fps in reversed(fp_sets):
                if fp not in fps:
                    break
                first, streak = r, streak + 1
            return first, streak

        out = []
        for i in current:
            first, streak = first_detected(i["fingerprint"])
            out.append(self._decorate(i, "persisting" if i["fingerprint"] in prev_fps else "new",
                                      first, streak if prev else 1))
        resolved = [self._decorate(i, "resolved", None, None)
                    for i in prev_issues if i["fingerprint"] not in cur_fps]
        return out, resolved

    def _decorate(self, issue: dict, delta_status: str, first: dict | None, streak: int | None) -> dict:
        owner = self.ds.employees.get(issue["owner_id"]) if issue["owner_id"] else None
        return {
            **{k: v for k, v in issue.items() if k not in ("owner_id", "fingerprint")},
            "unit_name": UNIT_BY_ID[issue["unit_id"]]["name"],
            "owner": {"id": owner["id"], "full_name": owner["full_name"],
                      "position": owner["position"]} if owner else None,
            "delta_status": delta_status,
            "first_detected_run_id": self.run_id(first["no"]) if first else None,
            "first_detected_at": first["snapshot_date"].isoformat() if first else None,
            "runs_in_row": streak,
        }


store = Store()


def reset():
    global store
    store = Store()
    return store
