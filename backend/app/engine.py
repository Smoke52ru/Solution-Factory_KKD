"""Движок ККД: снимок данных на прогон, проверка правил, метрики и дельта."""
import calendar
import copy
import hashlib
from datetime import date, timedelta

from .catalog import (GOAL_LEVELS, OUTLIER_RATIO, RULE_BY_CODE, RULES, SEVERITIES,
                      SEVERITY_ORDER, STALE_DAYS, UNIT_BY_ID, ancestors_or_self,
                      descendants_or_self)
from .data import Dataset


def issue_id(fingerprint: str) -> str:
    return "ISS-" + hashlib.sha1(fingerprint.encode()).hexdigest()[:10].upper()


def build_snapshot(ds: Dataset, run_no: int, snapshot_date: date) -> dict:
    """Состояние целей и КР на момент прогона run_no."""
    year = snapshot_date.year
    goals, krs = {}, {}
    for g in ds.goals.values():
        if not (g["created_run"] <= run_no < g["removed_run"]):
            continue
        goal = copy.deepcopy(g)
        last_day = calendar.monthrange(year, goal["deadline_month"])[1]
        goal["deadline"] = date(year, goal["deadline_month"], last_day)
        goals[goal["id"]] = goal
        for kr_id in goal["kr_ids"]:
            kr = copy.deepcopy(ds.krs[kr_id])
            kr["progress_updated_at"] = snapshot_date - timedelta(days=kr["progress_lag_days"])
            krs[kr_id] = kr

    for d in ds.defects:
        if not (d["appear"] <= run_no < d["fix"]):
            continue
        rule, tid = d["rule"], d["target_id"]
        if tid not in goals and tid not in krs:
            continue
        if rule == "GOAL_NO_OWNER":
            goals[tid]["owner_id"] = None
        elif rule == "GOAL_NO_KR":
            for kr_id in goals[tid]["kr_ids"]:
                krs.pop(kr_id, None)
            goals[tid]["kr_ids"] = []
        elif rule == "KR_WEIGHTS_SUM" and goals[tid]["kr_ids"]:
            krs[goals[tid]["kr_ids"][0]]["weight"] += d["delta"]
        elif rule == "CASCADE_NO_PARENT":
            goals[tid]["parent_id"] = None
        elif rule == "CASCADE_WRONG_LEVEL":
            goals[tid]["parent_id"] = d["new_parent"]
        elif rule == "GOAL_DEADLINE_OUT_OF_PERIOD":
            goals[tid]["deadline"] = date(year + 1, 3, 31)
        elif rule == "PARENT_CANCELLED":
            goals[tid]["status"] = "cancelled"
        elif rule == "KR_NO_TARGET":
            krs[tid]["target"] = None
        elif rule == "KR_NO_UNIT":
            krs[tid]["metric_unit"] = None
        elif rule == "KR_STALE_PROGRESS":
            krs[tid]["progress_updated_at"] = snapshot_date - timedelta(days=d["lag"])
        elif rule == "KR_FACT_OUTLIER" and krs[tid]["target"]:
            krs[tid]["fact"] = round(krs[tid]["target"] * d["ratio"], 1)

    return {"run_no": run_no, "date": snapshot_date, "year": year, "goals": goals, "krs": krs}


def _issue(rule_code: str, goal: dict, kr: dict | None, details: str, actual=None, expected=None):
    rule = RULE_BY_CODE[rule_code]
    object_id = kr["id"] if kr else goal["id"]
    fp = f"{rule_code}:{object_id}"
    return {
        "id": issue_id(fp), "fingerprint": fp, "rule_code": rule_code, "rule_title": rule["title"],
        "severity": rule["severity"], "object_type": rule["object_type"], "object_id": object_id,
        "goal_id": goal["id"], "goal_title": goal["title"], "goal_level": goal["level"],
        "kr_id": kr["id"] if kr else None, "kr_title": kr["title"] if kr else None,
        "unit_id": goal["unit_id"], "owner_id": goal["owner_id"],
        "details": details, "actual": actual, "expected": expected,
        "recommendation": rule["recommendation"],
    }


