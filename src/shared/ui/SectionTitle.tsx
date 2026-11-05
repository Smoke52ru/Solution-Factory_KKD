import { Typography, theme } from 'antd'
import type { PropsWithChildren } from 'react'

interface SectionTitleProps {
  id: string
  /** Уровень заголовка в документе; размер всегда 20/600/28 по UI-киту. */
  level?: 1 | 2 | 3
}

/** Заголовок страницы или секции: 20px, вес 600, межстрочный 28px. */
export function SectionTitle({ id, level = 2, children }: PropsWithChildren<SectionTitleProps>) {
  const { token } = theme.useToken()

  return (
    <Typography.Title
      id={id}
      level={level}
      style={{
        margin: 0,
        fontSize: token.fontSizeHeading4,
        lineHeight: token.lineHeightHeading4,
        fontWeight: token.fontWeightStrong,
      }}
    >
      {children}
    </Typography.Title>
  )
}
