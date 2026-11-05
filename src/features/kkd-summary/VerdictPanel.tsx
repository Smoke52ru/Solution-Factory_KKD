import { Card, theme } from 'antd'
import type { ReactNode } from 'react'
import type { MetricRow, Trend } from '@/shared/api/types'
import { formatValue } from '@/shared/lib/format'
import { DeltaIndicator } from '@/shared/ui/DeltaIndicator'

const VALUE_FONT_SIZE = 30

interface VerdictPanelProps {
  /** Метрика `clean_goals_share` — главный вердикт. */
  metric: MetricRow
  comparedToId: string | null
  /** Счётчики `new / persisting / resolved` справа от вердикта. */
  counters: ReactNode
}

function verdictWord(trend: Trend): string {
  switch (trend) {
    case 'better':
      return 'Стало лучше'
    case 'worse':
      return 'Стало хуже'
    case 'same':
      return 'Без изменений'
    default: {
      const exhaustive: never = trend
      return exhaustive
    }
  }
}

/** Вердикт: доля корректных целей крупно, оценка «лучше / хуже / без изменений» и счётчики. */
export function VerdictPanel({ metric, comparedToId, counters }: VerdictPanelProps) {
  const { token } = theme.useToken()
  const hasValue = metric.value !== null
  const verdict = hasValue && metric.previous !== null && metric.trend !== null
    ? verdictWord(metric.trend)
    : null

  return (
    <Card
      styles={{ body: { padding: token.paddingLG } }}
      style={{ borderColor: token.colorBorderSecondary }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: token.marginLG,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginXS }}>
          <span style={{ color: token.colorTextSecondary }}>{metric.title}</span>
          <span
            style={{
              fontSize: VALUE_FONT_SIZE,
              fontWeight: token.fontWeightStrong,
              lineHeight: 1.2,
              color: hasValue ? token.colorText : token.colorTextTertiary,
            }}
          >
            {hasValue ? formatValue(metric.value, metric.unit) : '—'}
          </span>
          {hasValue ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: token.marginXS }}>
              {verdict === null ? null : (
                <span style={{ fontWeight: token.fontWeightStrong }}>{verdict}:</span>
              )}
              <DeltaIndicator
                delta={metric.delta}
                previous={metric.previous}
                deltaPct={metric.delta_pct}
                trend={metric.trend}
                unit={metric.unit}
                comparedToId={comparedToId}
                size="large"
              />
              {metric.previous === null ? null : (
                <span style={{ color: token.colorTextSecondary }}>
                  (было {formatValue(metric.previous, metric.unit)}
                  {comparedToId ? ` в ${comparedToId}` : ''})
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: token.colorTextTertiary }}>нет данных</span>
          )}
        </div>
        <div>{counters}</div>
      </div>
    </Card>
  )
}
