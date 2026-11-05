import { Typography } from 'antd'
import type { Run } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'

interface ComparisonCaptionProps {
  run: Run
  /** `null` у первого прогона — сравнивать не с чем. */
  comparedTo: Run | null
}

function runText(run: Run): string {
  return `${run.id} от ${formatDate(run.snapshot_date)}`
}

/** Подпись: с каким прогоном сравнивается выбранный. */
export function ComparisonCaption({ run, comparedTo }: ComparisonCaptionProps) {
  return (
    <Typography.Text type="secondary">
      {comparedTo === null
        ? 'Первый прогон — сравнивать не с чем'
        : `${runText(run)} сравнивается с ${runText(comparedTo)}`}
    </Typography.Text>
  )
}
