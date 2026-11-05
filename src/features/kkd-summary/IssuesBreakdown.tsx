import { CheckCircleFilled } from '@ant-design/icons'
import { Button, Card, theme } from 'antd'
import { useMeta } from '@/shared/api/hooks'
import type { MetaSeverity, RuleRow, Severity, SeverityRow } from '@/shared/api/types'
import { formatNumber } from '@/shared/lib/format'
import { DeltaIndicator } from '@/shared/ui/DeltaIndicator'
import { SectionTitle } from '@/shared/ui/SectionTitle'
import { SeverityTag } from '@/shared/ui/SeverityTag'

const HEADING_ID = 'kkd-breakdown-heading'

interface IssuesBreakdownProps {
  severityRows: readonly SeverityRow[]
  ruleRows: readonly RuleRow[]
  comparedToId: string | null
  activeRuleCodes: readonly string[]
  onSelectRule: (ruleCode: string) => void
}

/** Порядок важности из `meta.severities`; без справочника — как в ответе. */
function severityOrder(severities: readonly MetaSeverity[] | undefined) {
  const order = new Map<Severity, number>(
    (severities ?? []).map((severity) => [severity.code, severity.order]),
  )
  return (code: Severity) => order.get(code) ?? Number.MAX_SAFE_INTEGER
}

/**
 * «Что исправлять в первую очередь»: только строки с `current > 0`.
 * Сортировка — лишь порядок вывода: важность, затем число проблем. Числа не пересчитываются.
 */
export function IssuesBreakdown({
  severityRows,
  ruleRows,
  comparedToId,
  activeRuleCodes,
  onSelectRule,
}: IssuesBreakdownProps) {
  const { token } = theme.useToken()
  const meta = useMeta()
  const orderOf = severityOrder(meta.data?.severities)

  const severities = severityRows
    .filter((row) => row.current > 0)
    .toSorted((a, b) => orderOf(a.code) - orderOf(b.code) || b.current - a.current)
  const rules = ruleRows
    .filter((row) => row.current > 0)
    .toSorted((a, b) => orderOf(a.severity) - orderOf(b.severity) || b.current - a.current)

  return (
    <section aria-labelledby={HEADING_ID}>
      <Card
        styles={{ body: { padding: token.paddingLG } }}
        style={{ borderColor: token.colorBorderSecondary }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.margin }}>
          <SectionTitle id={HEADING_ID} level={3}>
            Что исправлять в первую очередь
          </SectionTitle>

          {rules.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', columnGap: token.marginXS }}>
              <CheckCircleFilled aria-hidden style={{ color: token.colorSuccess }} />
              <span>Проблем не найдено</span>
            </div>
          ) : (
            <>
              <ul
                aria-label="Проблемы по важности"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: token.margin,
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                {severities.map((row) => (
                  <li
                    key={row.code}
                    style={{ display: 'flex', alignItems: 'center', columnGap: token.marginXS }}
                  >
                    <SeverityTag severity={row.code} label={row.title} />
                    <span style={{ fontWeight: token.fontWeightStrong }}>
                      {formatNumber(row.current)}
                    </span>
                    <DeltaIndicator
                      delta={row.delta}
                      previous={row.previous}
                      trend={null}
                      unit="шт."
                      comparedToId={comparedToId}
                    />
                  </li>
                ))}
              </ul>

              <ul
                aria-label="Проблемы по правилам: нажмите, чтобы показать в таблице"
                style={{ listStyle: 'none', margin: 0, padding: 0 }}
              >
                {rules.map((row) => {
                  const isActive = activeRuleCodes.includes(row.code)
                  return (
                    <li key={row.code}>
                      <Button
                        type={isActive ? 'default' : 'text'}
                        aria-pressed={isActive}
                        aria-label={`Показать в таблице: ${row.title}, проблем ${formatNumber(row.current)}`}
                        onClick={() => onSelectRule(row.code)}
                        block
                        style={{
                          height: 'auto',
                          paddingBlock: token.paddingXS,
                          paddingInline: token.paddingSM,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          columnGap: token.margin,
                          textAlign: 'start',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', columnGap: token.marginXS }}>
                          <SeverityTag severity={row.severity} />
                          <span>{row.title}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', columnGap: token.marginSM }}>
                          <span style={{ fontWeight: token.fontWeightStrong }}>
                            {formatNumber(row.current)}
                          </span>
                          <DeltaIndicator
                            delta={row.delta}
                            previous={row.previous}
                            trend={null}
                            unit="шт."
                            comparedToId={comparedToId}
                          />
                        </span>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </Card>
    </section>
  )
}
