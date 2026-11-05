import { Layout, Typography } from 'antd'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { KkdDashboardPage } from '@/pages/KkdDashboardPage'

const { Header, Content } = Layout
const { Title } = Typography

export default function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingInline: 24,
            background: '#fefcfa',
            borderBottom: '1px solid #e8e5e2',
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            Solution Factory · ККД
          </Title>
        </Header>
        <Content style={{ padding: 24, background: '#f7f3f0' }}>
          <Routes>
            <Route path="/" element={<KkdDashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
    </BrowserRouter>
  )
}
