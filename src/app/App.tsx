import { Layout, Typography, theme as antdTheme } from 'antd'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { KkdPage } from '@/pages/kkd/KkdPage'

const { Header } = Layout
const { Text } = Typography

const CONTENT_MAX_WIDTH = 1440

export default function App() {
  const { token } = antdTheme.useToken()

  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingInline: token.paddingLG,
            background: token.colorBgContainer,
            borderBottom: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
          }}
        >
          <Text strong style={{ fontSize: token.fontSizeHeading4, lineHeight: token.lineHeightHeading4 }}>
            Solution Factory · ККД
          </Text>
        </Header>
        {/* Не `Layout.Content`: он рендерит `<main>`, а `<main>` задаёт сама страница. */}
        <div
          style={{
            width: '100%',
            maxWidth: CONTENT_MAX_WIDTH,
            margin: '0 auto',
            padding: token.paddingLG,
          }}
        >
          <Routes>
            <Route path="/" element={<KkdPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Layout>
    </BrowserRouter>
  )
}
