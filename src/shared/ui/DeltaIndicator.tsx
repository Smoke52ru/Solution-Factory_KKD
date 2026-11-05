import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from '@ant-design/icons'
import { theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import type { MetricUnit, Trend } from '@/shared/api/types'
import { formatDelta, formatDeltaPct } from '@/shared/lib/format'

const FONT_WEIGHT_REGULAR = 400
const NO_COMPARISON_TEXT = 'нет данных для сравнения'
const LEADING_SIGN_RE = /^[+\u2212]/

interface DeltaIndicatorProps {
  /** Дельта и доля приходят с сервера как есть, на клиенте не пересчитываются. */
  delta: number | null
  previous: number | null
  deltaPct?: number | null
  /** `null` — оценка «лучше / хуже» неприменима: показываем нейтрально. */
  trend: Trend | null
  unit: MetricUnit
  /** Идентификатор прогона, с которым сравниваем, например `RUN-007`. */
  comparedToId?: string | null
  size?: 'default' | 'large'
  /**
   * Показывать слово оценки («лучше / хуже») рядом с числом. Отключается там, где оценка уже
   * написана рядом (вердикт); `aria-label` при этом остаётся полным.
   */
  showTrendLabel?: boolean
}

function trendLabel(trend: Trend): string {
  switch (trend) {
    case 'better':
      return 'лучше'
    case 'worse':
      return 'хуже'
    case 'same':
      return 'без изменений'
    default: {
      const exhaustive: never = trend
      return exhaustive
    }
  }
}

/** Цвет берётся от `trend`, а не от знака числа: рост проблем — это «хуже». */
function useTrendColor(trend: Trend | null): string {
  const { token } = theme.useToken()
  switch (trend) {
    case 'better':
      return token.colorSuccess
    case 'worse':
      return token.colorError
    case 'same':
    case null:
      return token.colorTextSecondary
    default: {
      const exhaustive: never = trend
      return exhaustive
    }
  }
}

function directionText(delta: number, absolute: string): string {
  if (delta > 0) return `Выросло на ${absolute}`
  if (delta < 0) return `Снизилось на ${absolute}`
  return 'Не изменилось'
}

function directionIcon(delta: number): ReactNode {
  if (delta > 0) return <ArrowUpOutlined aria-hidden />
  if (delta < 0) return <ArrowDownOutlined aria-hidden />
  return <MinusOutlined aria-hidden />
}

/**
 * Дельта метрики: стрелка + значение + слово по `trend`.
 * Если `previous === null`, ноль не показывается — только «нет данных для сравнения».
 */
export function DeltaIndicator({
  delta,
  previous,
  deltaPct,
  trend,
  unit,
  comparedToId,
  size = 'default',
  showTrendLabel = true,
}: DeltaIndicatorProps) {
  const { token } = theme.useToken()
  const color = useTrendColor(trend)
  const fontSize = size === 'large' ? token.fontSizeLG : token.fontSize

  if (previous === null || delta === null) {
    return (
      <span style={{ color: token.colorTextTertiary, fontSize }}>{NO_COMPARISON_TEXT}</span>
    )
  }

  const label = trend === null ? null : trendLabel(trend)
  const deltaText = formatDelta(delta, unit)
  const pctText = deltaPct === null || deltaPct === undefined ? null : formatDeltaPct(deltaPct)
  const absolute = deltaText.replace(LEADING_SIGN_RE, '')

  const ariaParts = [
    directionText(delta, absolute),
    comparedToId ? ` относительно ${comparedToId}` : '',
    label !== null && delta !== 0 ? ` — ${label}` : '',
  ]
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: token.marginXS,
    color,
    fontSize,
    fontWeight: token.fontWeightStrong,
  }

  return (
    <span role="img" aria-label={ariaParts.join('')} style={style}>
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', columnGap: token.marginXXS }}>
        {directionIcon(delta)}
        {deltaText}
        {pctText === null ? null : <span style={{ fontWeight: FONT_WEIGHT_REGULAR }}>({pctText})</span>}
      </span>
      {label === null || !showTrendLabel ? null : (
        <span aria-hidden style={{ fontWeight: FONT_WEIGHT_REGULAR }}>
          {label}
        </span>
      )}
    </span>
  )
}
