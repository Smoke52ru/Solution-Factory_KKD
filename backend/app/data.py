"""Синтетический датасет: сотрудники, цели, ключевые результаты и «дефекты» данных.

Датасет детерминирован (фиксированный seed). Дефект — искажение данных цели или КР,
которое существует в прогонах с номером appear <= run_no < fix. Снимок данных на
конкретный прогон собирается применением активных дефектов к «чистым» данным,
а проблемы находит движок правил (engine.py) — как это делал бы реальный ККД.
"""
import random

from .catalog import UNITS, UNIT_BY_ID

SEED = 42
NEVER = 10_000  # дефект не исправлен

FIRST_NAMES = ["Алексей", "Мария", "Дмитрий", "Анна", "Сергей", "Елена", "Иван", "Ольга",
               "Павел", "Татьяна", "Никита", "Ирина", "Михаил", "Наталья", "Артём", "Юлия",
               "Андрей", "Екатерина", "Роман", "Светлана", "Кирилл", "Дарья", "Олег", "Ксения"]
LAST_NAMES = ["Иванов", "Смирнов", "Кузнецов", "Попов", "Васильев", "Петров", "Соколов",
              "Михайлов", "Новиков", "Фёдоров", "Морозов", "Волков", "Алексеев", "Лебедев",
              "Семёнов", "Егоров", "Павлов", "Козлов", "Степанов", "Николаев", "Орлов",
              "Андреев", "Макаров", "Никитин", "Захаров", "Зайцев", "Соловьёв", "Борисов"]
FEMALE_NAMES = {"Мария", "Анна", "Елена", "Ольга", "Татьяна", "Ирина", "Наталья", "Юлия",
                "Екатерина", "Светлана", "Дарья", "Ксения"}
POSITIONS = ["Главный менеджер", "Ведущий менеджер", "Клиентский менеджер",
             "Старший аналитик", "Эксперт", "Менеджер по продукту"]

GOAL_TITLES = {
    "block": ["Рост комиссионного дохода корпоративного блока", "Увеличение активной клиентской базы",
              "Рост доли цифровых продаж", "Повышение удовлетворённости клиентов (NPS)",
              "Рост кредитного портфеля юридических лиц"],
    "hq": ["Рост операционного дохода департамента", "Привлечение новых клиентов",
           "Снижение оттока клиентов", "Развитие цифровых каналов обслуживания",
           "Рост транзакционной активности клиентов", "Сокращение сроков обслуживания"],
    "unit": ["Выполнение плана продаж подразделения", "Рост доходов от ключевых продуктов",
             "Увеличение числа активных клиентов", "Сокращение срока вывода сделки",
             "Повышение качества клиентского сервиса", "Рост кросс-продаж",
             "Перевод клиентов в цифровые каналы", "Снижение просроченной задолженности"],
    "employee": ["Выполнение личного плана продаж", "Привлечение новых клиентов в портфель",
                 "Рост доходности клиентского портфеля", "Проведение встреч с клиентами",
                 "Развитие компетенций по продуктам", "Сокращение срока обработки заявок",
                 "Подключение клиентов к цифровым сервисам", "Удержание ключевых клиентов"],
}

KR_TEMPLATES = [
    ("Комиссионный доход", "млн ₽", 20, 120),
    ("Количество новых клиентов", "шт.", 10, 400),
    ("NPS клиентов", "п.п.", 30, 75),
    ("Доля цифровых продаж", "%", 15, 80),
    ("Срок вывода сделки", "дн.", 5, 30),
    ("Объём кредитного портфеля", "млрд ₽", 2, 60),
    ("Количество активных ТСП", "шт.", 50, 2000),
    ("Количество встреч с клиентами", "шт.", 20, 200),
    ("Доля клиентов с 3+ продуктами", "%", 10, 60),
    ("Количество закрытых сделок", "шт.", 5, 80),
]

# Сценарии демо-данных по подразделениям
IMPROVING_BRANCH = {"HQ-SME", "SME-ACQ", "SME-SRV", "SME-DIG"}  # качество быстро растёт
CLEAN_UNIT = "TX-SAL"            # к последнему прогону все проблемы исправлены
REORG_UNIT = "CIB-REG"           # реорганизация: в последнем прогоне сломан каскад
EMPTY_UNIT = "TX-NEW"            # новое подразделение, целей ещё нет
SHOWCASE_UNIT = "CIB-KEY"        # первая цель подразделения — «витрина» с несколькими проблемами

GOAL_RULE_P = {"GOAL_NO_OWNER": 0.03, "KR_WEIGHTS_SUM": 0.05, "CASCADE_NO_PARENT": 0.04,
               "CASCADE_WRONG_LEVEL": 0.02, "GOAL_DEADLINE_OUT_OF_PERIOD": 0.04}
