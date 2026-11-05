import { Typography } from 'antd'

const { Title } = Typography

/** Заглушка страницы ККД: секции подключаются поверх. */
export function KkdPage() {
  return (
    <main>
      <Title level={4}>Контроль качества данных</Title>
    </main>
  )
}
