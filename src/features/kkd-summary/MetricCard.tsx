import { InfoCircleOutlined } from '@ant-design/icons'
import { Card, Tooltip, theme } from 'antd'
import type { MetricRow } from '@/shared/api/types'
import { formatValue } from '@/shared/lib/format'
import { DeltaIndicator } from '@/shared/ui/DeltaIndicator'

const VALUE_FONT_SIZE = 28

interface MetricCardProps {
  metric: MetricRow
  comparedToId: string | null
}

/** Карточка метрики: значение, «было X», дельта с оценкой; формула — в подсказке. */
export function MetricCard({ metric, comparedToId }: MetricCardProps) {
  const { token } = theme.useToken()
  const hasValue = metric.value !== null

  return (
    <Card
      size="small"
      styles={{ body: { padding: token.paddingMD } }}
      style={{ borderColor: token.colorBorderSecondary }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginXS }}>
        <div style={{ display: 'flex', alignItems: 'center', columnGap: token.marginXXS }}>
          <span style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
            {metric.title}
          </span>
          <Tooltip title={`Формула: ${metric.formula}`}>
            <span
              tabIndex={0}
              role="img"
              aria-label={`Формула расчёта: ${metric.formula}`}
              style={{ color: token.colorTextTertiary, display: 'inline-flex' }}
            >
              <InfoCircleOutlined />
            </span>
          </Tooltip>
        </div>

        <div
          style={{
            fontSize: VALUE_FONT_SIZE,
            fontWeight: token.fontWeightStrong,
            lineHeight: 1.2,
            color: hasValue ? token.colorText : token.colorTextTertiary,
          }}
        >
          {hasValue ? formatValue(metric.value, metric.unit) : '—'}
        </div>

        {hasValue ? (
          <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginXXS }}>
            {metric.previous === null ? null : (
              <span style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
                было {formatValue(metric.previous, metric.unit)}
              </span>
            )}
            <DeltaIndicator
              delta={metric.delta}
              previous={metric.previous}
              deltaPct={metric.delta_pct}
              trend={metric.trend}
              unit={metric.unit}
              comparedToId={comparedToId}
            />
          </div>
        ) : (
          <span style={{ color: token.colorTextTertiary, fontSize: token.fontSizeSM }}>
            нет данных
          </span>
        )}
      </div>
    </Card>
  )
}
