import { formatNumber } from '@/shared/lib/format'

const pluralRules = new Intl.PluralRules('ru-RU')

function runsWord(count: number): string {
  const category = pluralRules.select(count)
  switch (category) {
    case 'one':
      return 'прогон'
    case 'few':
      return 'прогона'
    case 'zero':
    case 'two':
    case 'many':
    case 'other':
      return 'прогонов'
    default: {
      const exhaustive: never = category
      return exhaustive
    }
  }
}

/** «Подряд N прогонов»; `null` (исправленная проблема) → «—». */
export function formatRunsInRow(runsInRow: number | null): string {
  return runsInRow === null ? '—' : `${formatNumber(runsInRow)} ${runsWord(runsInRow)}`
}
