/**
 * Типы ответов mock API ККД. Источник истины — backend/app/main.py, store.py, engine.py.
 * Метрики, дельты и счётчики приходят с сервера и на фронте не пересчитываются.
 */

// ---------------------------------------------------------------- общее

export type Severity = 'critical' | 'major' | 'minor'
export type DeltaStatus = 'new' | 'persisting' | 'resolved'
export type RunStatus = 'completed' | 'failed' | 'running'
export type RunTrigger = 'schedule' | 'manual'
export type ObjectType = 'goal' | 'key_result'
export type UnitLevel = 'block' | 'hq' | 'unit'
export type GoalLevel = 'block' | 'hq' | 'unit' | 'employee'
export type MetricUnit = '%' | 'шт.'
export type Trend = 'better' | 'worse' | 'same'

export type MetricKey =
  | 'clean_goals_share'
  | 'goals_active'
  | 'key_results'
  | 'goals_with_issues'
  | 'issues_total'
  | 'critical_issues'
  | 'cascade_coverage'
  | 'kr_completeness'
  | 'avg_kr_per_goal'

export interface Paginated<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

/** Тело ошибки: `{ error: { code, message } }`. */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

// ---------------------------------------------------------------- GET /api/meta

export interface MetaUnit {
  id: string
  name: string
  level: UnitLevel
  parent_id: string | null
  /** Глубина в оргструктуре: 0 — блок. */
  depth: number
}

export interface MetaRule {
  code: string
  object_type: ObjectType
  severity: Severity
  title: string
  description: string
  recommendation: string
}

export interface MetaSeverity {
  code: Severity
  title: string
  /** Чем меньше, тем важнее. */
  order: number
}

export interface MetaGoalLevel {
  code: GoalLevel
  title: string
  order: number
}

export interface MetaMetric {
  key: MetricKey
  title: string
  unit: MetricUnit
  /** `null` — оценка «лучше / хуже» неприменима. */
  higher_is_better: boolean | null
  formula: string
}

export interface MetaDeltaStatus {
  code: DeltaStatus
  title: string
}

export interface MetaResponse {
  units: MetaUnit[]
  rules: MetaRule[]
  severities: MetaSeverity[]
  goal_levels: MetaGoalLevel[]
  metrics: MetaMetric[]
  delta_statuses: MetaDeltaStatus[]
}

// ---------------------------------------------------------------- прогоны

export interface RunTotals {
  goals_active: number
  key_results: number
  issues_total: number
  critical: number
  major: number
  minor: number
  clean_goals_share: number | null
}

export interface Run {
  /** Например `RUN-008`. */
  id: string
  number: number
  status: RunStatus
  trigger: RunTrigger
  /** `YYYY-MM-DD`. */
  snapshot_date: string
  started_at: string
  /** `null`, пока прогон выполняется. */
  finished_at: string | null
  /** Предыдущий успешный прогон; `null` у первого. */
  compared_to_run_id: string | null
  /** Причина ошибки для `status === 'failed'`. */
  error: string | null
  /** Есть в списке и карточке прогона; в сводке отсутствует. `null` у неуспешных. */
  totals?: RunTotals | null
}

export type RunsResponse = Paginated<Run>

// ---------------------------------------------------------------- GET /api/kkd/summary

export interface UnitPathItem {
  id: string
  name: string
}

export interface SummaryUnit {
  id: string
  name: string
  level: UnitLevel
  parent_id: string | null
  /** От корня (блока) к текущему подразделению включительно. */
  path: UnitPathItem[]
}

export interface MetricRow {
  key: MetricKey
  title: string
  unit: MetricUnit
  higher_is_better: boolean | null
  formula: string
  /** `null` — данных нет (например, в подразделении нет целей). */
  value: number | null
  /** `null` — сравнивать не с чем. */
  previous: number | null
  delta: number | null
  /** `null`, если `previous` равен 0 или отсутствует. */
  delta_pct: number | null
  /** `null` при отсутствии дельты или при `higher_is_better === null`. */
  trend: Trend | null
}

interface CountRow {
  code: string
  title: string
  current: number
  previous: number | null
  delta: number | null
}

export interface SeverityRow extends CountRow {
  code: Severity
}

export interface RuleRow extends CountRow {
  severity: Severity
  object_type: ObjectType
}

export interface DeltaCounters {
  new: number | null
  persisting: number | null
  resolved: number | null
}

export interface SummaryResponse {
  run: Run
  /** `null` у первого прогона. */
  compared_to: Run | null
  unit: SummaryUnit
  metrics: MetricRow[]
  issues_by_severity: SeverityRow[]
  issues_by_rule: RuleRow[]
  delta: DeltaCounters
}

// ---------------------------------------------------------------- проблемы

export interface IssueOwner {
  id: string
  full_name: string
  position: string
}

export interface Issue {
  /** Например `ISS-1A2B3C4D5E`. */
  id: string
  rule_code: string
  rule_title: string
  severity: Severity
  object_type: ObjectType
  object_id: string
  goal_id: string
  goal_title: string
  goal_level: GoalLevel
  kr_id: string | null
  kr_title: string | null
  unit_id: string
  unit_name: string
  owner: IssueOwner | null
  details: string
  actual: string | number | null
  expected: string | number | null
  recommendation: string
  delta_status: DeltaStatus
  /** `null` у исправленных проблем (`resolved`). */
  first_detected_run_id: string | null
  first_detected_at: string | null
  /** Сколько прогонов подряд проблема присутствует; `null` у `resolved`. */
  runs_in_row: number | null
}

export interface IssuesResponse extends Paginated<Issue> {
  run_id: string
}

export interface IssueHistoryItem {
  run_id: string
  snapshot_date: string
  run_status: RunStatus
  /** `null`, если прогон не завершён успешно — состояние неизвестно. */
  present: boolean | null
}

export interface IssueDetail extends Issue {
  history: IssueHistoryItem[]
}

export type IssueSort = 'severity' | 'age' | 'unit' | 'rule'

/** Параметры списка проблем в camelCase; в API уходят как snake_case и CSV. */
export interface IssuesQuery {
  runId: string
  unitId: string
  ruleCodes?: string[]
  severities?: Severity[]
  deltaStatuses?: DeltaStatus[]
  objectType?: ObjectType
  q?: string
  sort?: IssueSort
  limit?: number
  offset?: number
}

export interface SummaryQuery {
  runId: string
  unitId: string
}
