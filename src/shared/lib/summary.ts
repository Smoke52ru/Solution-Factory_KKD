import type { SummaryResponse } from '@/shared/api/types'

const VERDICT_METRIC_KEY = 'clean_goals_share'
const GOALS_ACTIVE_KEY = 'goals_active'

/** В подразделении нет целей (TX-NEW): активных целей 0 или вердикт `null`. */
export function hasNoGoals(summary: SummaryResponse): boolean {
  const goalsActive = summary.metrics.find((metric) => metric.key === GOALS_ACTIVE_KEY)
  const verdict = summary.metrics.find((metric) => metric.key === VERDICT_METRIC_KEY)
  return goalsActive?.value === 0 || (verdict !== undefined && verdict.value === null)
}
