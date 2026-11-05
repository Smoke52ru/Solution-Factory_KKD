import { CheckCircleFilled } from '@ant-design/icons'
import { Button, Empty, Skeleton, Table, Typography, theme } from 'antd'
import type { TableColumnsType } from 'antd'
import type { KeyboardEvent } from 'react'
import type { Issue, IssuesResponse } from '@/shared/api/types'
import { formatNumber } from '@/shared/lib/format'
import { DeltaStatusTag } from '@/shared/ui/DeltaStatusTag'
import { ErrorState } from '@/shared/ui/ErrorState'
import { SeverityTag } from '@/shared/ui/SeverityTag'
import { SlowLoadingHint } from '@/shared/ui/SlowLoadingHint'
import { formatRunsInRow } from './formatRunsInRow'

const EMPTY_ICON_SIZE = 48

interface IssuesTableProps {
  data: IssuesResponse | undefined
  isPending: boolean
  /** Идёт запрос: в таблице остаются прежние данные, пока приходят новые. */
  isFetching: boolean
  error: unknown
  hasActiveFilters: boolean
  page: number
  pageSize: number
  onRetry: () => void
  onPageChange: (page: number) => void
  onOpenIssue: (issueId: string) => void
  onResetFilters: () => void
}

function objectTypeLabel(issue: Issue): string {
  switch (issue.object_type) {
    case 'goal':
      return `Цель ${issue.goal_id}`
    case 'key_result':
      return `КР ${issue.kr_id ?? issue.object_id} · цель ${issue.goal_id}`
    default: {
      const exhaustive: never = issue.object_type
      return exhaustive
    }
  }
}

function EmptyIssues({
  hasActiveFilters,
  onResetFilters,
}: Pick<IssuesTableProps, 'hasActiveFilters' | 'onResetFilters'>) {
  const { token } = theme.useToken()

  if (hasActiveFilters) {
    return (
      <Empty description="По выбранным фильтрам проблем не найдено">
        <Button type="primary" onClick={onResetFilters}>
          Сбросить фильтры
        </Button>
      </Empty>
    )
  }

  return (
    <Empty
      image={
        <CheckCircleFilled
          aria-hidden
          style={{ fontSize: EMPTY_ICON_SIZE, color: token.colorSuccess }}
        />
      }
      description="Проблем не найдено"
    />
  )
}

/** Таблица проблем с серверной пагинацией; строка открывает карточку по клику и Enter. */
export function IssuesTable({
  data,
  isPending,
  isFetching,
  error,
  hasActiveFilters,
  page,
  pageSize,
  onRetry,
  onPageChange,
  onOpenIssue,
  onResetFilters,
}: IssuesTableProps) {
  const { token } = theme.useToken()

  if (error) return <ErrorState error={error} onRetry={onRetry} retrying={isFetching} />

  if (isPending || data === undefined) {
    return (
      <div aria-busy>
        <Skeleton active paragraph={{ rows: 6 }} />
        <SlowLoadingHint loading />
      </div>
    )
  }

  const columns: TableColumnsType<Issue> = [
    {
      title: 'Важность',
      dataIndex: 'severity',
      width: 160,
      render: (_, issue) => <SeverityTag severity={issue.severity} />,
    },
    {
      title: 'Правило',
      dataIndex: 'rule_title',
      width: 240,
    },
    {
      title: 'Объект',
      key: 'object',
      render: (_, issue) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{issue.kr_title ?? issue.goal_title}</span>
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            {objectTypeLabel(issue)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Подразделение',
      dataIndex: 'unit_name',
      width: 200,
    },
    {
      title: 'Ответственный',
      key: 'owner',
      width: 180,
      render: (_, issue) =>
        issue.owner === null ? (
          <Typography.Text type="secondary">Не назначен</Typography.Text>
        ) : (
          issue.owner.full_name
        ),
    },
    {
      title: 'Статус',
      dataIndex: 'delta_status',
      width: 160,
      render: (_, issue) => <DeltaStatusTag status={issue.delta_status} />,
    },
    {
      title: 'Подряд',
      dataIndex: 'runs_in_row',
      width: 120,
      render: (_, issue) => formatRunsInRow(issue.runs_in_row),
    },
  ]

  const handleRowKeyDown = (event: KeyboardEvent, issueId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpenIssue(issueId)
    }
  }

  return (
    <Table<Issue>
      rowKey="id"
      columns={columns}
      dataSource={data.items}
      loading={isFetching}
      locale={{
        emptyText: (
          <EmptyIssues hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters} />
        ),
      }}
      pagination={{
        current: page,
        pageSize,
        total: data.total,
        showSizeChanger: false,
        hideOnSinglePage: true,
        showTotal: (total) => `Всего: ${formatNumber(total)}`,
        onChange: (nextPage) => onPageChange(nextPage),
      }}
      onRow={(issue) => ({
        tabIndex: 0,
        style: { cursor: 'pointer' },
        'aria-label': `Открыть карточку проблемы: ${issue.rule_title}`,
        onClick: () => onOpenIssue(issue.id),
        onKeyDown: (event) => handleRowKeyDown(event, issue.id),
      })}
    />
  )
}
