import { CheckCircleOutlined, ClockCircleOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Tag, theme } from 'antd'
import type { ReactNode } from 'react'
import type { DeltaStatus } from '@/shared/api/types'

interface DeltaStatusTagProps {
  status: DeltaStatus
  /** Подпись из `meta.delta_statuses`; без неё используется встроенная. */
  label?: string
}

interface StatusPresentation {
  label: string
  icon: ReactNode
  color: string
  background: string
  border: string
}

function usePresentation(status: DeltaStatus): StatusPresentation {
  const { token } = theme.useToken()
  switch (status) {
    case 'new':
      return {
        label: 'Новая',
        icon: <PlusCircleOutlined aria-hidden />,
        color: token.colorErrorText,
        background: token.colorErrorBg,
        border: token.colorErrorBg,
      }
    case 'persisting':
      return {
        label: 'Сохраняется',
        icon: <ClockCircleOutlined aria-hidden />,
        color: token.colorText,
        background: token.colorFill,
        border: token.colorFill,
      }
    case 'resolved':
      return {
        label: 'Исправлена',
        icon: <CheckCircleOutlined aria-hidden />,
        color: token.colorSuccessText,
        background: token.colorSuccessBg,
        border: token.colorSuccessBg,
      }
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

/** Статус проблемы относительно прошлого прогона: слово + значок + фон. */
export function DeltaStatusTag({ status, label }: DeltaStatusTagProps) {
  const presentation = usePresentation(status)

  return (
    <Tag
      icon={presentation.icon}
      style={{
        color: presentation.color,
        background: presentation.background,
        borderColor: presentation.border,
        marginInlineEnd: 0,
      }}
    >
      {label ?? presentation.label}
    </Tag>
  )
}