def check_rules(snap: dict) -> list[dict]:
    goals, krs = snap["goals"], snap["krs"]
    year, today = snap["year"], snap["date"]
    issues = []
    active = [g for g in goals.values() if g["status"] == "active"]

    seen_titles: dict[tuple, str] = {}
    for g in sorted(active, key=lambda x: (x["created_run"], x["id"])):
        key = (g["owner_id"], g["title"].strip().lower())
        if g["owner_id"] and key in seen_titles:
            issues.append(_issue("GOAL_DUPLICATE", g, None,
                                 f"Совпадает по названию с целью {seen_titles[key]}",
                                 actual=g["title"], expected="уникальное название"))
        else:
            seen_titles.setdefault(key, g["id"])

    for g in active:
        g_krs = [krs[k] for k in g["kr_ids"] if k in krs]
        if not g["owner_id"]:
            issues.append(_issue("GOAL_NO_OWNER", g, None, "Поле «Ответственный» не заполнено",
                                 actual=None, expected="сотрудник"))
        if not g_krs:
            issues.append(_issue("GOAL_NO_KR", g, None, "У цели 0 ключевых результатов",
                                 actual=0, expected=">= 1"))
        else:
            total = sum(k["weight"] for k in g_krs)
            if total != 100:
                issues.append(_issue("KR_WEIGHTS_SUM", g, None,
                                     f"Сумма весов КР = {total}%, ожидается 100%",
                                     actual=total, expected=100))
        if g["level"] != "block":
            parent = goals.get(g["parent_id"]) if g["parent_id"] else None
            if parent is None:
                issues.append(_issue("CASCADE_NO_PARENT", g, None,
                                     "Родительская цель не указана", actual=None,
                                     expected="цель вышестоящего уровня"))
            else:
                wrong_level = GOAL_LEVELS[parent["level"]]["order"] >= GOAL_LEVELS[g["level"]]["order"]
                wrong_branch = parent["unit_id"] not in ancestors_or_self(g["unit_id"])
                if wrong_level or wrong_branch:
                    issues.append(_issue(
                        "CASCADE_WRONG_LEVEL", g, None,
                        f"Родительская цель {parent['id']} относится к подразделению "
                        f"«{UNIT_BY_ID[parent['unit_id']]['name']}»",
                        actual=parent["unit_id"], expected=" / ".join(ancestors_or_self(g["unit_id"])[1:])))
                elif parent["status"] != "active":
                    status = "отменена" if parent["status"] == "cancelled" else "закрыта"
                    issues.append(_issue("CASCADE_PARENT_INACTIVE", g, None,
                                         f"Родительская цель {parent['id']} {status}",
                                         actual=parent["status"], expected="active"))
        if not (date(year, 1, 1) <= g["deadline"] <= date(year, 12, 31)):
            issues.append(_issue("GOAL_DEADLINE_OUT_OF_PERIOD", g, None,
                                 f"Срок {g['deadline'].isoformat()} вне периода {year} года",
                                 actual=g["deadline"].isoformat(),
                                 expected=f"{year}-01-01 … {year}-12-31"))
        for k in g_krs:
            if k["target"] is None:
                issues.append(_issue("KR_NO_TARGET", g, k, "Целевое значение не заполнено",
                                     actual=None, expected="число"))
            if not k["metric_unit"]:
                issues.append(_issue("KR_NO_UNIT", g, k, "Единица измерения не указана",
                                     actual=None, expected="единица измерения"))
            age = (today - k["progress_updated_at"]).days
            if age > STALE_DAYS:
                issues.append(_issue("KR_STALE_PROGRESS", g, k,
                                     f"Факт обновлялся {age} дн. назад",
                                     actual=age, expected=f"<= {STALE_DAYS}"))
            if k["target"] and k["target"] > 0 and k["fact"] > OUTLIER_RATIO * k["target"]:
                ratio = round(k["fact"] / k["target"], 1)
                issues.append(_issue("KR_FACT_OUTLIER", g, k,
                                     f"Факт {k['fact']} при цели {k['target']} (×{ratio})",
                                     actual=k["fact"], expected=f"<= {OUTLIER_RATIO * k['target']:g}"))
    issues.sort(key=lambda i: (SEVERITY_ORDER[i["severity"]], i["unit_id"], i["object_id"], i["rule_code"]))
    return issues


# ---------- метрики ----------

