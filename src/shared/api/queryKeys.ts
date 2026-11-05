import type { IssuesQuery } from './types'

/** Единая фабрика ключей TanStack Query: все запросы ККД под корнем `['kkd']`. */
export const queryKeys = {
  all: ['kkd'] as const,
  meta: () => [...queryKeys.all, 'meta'] as const,
  runs: () => [...queryKeys.all, 'runs'] as const,
  summary: (runId: string | undefined, unitId: string | undefined) =>
    [...queryKeys.all, 'summary', { runId, unitId }] as const,
  issuesAll: () => [...queryKeys.all, 'issues'] as const,
  issues: (query: Partial<IssuesQuery>) => [...queryKeys.issuesAll(), query] as const,
  issue: (issueId: string | undefined, runId: string | undefined) =>
    [...queryKeys.all, 'issue', { issueId, runId }] as const,
}
