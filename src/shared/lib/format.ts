import type { MetricUnit } from '@/shared/api/types'

const LOCALE = 'ru-RU'
const EMPTY_VALUE = '—'
const MINUS = '\u2212'
const NBSP = '\u00A0'
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })
const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Подпись единицы: для процентов — `%`, для дельты процентов — «п.п.». */
function unitLabel(unit: MetricUnit, kind: 'value' | 'delta'): string {
  switch (unit) {
    case '%':
      return kind === 'delta' ? 'п.п.' : '%'
    case 'шт.':
      return 'шт.'
    default: {
      const exhaustive: never = unit
      return exhaustive
    }
  }
}

function withUnit(text: string, unit: MetricUnit, kind: 'value' | 'delta'): string {
  return `${text}${NBSP}${unitLabel(unit, kind)}`
}

/** `1234.5` → `1 234,5`; `null` → `—`. */
export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY_VALUE : numberFormat.format(value)
}

/** `87.5, '%'` → `87,5 %`; `12, 'шт.'` → `12 шт.`; `null` → `—`. */
export function formatValue(value: number | null | undefined, unit: MetricUnit): string {
  if (value === null || value === undefined) return EMPTY_VALUE
  return withUnit(numberFormat.format(value), unit, 'value')
}

/** Дельта со знаком: `+4,3 п.п.`, `−2 шт.`, `0 шт.`; `null` → `—`. */
export function formatDelta(delta: number | null | undefined, unit: MetricUnit): string {
  if (delta === null || delta === undefined) return EMPTY_VALUE
  const sign = delta > 0 ? '+' : delta < 0 ? MINUS : ''
  return withUnit(`${sign}${numberFormat.format(Math.abs(delta))}`, unit, 'delta')
}

/** Относительное изменение со знаком: `+12,5 %`; `null` → `—`. */
export function formatDeltaPct(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return EMPTY_VALUE
  const sign = pct > 0 ? '+' : pct < 0 ? MINUS : ''
  return `${sign}${numberFormat.format(Math.abs(pct))}${NBSP}%`
}

/** Дата `YYYY-MM-DD` без сдвига часового пояса → `26.10.2026`. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return EMPTY_VALUE
  const match = ISO_DATE_RE.exec(isoDate)
  if (!match) return dateFormat.format(new Date(isoDate))
  const [, year, month, day] = match
  return dateFormat.format(new Date(Number(year), Number(month) - 1, Number(day)))
}

/** Момент времени ISO 8601 → `26.10.2026, 06:14` в локальной зоне. */
export function formatDateTime(isoDateTime: string | null | undefined): string {
  return isoDateTime ? dateTimeFormat.format(new Date(isoDateTime)) : EMPTY_VALUE
}
