import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useDefaultRun } from '@/shared/api/hooks'
import type { DeltaStatus, Severity } from '@/shared/api/types'

/** Метка в `location.state`: карточку открыли внутри приложения, а не по прямой ссылке. */
interface IssueNavigationState {
  issueOpenedInApp?: boolean
}

/** Корень оргструктуры — подразделение по умолчанию. */
export const DEFAULT_UNIT_ID = 'B2B'
export const PAGE_SIZE = 20

const PARAM = {
  unit: 'unit',
  run: 'run',
  rule: 'rule',
  severity: 'severity',
  status: 'status',
  q: 'q',
  page: 'page',
  issue: 'issue',
} as const

const CSV_SEPARATOR = ','
const FIRST_PAGE = 1

const SEVERITIES: readonly Severity[] = ['critical', 'major', 'minor']
const DELTA_STATUSES: readonly DeltaStatus[] = ['new', 'persisting', 'resolved']

export interface KkdFilters {
  ruleCodes: string[]
  severities: Severity[]
  deltaStatus: DeltaStatus | undefined
  q: string
}

export type KkdFiltersPatch = Partial<KkdFilters>

interface UpdateOptions {
  replace?: boolean
}

function isSeverity(value: string): value is Severity {
  return SEVERITIES.some((severity) => severity === value)
}

function isDeltaStatus(value: string): value is DeltaStatus {
  return DELTA_STATUSES.some((status) => status === value)
}

function parseCsv(raw: string | null): string[] {
  return raw ? raw.split(CSV_SEPARATOR).filter(Boolean) : []
}

function parsePage(raw: string | null): number {
  const page = Number(raw)
  return Number.isInteger(page) && page >= FIRST_PAGE ? page : FIRST_PAGE
}

/** Пустое значение удаляет параметр, чтобы URL оставался чистым. */
function writeParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value) params.set(key, value)
  else params.delete(key)
}

/**
 * Всё состояние страницы ККД живёт в query-параметрах URL:
 * `unit`, `run`, `rule` (CSV), `severity` (CSV), `status`, `q`, `page` (с 1), `issue`.
 * Смена подразделения или прогона сбрасывает страницу и закрывает карточку проблемы.
 */
export function useKkdParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const defaultRun = useDefaultRun()

  const unitId = searchParams.get(PARAM.unit) ?? DEFAULT_UNIT_ID
  const runId = searchParams.get(PARAM.run) ?? defaultRun.data?.id
  const page = parsePage(searchParams.get(PARAM.page))
  const issueId = searchParams.get(PARAM.issue) ?? undefined

  const filters = useMemo<KkdFilters>(() => {
    const status = searchParams.get(PARAM.status)
    return {
      ruleCodes: parseCsv(searchParams.get(PARAM.rule)),
      severities: parseCsv(searchParams.get(PARAM.severity)).filter(isSeverity),
      deltaStatus: status !== null && isDeltaStatus(status) ? status : undefined,
      q: searchParams.get(PARAM.q) ?? '',
    }
  }, [searchParams])

  const hasActiveFilters =
    filters.ruleCodes.length > 0 ||
    filters.severities.length > 0 ||
    filters.deltaStatus !== undefined ||
    filters.q.trim() !== ''

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void, { replace = false }: UpdateOptions = {}) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          mutate(next)
          return next
        },
        { replace },
      )
    },
    [setSearchParams],
  )

  const setUnit = useCallback(
    (nextUnitId: string) =>
      update((next) => {
        next.set(PARAM.unit, nextUnitId)
        next.delete(PARAM.page)
        next.delete(PARAM.issue)
      }),
    [update],
  )

  const setRun = useCallback(
    (nextRunId: string) =>
      update((next) => {
        next.set(PARAM.run, nextRunId)
        next.delete(PARAM.page)
        next.delete(PARAM.issue)
      }),
    [update],
  )

  const setFilters = useCallback(
    (patch: KkdFiltersPatch) =>
      update(
        (next) => {
          if (patch.ruleCodes !== undefined) {
            writeParam(next, PARAM.rule, patch.ruleCodes.join(CSV_SEPARATOR))
          }
          if (patch.severities !== undefined) {
            writeParam(next, PARAM.severity, patch.severities.join(CSV_SEPARATOR))
          }
          if ('deltaStatus' in patch) writeParam(next, PARAM.status, patch.deltaStatus)
          if (patch.q !== undefined) writeParam(next, PARAM.q, patch.q.trim())
          next.delete(PARAM.page)
        },
        // Ввод в поиск не засоряет историю браузера.
        { replace: patch.q !== undefined },
      ),
    [update],
  )

  const resetFilters = useCallback(
    () =>
      update((next) => {
        next.delete(PARAM.rule)
        next.delete(PARAM.severity)
        next.delete(PARAM.status)
        next.delete(PARAM.q)
        next.delete(PARAM.page)
      }),
    [update],
  )

  const setPage = useCallback(
    (nextPage: number, options?: UpdateOptions) =>
      update(
        (next) => writeParam(next, PARAM.page, nextPage > FIRST_PAGE ? String(nextPage) : undefined),
        options,
      ),
    [update],
  )

  const openIssue = useCallback(
    (nextIssueId: string) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.set(PARAM.issue, nextIssueId)
          return next
        },
        { state: { issueOpenedInApp: true } satisfies IssueNavigationState },
      )
    },
    [setSearchParams],
  )

  const closeIssue = useCallback(() => {
    const state = location.state as IssueNavigationState | null
    if (state?.issueOpenedInApp) {
      navigate(-1)
      return
    }
    update((next) => next.delete(PARAM.issue), { replace: true })
  }, [location.state, navigate, update])

  return {
    unitId,
    runId,
    filters,
    hasActiveFilters,
    page,
    issueId,
    setUnit,
    setRun,
    setFilters,
    resetFilters,
    setPage,
    openIssue,
    closeIssue,
  }
}

export type KkdParams = ReturnType<typeof useKkdParams>
