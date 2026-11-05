import { Empty, theme } from 'antd'
import { ContextBar } from '@/features/kkd-context/ContextBar'
import { RunUnavailable } from '@/features/kkd-context/RunUnavailable'
import { useActiveRun } from '@/features/kkd-context/useActiveRun'
import { useKkdParams } from '@/features/kkd-context/useKkdParams'
import { IssuesSection } from '@/features/kkd-issues/IssuesSection'
import { scrollToIssues } from '@/features/kkd-issues/scrollToIssues'
import { SummarySection } from '@/features/kkd-summary/SummarySection'
import type { DeltaStatus } from '@/shared/api/types'
import { ErrorState } from '@/shared/ui/ErrorState'
import { SectionTitle } from '@/shared/ui/SectionTitle'

const PAGE_TITLE_ID = 'kkd-page-title'

/** Страница модуля ККД: только композиция секций, всё состояние — в URL. */
export function KkdPage() {
  const { token } = theme.useToken()
  const kkd = useKkdParams()
  const { runsQuery, run, unavailableRun, lastCompletedRun } = useActiveRun(kkd.runId)

  // Для прогона без результатов (ошибка / выполняется) запросы сводки и проблем не делаем.
  // Статус прогона известен только из списка прогонов, поэтому до его загрузки не запрашиваем
  // ничего и для явного `run` из URL — иначе по ссылке на неуспешный прогон уйдёт лишний запрос.
  const dataRunId = runsQuery.isSuccess && !unavailableRun ? kkd.runId : undefined
  const hasNoRuns = runsQuery.isSuccess && kkd.runId === undefined

  const selectStatus = (status: DeltaStatus | undefined) => {
    kkd.setFilters({ deltaStatus: status })
    if (status !== undefined) scrollToIssues()
  }

  const selectRule = (ruleCode: string) => {
    kkd.setFilters({ ruleCodes: [ruleCode] })
    scrollToIssues()
  }

  const renderContent = () => {
    if (runsQuery.isError) {
      return (
        <ErrorState
          error={runsQuery.error}
          onRetry={() => void runsQuery.refetch()}
          retrying={runsQuery.isFetching}
        />
      )
    }
    if (hasNoRuns) return <Empty description="Завершённых прогонов пока нет" />
    if (unavailableRun) {
      return (
        <RunUnavailable
          run={unavailableRun}
          lastCompletedRun={lastCompletedRun}
          onOpenRun={kkd.setRun}
        />
      )
    }
    return (
      <>
        <SummarySection
          runId={dataRunId}
          unitId={kkd.unitId}
          activeStatus={kkd.filters.deltaStatus}
          activeRuleCodes={kkd.filters.ruleCodes}
          onSelectStatus={selectStatus}
          onSelectRule={selectRule}
        />
        <IssuesSection
          runId={dataRunId}
          unitId={kkd.unitId}
          filters={kkd.filters}
          page={kkd.page}
          issueId={kkd.issueId}
          isFirstRun={run?.compared_to_run_id === null}
          onFiltersChange={kkd.setFilters}
          onResetFilters={kkd.resetFilters}
          onPageChange={kkd.setPage}
          onOpenIssue={kkd.openIssue}
          onCloseIssue={kkd.closeIssue}
        />
      </>
    )
  }

  return (
    <main
      aria-labelledby={PAGE_TITLE_ID}
      style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginLG }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', rowGap: token.margin }}>
        <SectionTitle id={PAGE_TITLE_ID} level={1}>
          Контроль качества данных
        </SectionTitle>
        <ContextBar
          unitId={kkd.unitId}
          runId={kkd.runId}
          dataRunId={dataRunId}
          onUnitChange={kkd.setUnit}
          onRunChange={kkd.setRun}
        />
      </header>
      {renderContent()}
    </main>
  )
}
