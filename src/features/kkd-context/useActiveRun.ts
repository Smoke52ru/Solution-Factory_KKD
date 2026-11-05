import { selectDefaultRun, useRuns } from '@/shared/api/hooks'

/**
 * Выбранный прогон из общего кеша списка прогонов.
 * `unavailableRun` — прогон без результатов (ошибка или ещё выполняется):
 * запросов за сводкой и проблемами для него не делаем.
 */
export function useActiveRun(runId: string | undefined) {
  const runsQuery = useRuns()
  const runs = runsQuery.data
  const run = runs?.find((candidate) => candidate.id === runId)

  return {
    runsQuery,
    run,
    unavailableRun: run !== undefined && run.status !== 'completed' ? run : undefined,
    lastCompletedRun: runs ? selectDefaultRun(runs) : undefined,
  }
}