METRIC_DEFS = [
    {"key": "clean_goals_share", "title": "Доля корректных целей", "unit": "%", "higher_is_better": True,
     "formula": "активные цели без проблем ÷ все активные цели × 100"},
    {"key": "goals_active", "title": "Активные цели", "unit": "шт.", "higher_is_better": None,
     "formula": "количество целей в статусе active"},
    {"key": "key_results", "title": "Ключевые результаты", "unit": "шт.", "higher_is_better": None,
     "formula": "количество КР активных целей"},
    {"key": "goals_with_issues", "title": "Цели с проблемами", "unit": "шт.", "higher_is_better": False,
     "formula": "активные цели, у которых есть хотя бы одна проблема (по цели или её КР)"},
    {"key": "issues_total", "title": "Найдено проблем", "unit": "шт.", "higher_is_better": False,
     "formula": "количество нарушений правил ККД"},
    {"key": "critical_issues", "title": "Критичные проблемы", "unit": "шт.", "higher_is_better": False,
     "formula": "количество нарушений с severity = critical"},
    {"key": "cascade_coverage", "title": "Покрытие каскадом", "unit": "%", "higher_is_better": True,
     "formula": "цели (кроме уровня блока) с корректной связью с вышестоящей ÷ все такие цели × 100"},
    {"key": "kr_completeness", "title": "Заполненность КР", "unit": "%", "higher_is_better": True,
     "formula": "КР с целевым значением и единицей измерения ÷ все КР × 100"},
    {"key": "avg_kr_per_goal", "title": "КР на цель (среднее)", "unit": "шт.", "higher_is_better": None,
     "formula": "КР активных целей ÷ активные цели"},
]
CASCADE_RULES = {"CASCADE_NO_PARENT", "CASCADE_WRONG_LEVEL", "CASCADE_PARENT_INACTIVE"}


def _share(part: int, total: int):
    return round(part * 100 / total, 1) if total else None


def compute_metrics(snap: dict, issues: list[dict], unit_id: str) -> dict:
    scope = descendants_or_self(unit_id)
    goals = [g for g in snap["goals"].values() if g["status"] == "active" and g["unit_id"] in scope]
    goal_ids = {g["id"] for g in goals}
    krs = [snap["krs"][k] for g in goals for k in g["kr_ids"] if k in snap["krs"]]
    sc_issues = [i for i in issues if i["goal_id"] in goal_ids]
    bad_goals = {i["goal_id"] for i in sc_issues}
    cascade_bad = {i["goal_id"] for i in sc_issues if i["rule_code"] in CASCADE_RULES}
    non_block = [g for g in goals if g["level"] != "block"]
    bad_krs = {i["kr_id"] for i in sc_issues if i["rule_code"] in ("KR_NO_TARGET", "KR_NO_UNIT")}
    return {
        "clean_goals_share": _share(len(goals) - len(bad_goals), len(goals)),
        "goals_active": len(goals),
        "key_results": len(krs),
        "goals_with_issues": len(bad_goals),
        "issues_total": len(sc_issues),
        "critical_issues": sum(1 for i in sc_issues if i["severity"] == "critical"),
        "cascade_coverage": _share(len(non_block) - len(cascade_bad), len(non_block)),
        "kr_completeness": _share(len(krs) - len(bad_krs), len(krs)),
        "avg_kr_per_goal": round(len(krs) / len(goals), 2) if goals else None,
    }


def metric_rows(current: dict, previous: dict | None) -> list[dict]:
    rows = []
    for m in METRIC_DEFS:
        value = current[m["key"]]
        prev = previous[m["key"]] if previous else None
        delta = delta_pct = trend = None
        if value is not None and prev is not None:
            delta = round(value - prev, 2)
            delta_pct = round(delta * 100 / prev, 1) if prev else None
            if delta == 0:
                trend = "same"
            elif m["higher_is_better"] is not None:
                trend = "better" if (delta > 0) == m["higher_is_better"] else "worse"
        rows.append({**m, "value": value, "previous": prev, "delta": delta,
                     "delta_pct": delta_pct, "trend": trend})
    return rows


def in_scope(issues: list[dict], unit_id: str) -> list[dict]:
    scope = descendants_or_self(unit_id)
    return [i for i in issues if i["unit_id"] in scope]


def by_severity(issues: list[dict]) -> dict:
    return {s["code"]: sum(1 for i in issues if i["severity"] == s["code"]) for s in SEVERITIES}


def by_rule(issues: list[dict]) -> dict:
    return {r["code"]: sum(1 for i in issues if i["rule_code"] == r["code"]) for r in RULES}
