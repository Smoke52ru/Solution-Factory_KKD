import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, Col, Row, Space, Spin, Typography } from 'antd'
import { fetchMeta, fetchSummary } from '@/shared/api/kkd'
import type { MetricValue } from '@/shared/api/types'

const { Title, Text, Paragraph } = Typography

function MetricCard({
  title,
  metric,
}: {
  title: string
  metric: MetricValue | undefined
}) {
  if (!metric) {
    return (
      <Card size="small">
        <Text type="secondary">{title}</Text>
        <Title level={3} style={{ margin: '8px 0 0' }}>
          —
        </Title>
      </Card>
    )
  }

  const trendColor =
    metric.trend === 'better'
      ? 'success'
      : metric.trend === 'worse'
        ? 'danger'
        : 'secondary'

  return (
    <Card size="small" styles={{ body: { padding: 20 } }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {title}
      </Text>
      <Title level={3} style={{ margin: '8px 0 4px', fontWeight: 600 }}>
        {metric.value ?? '—'}
      </Title>
      {metric.previous === null ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          нет данных для сравнения
        </Text>
      ) : (
        <Text type={trendColor} style={{ fontSize: 12 }}>
          {metric.trend === 'better' ? '↑' : metric.trend === 'worse' ? '↓' : '→'}{' '}
          {metric.delta ?? 0}
          {metric.delta_pct != null ? ` (${metric.delta_pct}%)` : ''}
        </Text>
      )}
    </Card>
  )
}

export function KkdDashboardPage() {
  const metaQuery = useQuery({
    queryKey: ['meta'],
    queryFn: fetchMeta,
  })

  const summaryQuery = useQuery({
    queryKey: ['kkd-summary', 'latest', 'B2B'],
    queryFn: () => fetchSummary({ run_id: 'latest', unit_id: 'B2B' }),
  })

  const isLoading = metaQuery.isLoading || summaryQuery.isLoading
  const error = metaQuery.error ?? summaryQuery.error

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Space
        style={{ width: '100%', justifyContent: 'space-between' }}
        align="start"
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Контроль качества данных
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Сводка по целям и ключевым результатам блока B2B
          </Paragraph>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void metaQuery.refetch()
            void summaryQuery.refetch()
          }}
        >
          Обновить
        </Button>
      </Space>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить данные mock API"
          description={
            error instanceof Error
              ? error.message
              : 'Проверьте, что mock API запущен на http://localhost:8000'
          }
        />
      ) : null}

      <Spin spinning={isLoading}>
        <Row gutter={[16, 16]}>
          {(metaQuery.data?.metrics ?? [{ code: 'placeholder', title: 'Метрика' }]).map(
            (metricMeta) => (
              <Col xs={24} sm={12} lg={8} key={metricMeta.code}>
                <MetricCard
                  title={metricMeta.title}
                  metric={summaryQuery.data?.metrics?.[metricMeta.code]}
                />
              </Col>
            ),
          )}
        </Row>

        {summaryQuery.data ? (
          <Card size="small" styles={{ body: { padding: 20 } }} style={{ marginTop: 16 }}>
            <Text type="secondary">Статусы проблем</Text>
            <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
              новых: {summaryQuery.data.counters.new}, сохраняется:{' '}
              {summaryQuery.data.counters.persisting}, исправлено:{' '}
              {summaryQuery.data.counters.resolved}
            </Paragraph>
          </Card>
        ) : null}
      </Spin>
    </Space>
  )
}
