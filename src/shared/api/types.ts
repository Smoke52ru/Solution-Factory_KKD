export type RunStatus = 'completed' | 'failed' | 'running'
export type Trend = 'better' | 'worse' | 'same'
export type Severity = 'critical' | 'major' | 'minor'
export type DeltaStatus = 'new' | 'persisting' | 'resolved'
export type ObjectType = 'goal' | 'key_result'
export type GoalLevel = 'block' | 'hq' | 'unit' | 'employee'

export type MetricValue = {
  value: number | null
  previous: number | null
  delta: number | null
  delta_pct: number | null
  trend: Trend | null
}

export type Run = {
  id: string
  status: RunStatus
  snapshot_date: string
  compared_to_run_id: string | null
  started_at: string
  finished_at: string | null
  summary?: Record<string, unknown>
}

export type Unit = {
  id: string
  name: string
  parent_id: string | null
  depth: number
}

export type MetaResponse = {
  units: Unit[]
  rules: Array<{
    code: string
    object_type: ObjectType
    severity: Severity
    title: string
    description?: string
  }>
  severities: Array<{ code: Severity; title: string }>
  goal_levels: Array<{ code: GoalLevel; title: string }>
  metrics: Array<{
    code: string
    title: string
    formula?: string
  }>
}

export type KkdSummary = {
  run_id: string
  unit_id: string
  metrics: Record<string, MetricValue>
  issues_by_severity: Record<string, MetricValue>
  issues_by_rule: Record<string, MetricValue>
  counters: {
    new: number
    persisting: number
    resolved: number
  }
}

export type Issue = {
  id: string
  run_id: string
  rule_code: string
  severity: Severity
  delta_status: DeltaStatus
  object_type: ObjectType
  object_id: string
  object_title: string
  goal_id: string
  goal_title: string
  unit_id: string
  owner_name: string | null
  age_runs: number
}

export type Paginated<T> = {
  items: T[]
  total: number
  limit: number
  offset: number
}
