import { Button, Result } from 'antd'
import type { Run } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'

interface RunUnavailableProps {
  /** Прогон без результатов: завершился с ошибкой или ещё выполняется. */
  run: Run
  /** Последний успешный прогон; `undefined`, если успешных нет. */
  lastCompletedRun: Run | undefined
  onOpenRun: (runId: string) => void
}

/** Вместо сводки и таблицы: у прогона нет результатов (RUN_FAILED / RUN_IN_PROGRESS). */
export function RunUnavailable({ run, lastCompletedRun, onOpenRun }: RunUnavailableProps) {
  const isFailed = run.status === 'failed'
  const openLatest =
    lastCompletedRun === undefined ? undefined : (
      <Button type="primary" onClick={() => onOpenRun(lastCompletedRun.id)}>
        Открыть последний успешный прогон
      </Button>
    )

  return (
    <Result
      status={isFailed ? 'error' : 'info'}
      title={
        isFailed
          ? `Прогон ${run.id} от ${formatDate(run.snapshot_date)} завершился с ошибкой`
          : `Прогон ${run.id} ещё выполняется`
      }
      subTitle={
        isFailed
          ? (run.error ?? 'Причина ошибки не указана. Результатов по этому прогону нет.')
          : 'Результаты появятся после завершения прогона.'
      }
      extra={openLatest}
    />
  )
}
