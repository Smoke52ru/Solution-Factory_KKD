import type {
  DeltaCounters,
  Issue,
  IssuesResponse,
  MetaResponse,
  MetricKey,
  MetricRow,
  Run,
  SummaryResponse,
} from '@/shared/api/types'

export function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: 'RUN-008',
    number: 8,
    status: 'completed',
    trigger: 'schedule',
    snapshot_date: '2026-10-26',
    started_at: '2026-10-26T06:00:00Z',
    finished_at: '2026-10-26T06:05:00Z',
    compared_to_run_id: 'RUN-007',
    error: null,
    ...overrides,
  }
}

export function makeMetric(key: MetricKey, overrides: Partial<MetricRow> = {}): MetricRow {
  return {
    key,
    title: key,
    unit: '%',
    higher_is_better: true,
    formula: 'формула',
    value: 80,
    previous: 75,
    delta: 5,
    delta_pct: 6.67,
    trend: 'better',
    ...overrides,
  }
}

export const META: MetaResponse = {
  units: [
    { id: 'B2B', name: 'Блок B2B', level: 'block', parent_id: null, depth: 0 },
    { id: 'TX-NEW', name: 'Новый отдел', level: 'unit', parent_id: 'B2B', depth: 1 },
  ],
  rules: [
    {
      code: 'R-01',
      object_type: 'goal',
      severity: 'critical',
      title: 'Цель без владельца',
      description: '',
      recommendation: '',
    },
  ],
  severities: [
    { code: 'critical', title: 'Критичная', order: 1 },
    { code: 'major', title: 'Существенная', order: 2 },
    { code: 'minor', title: 'Незначительная', order: 3 },
  ],
  goal_levels: [],
  metrics: [],
  delta_statuses: [
    { code: 'new', title: 'Новая' },
    { code: 'persisting', title: 'Сохраняется' },
    { code: 'resolved', title: 'Исправлена' },
  ],
}

export const NULL_COUNTERS: DeltaCounters = { new: null, persisting: null, resolved: null }

export function makeSummary(overrides: Partial<SummaryResponse> = {}): SummaryResponse {
  return {
    run: makeRun(),
    compared_to: makeRun({ id: 'RUN-007', number: 7, snapshot_date: '2026-10-19' }),
    unit: {
      id: 'B2B',
      name: 'Блок B2B',
      level: 'block',
      parent_id: null,
      path: [{ id: 'B2B', name: 'Блок B2B' }],
    },
    metrics: [
      makeMetric('clean_goals_share', { title: 'Доля корректных целей' }),
      makeMetric('goals_active', { title: 'Активных целей', unit: 'шт.', value: 40 }),
    ],
    issues_by_severity: [],
    issues_by_rule: [],
    delta: { new: 3, persisting: 5, resolved: 2 },
    ...overrides,
  }
}

export function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'ISS-1A2B3C4D5E',
    rule_code: 'R-01',
    rule_title: 'Цель без владельца',
    severity: 'critical',
    object_type: 'goal',
    object_id: 'G-1',
    goal_id: 'G-1',
    goal_title: 'Увеличить выручку',
    goal_level: 'unit',
    kr_id: null,
    kr_title: null,
    unit_id: 'B2B',
    unit_name: 'Блок B2B',
    owner: null,
    details: 'details',
    actual: null,
    expected: null,
    recommendation: 'fix it',
    delta_status: 'new',
    first_detected_run_id: 'RUN-008',
    first_detected_at: '2026-10-26T06:00:00Z',
    runs_in_row: 1,
    ...overrides,
  }
}

export function makeIssues(items: Issue[], total = items.length): IssuesResponse {
  return { run_id: 'RUN-008', items, total, limit: 20, offset: 0 }
}
