import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import { Tag, theme } from 'antd'
import type { ReactNode } from 'react'
import type { IssueHistoryItem } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'

interface IssueHistoryProps {
  history: readonly IssueHistoryItem[]
  /** Прогон, в котором открыта карточка. */
  currentRunId: string
}

interface HistoryState {
  icon: ReactNode
  text: string
}

function useHistoryState() {
  const { token } = theme.useToken()

  return (item: IssueHistoryItem): HistoryState => {
    if (item.present === true) {
      return {
        icon: <ExclamationCircleFilled style={{ color: token.colorErrorText }} aria-hidden />,
        text: 'Проблема есть',
      }
    }
    if (item.present === false) {
      return {
        icon: <CheckCircleFilled style={{ color: token.colorSuccessText }} aria-hidden />,
        text: 'Проблемы нет',
      }
    }
    // `present === null`: состояние неизвестно, потому что прогон не завершился успешно.
    switch (item.run_status) {
      case 'failed':
        return {
          icon: <CloseCircleFilled style={{ color: token.colorWarningText }} aria-hidden />,
          text: 'Ошибка прогона — состояние неизвестно',
        }
      case 'running':
        return {
          icon: <ClockCircleFilled style={{ color: token.colorInfoText }} aria-hidden />,
          text: 'Прогон выполняется — состояние неизвестно',
        }
      case 'completed':
        return {
          icon: <ClockCircleFilled style={{ color: token.colorTextTertiary }} aria-hidden />,
          text: 'Нет данных',
        }
      default: {
        const exhaustive: never = item.run_status
        return exhaustive
      }
    }
  }
}

/** История по прогонам: в каждом прогоне подписано, была ли проблема; неуспешные прогоны помечены текстом. */
export function IssueHistory({ history, currentRunId }: IssueHistoryProps) {
  const { token } = theme.useToken()
  const stateOf = useHistoryState()

  return (
    <ol
      aria-label="История проблемы по прогонам"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        rowGap: token.marginXS,
      }}
    >
      {history.map((item) => {
        const state = stateOf(item)
        return (
          <li
            key={item.run_id}
            style={{ display: 'flex', alignItems: 'center', columnGap: token.marginSM }}
          >
            {state.icon}
            <span style={{ fontWeight: token.fontWeightStrong }}>{item.run_id}</span>
            <span style={{ color: token.colorTextSecondary }}>{formatDate(item.snapshot_date)}</span>
            <span>{state.text}</span>
            {item.run_id === currentRunId ? <Tag bordered={false}>выбранный прогон</Tag> : null}
          </li>
        )
      })}
    </ol>
  )
}
