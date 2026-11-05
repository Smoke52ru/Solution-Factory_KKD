import { theme } from 'antd'
import { useEffect, useMemo } from 'react'
import type { KkdFilters, KkdFiltersPatch } from '@/features/kkd-context/useKkdParams'
import { PAGE_SIZE } from '@/features/kkd-context/useKkdParams'
import { useIssues } from '@/shared/api/hooks'
import type { IssuesQuery } from '@/shared/api/types'
import { SectionTitle } from '@/shared/ui/SectionTitle'
import { IssueModal } from './IssueModal'
import { IssuesFilters } from './IssuesFilters'
import { IssuesTable } from './IssuesTable'
import { ISSUES_SECTION_ID } from './scrollToIssues'

const HEADING_ID = 'kkd-issues-heading'
const FIRST_PAGE = 1

interface IssuesSectionProps {
  runId: string | undefined
  unitId: string
  filters: KkdFilters
  page: number
  issueId: string | undefined
  /** Первый прогон: нет предыдущего — статус «исправлена» недоступен. */
  isFirstRun: boolean
  onFiltersChange: (patch: KkdFiltersPatch) => void
  onResetFilters: () => void
  onPageChange: (page: number, options?: { replace?: boolean }) => void
  onOpenIssue: (issueId: string) => void
  onCloseIssue: () => void
}

/** Проблемы: фильтры, таблица с серверной пагинацией и карточка проблемы. */
export function IssuesSection({
  runId,
  unitId,
  filters,
  page,
  issueId,
  isFirstRun,
  onFiltersChange,
  onResetFilters,
  onPageChange,
  onOpenIssue,
  onCloseIssue,
}: IssuesSectionProps) {
  const { token } = theme.useToken()

  // В первом прогоне «исправленных» не бывает: устаревший `status=resolved` из URL игнорируем.
  const deltaStatus =
    isFirstRun && filters.deltaStatus === 'resolved' ? undefined : filters.deltaStatus
  const { ruleCodes, severities, q } = filters

  const query = useMemo<IssuesQuery | undefined>(
    () =>
      runId === undefined
        ? undefined
        : {
            runId,
            unitId,
            ruleCodes,
            severities,
            deltaStatuses: deltaStatus ? [deltaStatus] : undefined,
            q: q || undefined,
            limit: PAGE_SIZE,
            offset: (page - FIRST_PAGE) * PAGE_SIZE,
          },
    [runId, unitId, ruleCodes, severities, deltaStatus, q, page],
  )
  const issues = useIssues(query)

  const total = issues.data?.total
  const hasActiveFilters =
    ruleCodes.length > 0 || severities.length > 0 || deltaStatus !== undefined || q.trim() !== ''

  // Страница из URL вышла за пределы выдачи (устаревшая ссылка или сузившийся фильтр).
  useEffect(() => {
    if (total !== undefined && total > 0 && (page - FIRST_PAGE) * PAGE_SIZE >= total) {
      onPageChange(FIRST_PAGE, { replace: true })
    }
  }, [total, page, onPageChange])

  return (
    <section
      id={ISSUES_SECTION_ID}
      aria-labelledby={HEADING_ID}
      style={{ display: 'flex', flexDirection: 'column', rowGap: token.margin, scrollMarginTop: token.margin }}
    >
      <SectionTitle id={HEADING_ID}>Проблемы</SectionTitle>
      <IssuesFilters
        filters={{ ...filters, deltaStatus }}
        hasActiveFilters={hasActiveFilters}
        disableResolved={isFirstRun}
        onChange={onFiltersChange}
        onReset={onResetFilters}
      />
      <IssuesTable
        data={issues.data}
        isPending={issues.isPending}
        isFetching={issues.isFetching}
        error={issues.error}
        hasActiveFilters={hasActiveFilters}
        page={page}
        pageSize={PAGE_SIZE}
        onRetry={() => void issues.refetch()}
        onPageChange={onPageChange}
        onOpenIssue={onOpenIssue}
        onResetFilters={onResetFilters}
      />
      <IssueModal issueId={issueId} runId={runId} onClose={onCloseIssue} />
    </section>
  )
}