EMPLOYEE_ONLY_P = {"GOAL_NO_KR": 0.04, "GOAL_DUPLICATE": 0.03}
KR_RULE_P = {"KR_NO_TARGET": 0.04, "KR_NO_UNIT": 0.03, "KR_STALE_PROGRESS": 0.07,
             "KR_FACT_OUTLIER": 0.02}


def _split_weights(rng: random.Random, n: int) -> list[int]:
    if n == 1:
        return [100]
    step = 5
    parts = [step] * n
    left = 100 - step * n
    while left > 0:
        parts[rng.randrange(n)] += step
        left -= step
    return parts


class Dataset:
    def __init__(self, last_run_no: int = 8):
        self.rng = random.Random(SEED)
        self.last_run_no = last_run_no
        self.employees: dict[str, dict] = {}
        self.goals: dict[str, dict] = {}
        self.krs: dict[str, dict] = {}
        self.defects: list[dict] = []
        self._emp_seq = 0
        self._goal_seq = 0
        self._kr_seq = 0
        self._build()

    # ---------- сотрудники ----------
    def _employee(self, unit_id: str, position: str) -> str:
        self._emp_seq += 1
        first = self.rng.choice(FIRST_NAMES)
        last = self.rng.choice(LAST_NAMES)
        if first in FEMALE_NAMES:
            last = last[:-1] + "а" if last.endswith("й") else last + "а"
        emp_id = f"E-{self._emp_seq:04d}"
        self.employees[emp_id] = {"id": emp_id, "full_name": f"{last} {first}",
                                  "position": position, "unit_id": unit_id}
        return emp_id

    # ---------- цели и КР ----------
    def _goal(self, level: str, unit_id: str, owner_id: str, parent_id: str | None,
              title: str, created_run: int = 1, status: str = "active") -> str:
        self._goal_seq += 1
        goal_id = f"G-{self._goal_seq:05d}"
        rng = self.rng
        self.goals[goal_id] = {
            "id": goal_id, "title": title, "level": level, "unit_id": unit_id,
            "owner_id": owner_id, "parent_id": parent_id, "status": status,
            "deadline_month": rng.choice([12, 12, 12, 9, 6]),
            "created_run": created_run, "removed_run": NEVER, "kr_ids": [],
        }
        n = rng.choice([2, 3, 3, 4]) if level != "employee" else rng.choice([1, 2, 3])
        for template, weight in zip(rng.sample(KR_TEMPLATES, n), _split_weights(rng, n)):
            self._kr(goal_id, template, weight)
        return goal_id

    def _kr(self, goal_id: str, template: tuple, weight: int) -> str:
        self._kr_seq += 1
        kr_id = f"KR-{self._kr_seq:06d}"
        title, unit, lo, hi = template
        rng = self.rng
        target = round(rng.uniform(lo, hi), 1 if hi < 100 else 0)
        baseline = round(target * rng.uniform(0.3, 0.7), 1)
        fact = round(baseline + (target - baseline) * rng.uniform(0.1, 0.95), 1)
        self.krs[kr_id] = {"id": kr_id, "goal_id": goal_id, "title": title, "metric_unit": unit,
                           "baseline": baseline, "target": target, "fact": fact, "weight": weight,
                           "progress_lag_days": rng.randint(0, 25)}
        self.goals[goal_id]["kr_ids"].append(kr_id)
        return kr_id

    def _build(self):
        rng = self.rng
        heads = {u["id"]: self._employee(u["id"], "Руководитель") for u in UNITS}
        staff = {u["id"]: [self._employee(u["id"], rng.choice(POSITIONS)) for _ in range(8)]
                 for u in UNITS if u["level"] == "unit" and u["id"] != EMPTY_UNIT}

        block_goals = [self._goal("block", "B2B", heads["B2B"], None, t)
                       for t in GOAL_TITLES["block"]]
        hq_goals: dict[str, list[str]] = {}
        unit_goals: dict[str, list[str]] = {}
        for hq in (u for u in UNITS if u["level"] == "hq"):
            hq_goals[hq["id"]] = [
                self._goal("hq", hq["id"], heads[hq["id"]], rng.choice(block_goals), t)
                for t in rng.sample(GOAL_TITLES["hq"], 5)]
        for unit in (u for u in UNITS if u["level"] == "unit" and u["id"] != EMPTY_UNIT):
            unit_goals[unit["id"]] = [
                self._goal("unit", unit["id"], heads[unit["id"]],
                           rng.choice(hq_goals[unit["parent_id"]]), t)
                for t in rng.sample(GOAL_TITLES["unit"], 6)]
            for emp_id in staff[unit["id"]]:
                for t in rng.sample(GOAL_TITLES["employee"], 2):
                    created = 1 if rng.random() < 0.85 else rng.randint(2, self.last_run_no + 1)
                    status = "closed" if rng.random() < 0.03 else "active"
                    self._goal("employee", unit["id"], emp_id,
                               rng.choice(unit_goals[unit["id"]]), t, created, status)
        self._build_defects(hq_goals)

    # ---------- дефекты ----------
    def _window(self, unit_id: str) -> tuple[int, int]:
        rng = self.rng
        last = self.last_run_no
        if unit_id == CLEAN_UNIT:
            appear = rng.randint(1, last - 3)
            return appear, rng.randint(appear + 1, last - 1)
        appear = 1 if rng.random() < 0.7 else rng.randint(2, last + 1)
        if unit_id in IMPROVING_BRANCH:
            fixed = rng.random() < 0.85
            return appear, rng.randint(max(appear + 1, 4), last) if fixed and appear < last else NEVER
        if rng.random() < 0.4 and appear <= last:
            return appear, rng.randint(appear + 1, last + 1)
        return appear, NEVER

    def _add(self, rule: str, target_id: str, appear: int, fix: int, **extra):
        self.defects.append({"rule": rule, "target_id": target_id, "appear": appear,
                             "fix": fix, **extra})

    def _build_defects(self, hq_goals: dict[str, list[str]]):
        rng = self.rng
        showcase = next(g for g in self.goals.values()
                        if g["unit_id"] == SHOWCASE_UNIT and g["level"] == "unit")
        self._add("GOAL_NO_OWNER", showcase["id"], 1, NEVER)
        self._add("KR_WEIGHTS_SUM", showcase["id"], 1, NEVER, delta=15)
        self._add("KR_NO_TARGET", showcase["kr_ids"][0], 1, NEVER)
        self._add("GOAL_DEADLINE_OUT_OF_PERIOD", showcase["id"], 3, NEVER)

        for goal in list(self.goals.values()):
            if goal["id"] == showcase["id"] or goal["level"] == "block":
                continue
            unit_id = goal["unit_id"]
            probs = dict(GOAL_RULE_P)
            if goal["level"] == "employee":
                probs.update(EMPLOYEE_ONLY_P)
            for rule, p in probs.items():
                if rng.random() >= p:
                    continue
                appear, fix = self._window(unit_id)
                appear = max(appear, goal["created_run"])
                if fix <= appear:
                    continue
                if rule == "KR_WEIGHTS_SUM":
                    self._add(rule, goal["id"], appear, fix, delta=rng.choice([-20, -10, 10, 15, 25]))
                elif rule == "CASCADE_WRONG_LEVEL":
                    self._add(rule, goal["id"], appear, fix, new_parent=self._foreign_parent(goal, hq_goals))
                elif rule == "GOAL_DUPLICATE":
                    self._duplicate(goal, appear, fix)
                else:
                    self._add(rule, goal["id"], appear, fix)
            for kr_id in goal["kr_ids"]:
                for rule, p in KR_RULE_P.items():
                    if rng.random() >= p:
                        continue
                    appear, fix = self._window(unit_id)
                    appear = max(appear, goal["created_run"])
                    if fix > appear:
                        self._add(rule, kr_id, appear, fix,
                                  lag=rng.randint(60, 140), ratio=rng.randint(4, 12))

        # Реорганизация: в последнем прогоне у ~40% целей подразделения сломан каскад
        for goal in self.goals.values():
            if goal["unit_id"] == REORG_UNIT and goal["level"] in ("unit", "employee") \
                    and rng.random() < 0.4:
                if rng.random() < 0.5:
                    self._add("CASCADE_NO_PARENT", goal["id"], self.last_run_no, NEVER)
                else:
                    self._add("CASCADE_WRONG_LEVEL", goal["id"], self.last_run_no, NEVER,
                              new_parent=self._foreign_parent(goal, hq_goals))

        # Отменённые родительские цели — у их дочерних целей появляется CASCADE_PARENT_INACTIVE
        for unit_id, appear, fix in (("CIB-TRADE", 5, NEVER), ("TX-ACQ", 3, 7)):
            parent = next(g for g in self.goals.values()
                          if g["unit_id"] == unit_id and g["level"] == "unit")
            self._add("PARENT_CANCELLED", parent["id"], appear, fix)

    def _foreign_parent(self, goal: dict, hq_goals: dict[str, list[str]]) -> str:
        own_hq = goal["unit_id"] if goal["level"] == "hq" else UNIT_BY_ID[goal["unit_id"]]["parent_id"]
        if goal["level"] == "employee":
            # цель сотрудника привязана к цели подразделения другого департамента
            candidates = [g["id"] for g in self.goals.values() if g["level"] == "unit"
                          and UNIT_BY_ID[g["unit_id"]]["parent_id"] != own_hq]
        else:
            candidates = [gid for hq, ids in hq_goals.items() if hq != own_hq for gid in ids]
        return self.rng.choice(sorted(candidates))

    def _duplicate(self, goal: dict, appear: int, fix: int):
        dup_id = self._goal("employee", goal["unit_id"], goal["owner_id"], goal["parent_id"],
                            goal["title"], created_run=appear)
        self.goals[dup_id]["removed_run"] = fix
        self.goals[dup_id]["duplicate_of"] = goal["id"]
