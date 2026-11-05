import { Empty, Skeleton, theme } from 'antd'
import { useSummary } from '@/shared/api/hooks'
import type { DeltaStatus, MetricRow, SummaryResponse } from '@/shared/api/types'
import { ErrorState } from '@/shared/ui/ErrorState'
import { SectionTitle } from '@/shared/ui/SectionTitle'
import { SlowLoadingHint } from '@/shared/ui/SlowLoadingHint'
import { DeltaCounters } from './DeltaCounters'
import { IssuesBreakdown } from './IssuesBreakdown'
import { MetricCard } from './MetricCard'
import { VerdictPanel } from './VerdictPanel'

const HEADING_ID = 'kkd-summary-heading'
const VERDICT_METRIC_KEY = 'clean_goals_share'
const GOALS_ACTIVE_KEY = 'goals_active'
const METRIC_CARD_MIN_WIDTH = 220
const SKELETON_CARDS = 4

interface SummarySectionProps {
  runId: string | undefined
  unitId: string
  activeStatus: DeltaStatus | undefined
  activeRuleCodes: readonly string[]
  onSelectStatus: (status: DeltaStatus | undefined) => void
  onSelectRule: (ruleCode: string) => void
}

/** В подразделении нет целей (TX-NEW): метрики `null` или активных целей 0. */
function hasNoGoals(metrics: readonly MetricRow[]): boolean {
  const goalsActive = metrics.find((metric) => metric.key === GOALS_ACTIVE_KEY)
  const verdict = metrics.find((metric) => metric.key === VERDICT_METRIC_KEY)
  return goalsActive?.value === 0 || (verdict !== undefined && verdict.value === null)
}

function SummaryContent({
  summary,
  activeStatus,
  activeRuleCodes,
  onSelectStatus,
  onSelectRule,
}: {
  summary: SummaryResponse
} & Pick<
  SummarySectionProps,
  'activeStatus' | 'activeRuleCodes' | 'onSelectStatus' | 'onSelectRule'
>) {
  const { token } = theme.useToken()
  const comparedToId = summary.compared_to?.id ?? null
  const noData = hasNoGoals(summary.metrics)
  const verdictMetric = summary.metrics.find((metric) => metric.key === VERDICT_METRIC_KEY)
  const otherMetrics = summary.metrics.filter((metric) => metric.key !== VERDICT_METRIC_KEY)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.margin }}>
      {noData ? (
        <Empty description="В подразделении пока нет целей" />
      ) : verdictMetric ? (
        <VerdictPanel
          metric={verdictMetric}
          comparedToId={comparedToId}
          counters={
            <DeltaCounters
              counters={summary.delta}
              activeStatus={activeStatus}
              onSelect={onSelectStatus}
            />
          }
        />
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${METRIC_CARD_MIN_WIDTH}px, 1fr))`,
          gap: token.margin,
        }}
      >
        {otherMetrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} comparedToId={comparedToId} noData={noData} />
        ))}
      </div>

      {noData ? null : (
        <IssuesBreakdown
          severityRows={summary.issues_by_severity}
          ruleRows={summary.issues_by_rule}
          comparedToId={comparedToId}
          activeRuleCodes={activeRuleCodes}
          onSelectRule={onSelectRule}
        />
      )}
    </div>
  )
}

function SummarySkeleton() {
  const { token } = theme.useToken()

  return (
    <div
      aria-busy
      style={{ display: 'flex', flexDirection: 'column', rowGap: token.margin }}
    >
      <Skeleton active paragraph={{ rows: 2 }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${METRIC_CARD_MIN_WIDTH}px, 1fr))`,
          gap: token.margin,
        }}
      >
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <Skeleton key={index} active title={false} paragraph={{ rows: 3 }} />
        ))}
      </div>
    </div>
  )
}

/** Сводка: вердикт, карточки метрик, «что исправлять в первую очередь». */
export function SummarySection({ runId, unitId, ...handlers }: SummarySectionProps) {
  const { token } = theme.useToken()
  const summary = useSummary(runId, unitId)

  return (
    <section
      aria-labelledby={HEADING_ID}
      style={{ display: 'flex', flexDirection: 'column', rowGap: token.margin }}
    >
      <SectionTitle id={HEADING_ID}>Сводка</SectionTitle>
      {summary.isError ? (
        <ErrorState
          error={summary.error}
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : summary.isPending ? (
        <>
          <SummarySkeleton />
          <SlowLoadingHint loading />
        </>
      ) : (
        <SummaryContent summary={summary.data} {...handlers} />
      )}
    </section>
  )
}
