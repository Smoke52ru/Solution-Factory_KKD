import { theme } from 'antd'
import type { CSSProperties, PropsWithChildren } from 'react'

interface LabeledFieldProps {
  /** `id` вложенного контроля — связывает подпись с полем. */
  htmlFor: string
  label: string
  style?: CSSProperties
}

/** Подпись над полем формы: 12px, вторичный цвет, отступ 4px. */
export function LabeledField({
  htmlFor,
  label,
  style,
  children,
}: PropsWithChildren<LabeledFieldProps>) {
  const { token } = theme.useToken()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginXXS, ...style }}>
      <label
        htmlFor={htmlFor}
        style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
