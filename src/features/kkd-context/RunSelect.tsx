import { Select, Tag, theme } from 'antd'
import { useMemo } from 'react'
import { useRuns } from '@/shared/api/hooks'
import type { Run, RunStatus } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'

interface RunSelectProps {
  id: string
  value: string | undefined
  onChange: (runId: string) => void
}

function RunStatusTag({ status }: { status: RunStatus }) {
  const { token } = theme.useToken()
  const tagStyle = (color: string, background: string) => ({
    color,
    background,
    marginInlineEnd: 0,
  })

  switch (status) {
    case 'completed':
      return <Tag bordered={false} style={tagStyle(token.colorSuccessText, token.colorSuccessBg)}>Успешно</Tag>
    case 'failed':
      return <Tag bordered={false} style={tagStyle(token.colorErrorText, token.colorErrorBg)}>Ошибка</Tag>
    case 'running':
      return <Tag bordered={false} style={tagStyle(token.colorInfoText, token.colorInfoBg)}>Выполняется</Tag>
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

function RunOptionLabel({ run }: { run: Run }) {
  const { token } = theme.useToken()

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', columnGap: token.marginXS }}>
      <span>{`${run.id} от ${formatDate(run.snapshot_date)}`}</span>
      <RunStatusTag status={run.status} />
    </span>
  )
}

/** Прогоны от новых к старым; статус — тегом со словом. Прогон с ошибкой выбирать можно. */
export function RunSelect({ id, value, onChange }: RunSelectProps) {
  const runs = useRuns()

  const options = useMemo(
    () => (runs.data ?? []).map((run) => ({ value: run.id, label: <RunOptionLabel run={run} /> })),
    [runs.data],
  )

  return (
    <Select
      id={id}
      value={value}
      options={options}
      loading={runs.isPending}
      status={runs.isError ? 'error' : undefined}
      placeholder="Выберите прогон"
      popupMatchSelectWidth={false}
      style={{ width: '100%' }}
      onChange={onChange}
    />
  )
}
