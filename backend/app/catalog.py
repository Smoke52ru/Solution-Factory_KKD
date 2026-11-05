"""Справочники: оргструктура, правила ККД, уровни важности."""

# Оргструктура компании (синтетическая). Уровни: block -> hq (департамент) -> unit (подразделение).
UNITS = [
    {"id": "B2B", "name": "Корпоративный блок", "level": "block", "parent_id": None},
    {"id": "HQ-CIB", "name": "Департамент корпоративного бизнеса", "level": "hq", "parent_id": "B2B"},
    {"id": "CIB-KEY", "name": "Управление по работе с ключевыми клиентами", "level": "unit", "parent_id": "HQ-CIB"},
    {"id": "CIB-REG", "name": "Управление региональных продаж", "level": "unit", "parent_id": "HQ-CIB"},
    {"id": "CIB-TRADE", "name": "Отдел торгового финансирования", "level": "unit", "parent_id": "HQ-CIB"},
    {"id": "HQ-SME", "name": "Департамент малого и среднего бизнеса", "level": "hq", "parent_id": "B2B"},
    {"id": "SME-ACQ", "name": "Управление привлечения клиентов", "level": "unit", "parent_id": "HQ-SME"},
    {"id": "SME-SRV", "name": "Управление сервиса и удержания", "level": "unit", "parent_id": "HQ-SME"},
    {"id": "SME-DIG", "name": "Отдел цифровых каналов", "level": "unit", "parent_id": "HQ-SME"},
    {"id": "HQ-TX", "name": "Департамент транзакционного бизнеса", "level": "hq", "parent_id": "B2B"},
    {"id": "TX-ACQ", "name": "Управление эквайринга", "level": "unit", "parent_id": "HQ-TX"},
    {"id": "TX-SAL", "name": "Управление зарплатных проектов", "level": "unit", "parent_id": "HQ-TX"},
    {"id": "TX-NEW", "name": "Отдел платёжных сервисов", "level": "unit", "parent_id": "HQ-TX"},
]
UNIT_BY_ID = {u["id"]: u for u in UNITS}

# Уровни каскада целей: чем меньше число, тем выше уровень.
GOAL_LEVELS = {
    "block": {"order": 0, "title": "Цель блока"},
    "hq": {"order": 1, "title": "Цель департамента"},
    "unit": {"order": 2, "title": "Цель подразделения"},
    "employee": {"order": 3, "title": "Цель сотрудника"},
}

SEVERITIES = [
    {"code": "critical", "title": "Критичная", "order": 0},
    {"code": "major", "title": "Существенная", "order": 1},
    {"code": "minor", "title": "Незначительная", "order": 2},
]
SEVERITY_ORDER = {s["code"]: s["order"] for s in SEVERITIES}

STALE_DAYS = 45
OUTLIER_RATIO = 3

RULES = [
    {
        "code": "GOAL_NO_OWNER", "object_type": "goal", "severity": "critical",
        "title": "Цель без ответственного",
        "description": "У активной цели не указан ответственный сотрудник.",
        "recommendation": "Назначить ответственного за цель в модуле «Цели».",
    },
    {
        "code": "GOAL_NO_KR", "object_type": "goal", "severity": "critical",
        "title": "Цель без ключевых результатов",
        "description": "У активной цели нет ни одного ключевого результата.",
        "recommendation": "Добавить 1–5 измеримых ключевых результатов.",
    },
    {
        "code": "KR_WEIGHTS_SUM", "object_type": "goal", "severity": "major",
        "title": "Сумма весов КР не равна 100%",
        "description": "Сумма весов ключевых результатов цели отличается от 100%.",
        "recommendation": "Перераспределить веса КР так, чтобы сумма была 100%.",
    },
    {
        "code": "CASCADE_NO_PARENT", "object_type": "goal", "severity": "major",
        "title": "Цель не связана с вышестоящей",
        "description": "Цель департамента, подразделения или сотрудника не привязана к цели вышестоящего уровня.",
        "recommendation": "Указать родительскую цель вышестоящего уровня.",
    },
    {
        "code": "CASCADE_WRONG_LEVEL", "object_type": "goal", "severity": "major",
        "title": "Нарушена структура каскада",
        "description": "Родительская цель не выше по уровню или относится к подразделению из другой ветки оргструктуры.",
        "recommendation": "Перепривязать цель к цели своего вышестоящего подразделения.",
    },
    {
        "code": "CASCADE_PARENT_INACTIVE", "object_type": "goal", "severity": "minor",
        "title": "Родительская цель закрыта или отменена",
        "description": "Активная цель каскадирована из цели, которая уже закрыта или отменена.",
        "recommendation": "Перепривязать цель к актуальной цели или закрыть её.",
    },
    {
        "code": "GOAL_DEADLINE_OUT_OF_PERIOD", "object_type": "goal", "severity": "minor",
        "title": "Срок цели вне периода целеполагания",
        "description": "Срок достижения цели выходит за границы периода целеполагания.",
        "recommendation": "Скорректировать срок в пределах периода.",
    },
    {
        "code": "GOAL_DUPLICATE", "object_type": "goal", "severity": "minor",
        "title": "Дубль цели",
        "description": "У сотрудника есть другая активная цель с тем же названием.",
        "recommendation": "Удалить дубль или объединить цели.",
    },
    {
        "code": "KR_NO_TARGET", "object_type": "key_result", "severity": "major",
        "title": "КР без целевого значения",
        "description": "У ключевого результата не заполнено целевое значение.",
        "recommendation": "Заполнить целевое значение КР.",
    },
    {
        "code": "KR_NO_UNIT", "object_type": "key_result", "severity": "major",
        "title": "КР без единицы измерения",
        "description": "У ключевого результата не указана единица измерения.",
        "recommendation": "Указать единицу измерения (%, шт., млн ₽ и т. п.).",
    },
    {
        "code": "KR_STALE_PROGRESS", "object_type": "key_result", "severity": "minor",
        "title": "Прогресс КР давно не обновлялся",
        "description": f"Фактическое значение КР не обновлялось более {STALE_DAYS} дней.",
        "recommendation": "Обновить фактическое значение КР.",
    },
    {
        "code": "KR_FACT_OUTLIER", "object_type": "key_result", "severity": "minor",
        "title": "Подозрительное фактическое значение",
        "description": f"Факт КР превышает целевое значение более чем в {OUTLIER_RATIO} раза — возможна ошибка ввода.",
        "recommendation": "Проверить фактическое значение и единицу измерения.",
    },
]
RULE_BY_CODE = {r["code"]: r for r in RULES}


def ancestors_or_self(unit_id: str) -> list[str]:
    chain = []
    while unit_id:
        chain.append(unit_id)
        unit_id = UNIT_BY_ID[unit_id]["parent_id"]
    return chain


def descendants_or_self(unit_id: str) -> set[str]:
    result = {unit_id}
    changed = True
    while changed:
        changed = False
        for u in UNITS:
            if u["parent_id"] in result and u["id"] not in result:
                result.add(u["id"])
                changed = True
    return result
