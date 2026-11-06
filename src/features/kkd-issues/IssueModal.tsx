import { Alert, Descriptions, Modal, Result, Skeleton, Typography, theme } from 'antd'
import { useIssue } from '@/shared/api/hooks'
import { isNotFound } from '@/shared/api/errors'
import type { IssueDetail } from '@/shared/api/types'
import { formatDate, formatNumber } from '@/shared/lib/format'
import { DeltaStatusTag } from '@/shared/ui/DeltaStatusTag'
import { ErrorState } from '@/shared/ui/ErrorState'
import { SeverityTag } from '@/shared/ui/SeverityTag'
import { SlowLoadingHint } from '@/shared/ui/SlowLoadingHint'
import { formatRunsInRow } from './formatRunsInRow'
import { IssueHistory } from './IssueHistory'

const MODAL_WIDTH = 720
const VALUE_FONT_SIZE = 20

interface IssueModalProps {
  /** Открыта, пока в URL есть `issue`. */
  issueId: string | undefined
  runId: string | undefined
  onClose: () => void
}

function formatFact(value: string | number | null): string {
  if (value === null) return '—'
  return typeof value === 'number' ? formatNumber(value) : value
}

function FactBox({ label, value }: { label: string; value: string | number | null }) {
  const { token } = theme.useToken()

  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        padding: token.padding,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgLayout,
        border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>{label}</div>
      <div style={{ fontSize: VALUE_FONT_SIZE, fontWeight: token.fontWeightStrong }}>
        {formatFact(value)}
      </div>
    </div>
  )
}

function IssueContent({ issue, runId }: { issue: IssueDetail; runId: string }) {
  const { token } = theme.useToken()
  const objectLabel = issue.kr_title
    ? `КР ${issue.kr_id ?? issue.object_id}: ${issue.kr_title}`
    : `Цель ${issue.goal_id}: ${issue.goal_title}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.margin }}>
      <Typography.Text type="secondary">{issue.id}</Typography.Text>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: token.marginXS }}>
        <SeverityTag severity={issue.severity} />
        <DeltaStatusTag status={issue.delta_status} />
      </div>

      <Typography.Paragraph style={{ margin: 0 }}>{issue.details}</Typography.Paragraph>

      <div style={{ display: 'flex', gap: token.margin }}>
        <FactBox label="Факт" value={issue.actual} />
        <FactBox label="Ожидание" value={issue.expected} />
      </div>

      <Alert type="info" showIcon message="Рекомендация" description={issue.recommendation} />

      <Descriptions
        size="small"
        column={1}
        items={[
          { key: 'object', label: 'Объект', children: objectLabel },
          { key: 'unit', label: 'Подразделение', children: issue.unit_name },
          {
            key: 'owner',
            label: 'Ответственный',
            children: issue.owner
              ? `${issue.owner.full_name}, ${issue.owner.position}`
              : 'Не назначен',
          },
          {
            key: 'first',
            label: 'Впервые обнаружена',
            children: issue.first_detected_run_id
              ? `${issue.first_detected_run_id} от ${formatDate(issue.first_detected_at)}`
              : '—',
          },
          { key: 'streak', label: 'Присутствует', children: formatRunsInRow(issue.runs_in_row) },
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginXS }}>
        <Typography.Text strong>История по прогонам</Typography.Text>
        <IssueHistory history={issue.history} currentRunId={runId} />
      </div>
    </div>
  )
}

/** Карточка проблемы. Состояние (`issue`) живёт в URL; 404 показывается внутри окна. */
export function IssueModal({ issueId, runId, onClose }: IssueModalProps) {
  const issue = useIssue(issueId, runId)

  const body = () => {
    if (issue.isError) {
      return isNotFound(issue.error) ? (
        <Result
          status="warning"
          title="Проблема не найдена"
          subTitle={issue.error.message}
        />
      ) : (
        <ErrorState
          error={issue.error}
          onRetry={() => void issue.refetch()}
          retrying={issue.isFetching}
        />
      )
    }
    if (issue.isPending || runId === undefined) {
      return (
        <div aria-busy>
          <Skeleton active paragraph={{ rows: 8 }} />
          <SlowLoadingHint loading />
        </div>
      )
    }
    return <IssueContent issue={issue.data} runId={runId} />
  }

  const title = issue.data?.rule_title ?? 'Карточка проблемы'

  return (
    <Modal
      open={issueId !== undefined}
      title={title}
      width={MODAL_WIDTH}
      footer={null}
      destroyOnHidden
      onCancel={onClose}
    >
      {body()}
    </Modal>
  )
}
