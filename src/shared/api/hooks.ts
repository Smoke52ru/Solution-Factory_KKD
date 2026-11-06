import { keepPreviousData, queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import { getIssue, getIssues, getMeta, getRuns, getSummary } from './endpoints'
import { queryKeys } from './queryKeys'
import type { IssuesQuery, Run } from './types'

/** Максимум, который отдаёт API за один запрос списка прогонов. */
const RUNS_LIMIT = 100

const metaQueryOptions = queryOptions({
  queryKey: queryKeys.meta(),
  queryFn: ({ signal }) => getMeta({ signal }),
  staleTime: Infinity,
})

const RUNS_STALE_MS = 60_000
const RUNS_POLL_MS = 3_000

const runsQueryOptions = queryOptions({
  queryKey: queryKeys.runs(),
  queryFn: async ({ signal }) => (await getRuns({ limit: RUNS_LIMIT }, { signal })).items,
  staleTime: RUNS_STALE_MS,
  refetchInterval: (query) => {
    const runs = query.state.data
    return runs?.some((run) => run.status === 'running') ? RUNS_POLL_MS : false
  },
})

/** Прогон по умолчанию — первый `completed` (явный id, а не `latest`). */
export function selectDefaultRun(runs: readonly Run[]): Run | undefined {
  return runs.find((run) => run.status === 'completed')
}

/** Справочники: оргструктура, правила, важности. Не меняются за время сессии. */
export function useMeta() {
  return useQuery(metaQueryOptions)
}

/** Список прогонов, от новых к старым. */
export function useRuns() {
  return useQuery(runsQueryOptions)
}

/** Прогон по умолчанию из общего кеша списка прогонов. */
export function useDefaultRun() {
  return useQuery({ ...runsQueryOptions, select: selectDefaultRun })
}

/** Сводка по подразделению и прогону. Не выполняется, пока не выбраны `runId` и `unitId`. */
export function useSummary(runId: string | undefined, unitId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.summary(runId, unitId),
    queryFn:
      runId && unitId ? ({ signal }) => getSummary({ runId, unitId }, { signal }) : skipToken,
  })
}

/** Страница проблем; прежняя страница остаётся на экране, пока грузится новая. */
export function useIssues(query: IssuesQuery | undefined) {
  return useQuery({
    queryKey: queryKeys.issues(query ?? {}),
    queryFn: query ? ({ signal }) => getIssues(query, { signal }) : skipToken,
    placeholderData: keepPreviousData,
  })
}

/** Карточка проблемы с историей. Не выполняется, пока нет `issueId` или `runId`. */
export function useIssue(issueId: string | undefined, runId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.issue(issueId, runId),
    queryFn:
      issueId && runId ? ({ signal }) => getIssue(issueId, runId, { signal }) : skipToken,
  })
}
