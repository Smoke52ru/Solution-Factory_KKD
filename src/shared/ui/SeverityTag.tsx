import { ExclamationCircleFilled, MinusCircleFilled, WarningFilled } from '@ant-design/icons'
import { Tag, theme } from 'antd'
import type { ReactNode } from 'react'
import type { Severity } from '@/shared/api/types'

interface SeverityTagProps {
  severity: Severity
  /** Подпись из `meta.severities`; без неё используется встроенная. */
  label?: string
}

interface SeverityPresentation {
  label: string
  icon: ReactNode
  color: string
  background: string
  border: string
}

function usePresentation(severity: Severity): SeverityPresentation {
  const { token } = theme.useToken()
  switch (severity) {
    case 'critical':
      return {
        label: 'Критичная',
        icon: <ExclamationCircleFilled aria-hidden />,
        color: token.colorErrorText,
        background: token.colorErrorBg,
        border: token.colorError,
      }
    case 'major':
      return {
        label: 'Существенная',
        icon: <WarningFilled aria-hidden />,
        color: token.colorWarningText,
        background: token.colorWarningBg,
        border: token.colorWarning,
      }
    case 'minor':
      return {
        label: 'Незначительная',
        icon: <MinusCircleFilled aria-hidden />,
        color: token.colorTextSecondary,
        background: token.colorFill,
        border: token.colorBorder,
      }
    default: {
      const exhaustive: never = severity
      return exhaustive
    }
  }
}

/** Важность проблемы: уровень всегда подписан словом, цвет и значок только дополняют. */
export function SeverityTag({ severity, label }: SeverityTagProps) {
  const presentation = usePresentation(severity)

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
