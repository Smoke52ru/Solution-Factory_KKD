import { Button, Typography, theme } from 'antd'
import type { DeltaCounters as DeltaCountersData, DeltaStatus } from '@/shared/api/types'
import { formatNumber } from '@/shared/lib/format'

const COUNTER_ORDER: readonly DeltaStatus[] = ['new', 'persisting', 'resolved']
const COUNT_FONT_SIZE = 24

interface DeltaCountersProps {
  counters: DeltaCountersData
  activeStatus: DeltaStatus | undefined
  /** Повторный клик по активному счётчику передаёт `undefined` — фильтр снимается. */
  onSelect: (status: DeltaStatus | undefined) => void
}

function counterLabel(status: DeltaStatus): string {
  switch (status) {
    case 'new':
      return 'Новые'
    case 'persisting':
      return 'Сохраняются'
    case 'resolved':
      return 'Исправлены'
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

/**
 * Счётчики `new / persisting / resolved` — настоящие кнопки: ставят фильтр статуса.
 * У первого прогона значения `null` — счётчики заменены пояснением и не кликабельны.
 */
export function DeltaCounters({ counters, activeStatus, onSelect }: DeltaCountersProps) {
  const { token } = theme.useToken()
  const isComparable =
    counters.new !== null && counters.persisting !== null && counters.resolved !== null

  if (!isComparable) {
    return (
      <Typography.Text type="secondary">
        Первый прогон: статусы «новые», «сохраняются» и «исправлены» появятся после следующего прогона.
      </Typography.Text>
    )
  }

  return (
    <div role="group" aria-label="Изменения проблем относительно предыдущего прогона">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: token.marginXS }}>
        {COUNTER_ORDER.map((status) => {
          const count = counters[status]
          const isActive = activeStatus === status
          const label = counterLabel(status)
          return (
            <Button
              key={status}
              variant={isActive ? 'filled' : 'outlined'}
              color={isActive ? 'primary' : 'default'}
              aria-pressed={isActive}
              aria-label={`${label}: ${formatNumber(count)}. Показать в таблице`}
              onClick={() => onSelect(isActive ? undefined : status)}
              style={{
                height: 'auto',
                minWidth: 120,
                paddingBlock: token.paddingXS,
                paddingInline: token.padding,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: COUNT_FONT_SIZE,
                  fontWeight: token.fontWeightStrong,
                  lineHeight: 1.2,
                }}
              >
                {formatNumber(count)}
              </span>
              <span style={{ fontSize: token.fontSizeSM }}>{label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
