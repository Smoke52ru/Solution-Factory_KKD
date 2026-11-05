import { Breadcrumb, Skeleton, theme } from 'antd'
import { useSummary } from '@/shared/api/hooks'
import { LabeledField } from '@/shared/ui/LabeledField'
import { ComparisonCaption } from './ComparisonCaption'
import { RunSelect } from './RunSelect'
import { UnitTreeSelect } from './UnitTreeSelect'

const UNIT_FIELD_ID = 'kkd-unit-select'
const RUN_FIELD_ID = 'kkd-run-select'
const UNIT_FIELD_WIDTH = 400
const RUN_FIELD_WIDTH = 320

interface ContextBarProps {
  unitId: string
  /** Выбранный прогон (может быть неуспешным — выбирать его можно). */
  runId: string | undefined
  /** Прогон, по которому реально запрашиваются данные; `undefined`, если результатов нет. */
  dataRunId: string | undefined
  onUnitChange: (unitId: string) => void
  onRunChange: (runId: string) => void
}

/** Контекст страницы: подразделение, прогон, хлебные крошки и подпись сравнения. */
export function ContextBar({ unitId, runId, dataRunId, onUnitChange, onRunChange }: ContextBarProps) {
  const { token } = theme.useToken()
  // Тот же ключ, что у SummarySection: запрос выполняется один раз.
  const summary = useSummary(dataRunId, unitId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.margin }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: token.margin }}>
        <LabeledField
          htmlFor={UNIT_FIELD_ID}
          label="Подразделение"
          style={{ width: UNIT_FIELD_WIDTH, maxWidth: '100%' }}
        >
          <UnitTreeSelect id={UNIT_FIELD_ID} value={unitId} onChange={onUnitChange} />
        </LabeledField>
        <LabeledField
          htmlFor={RUN_FIELD_ID}
          label="Прогон"
          style={{ width: RUN_FIELD_WIDTH, maxWidth: '100%' }}
        >
          <RunSelect id={RUN_FIELD_ID} value={runId} onChange={onRunChange} />
        </LabeledField>
      </div>

      {summary.isPending && dataRunId !== undefined ? (
        <Skeleton.Input active size="small" style={{ width: UNIT_FIELD_WIDTH }} />
      ) : null}
      {summary.data ? (
        <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginXXS }}>
          <Breadcrumb
            aria-label="Положение подразделения в оргструктуре"
            items={summary.data.unit.path.map((item) => ({ key: item.id, title: item.name }))}
          />
          <ComparisonCaption run={summary.data.run} comparedTo={summary.data.compared_to} />
        </div>
      ) : null}
    </div>
  )
}
