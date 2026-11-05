import { SearchOutlined } from '@ant-design/icons'
import { Button, Input, Segmented, Select, Typography, theme } from 'antd'
import { useEffect, useRef, useState } from 'react'
import type { KkdFilters, KkdFiltersPatch } from '@/features/kkd-context/useKkdParams'
import { useMeta } from '@/shared/api/hooks'
import type { DeltaStatus } from '@/shared/api/types'
import { LabeledField } from '@/shared/ui/LabeledField'

const RULE_FIELD_ID = 'kkd-filter-rule'
const SEVERITY_FIELD_ID = 'kkd-filter-severity'
const SEARCH_FIELD_ID = 'kkd-filter-search'
const STATUS_LABEL_ID = 'kkd-filter-status-label'
const ALL_STATUSES = 'all'
const SEARCH_DEBOUNCE_MS = 400
const RULE_FIELD_WIDTH = 320
const SEVERITY_FIELD_WIDTH = 240
const SEARCH_FIELD_WIDTH = 280

type StatusOption = DeltaStatus | typeof ALL_STATUSES

interface IssuesFiltersProps {
  filters: KkdFilters
  hasActiveFilters: boolean
  /** Первый прогон: сравнивать не с чем, статус «исправлена» недоступен. */
  disableResolved: boolean
  onChange: (patch: KkdFiltersPatch) => void
  onReset: () => void
}

function isDeltaStatusOption(value: string | number): value is StatusOption {
  return (
    value === ALL_STATUSES || value === 'new' || value === 'persisting' || value === 'resolved'
  )
}

/** Поиск с задержкой: в URL (и в запрос) значение попадает после паузы в наборе. */
function SearchInput({ value, onCommit }: { value: string; onCommit: (q: string) => void }) {
  const [draft, setDraft] = useState(value)
  const committed = useRef(value)

  useEffect(() => {
    // Внешнее изменение (например, «Сбросить фильтры») обновляет поле.
    if (value !== committed.current) {
      committed.current = value
      setDraft(value)
    }
  }, [value])

  useEffect(() => {
    if (draft.trim() === committed.current) return undefined
    const timer = window.setTimeout(() => {
      committed.current = draft.trim()
      onCommit(committed.current)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, onCommit])

  return (
    <Input
      id={SEARCH_FIELD_ID}
      value={draft}
      allowClear
      prefix={<SearchOutlined aria-hidden />}
      placeholder="ID, название, ответственный"
      onChange={(event) => setDraft(event.target.value)}
    />
  )
}

export function IssuesFilters({
  filters,
  hasActiveFilters,
  disableResolved,
  onChange,
  onReset,
}: IssuesFiltersProps) {
  const { token } = theme.useToken()
  const meta = useMeta()

  const statusTitles = new Map(
    (meta.data?.delta_statuses ?? []).map((status) => [status.code, status.title]),
  )
  const statusOptions = [
    { value: ALL_STATUSES, label: 'Все' },
    { value: 'new', label: statusTitles.get('new') ?? 'Новая' },
    { value: 'persisting', label: statusTitles.get('persisting') ?? 'Сохраняется' },
    {
      value: 'resolved',
      label: statusTitles.get('resolved') ?? 'Исправлена',
      disabled: disableResolved,
    },
  ] satisfies { value: StatusOption; label: string; disabled?: boolean }[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginXS }}>
      <div
        role="search"
        aria-label="Фильтры проблем"
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: token.margin }}
      >
        <LabeledField
          htmlFor={RULE_FIELD_ID}
          label="Правило"
          style={{ width: RULE_FIELD_WIDTH, maxWidth: '100%' }}
        >
          <Select
            id={RULE_FIELD_ID}
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            value={filters.ruleCodes}
            loading={meta.isPending}
            options={(meta.data?.rules ?? []).map((rule) => ({
              value: rule.code,
              label: rule.title,
            }))}
            placeholder="Все правила"
            optionFilterProp="label"
            onChange={(ruleCodes: string[]) => onChange({ ruleCodes })}
          />
        </LabeledField>

        <LabeledField
          htmlFor={SEVERITY_FIELD_ID}
          label="Важность"
          style={{ width: SEVERITY_FIELD_WIDTH, maxWidth: '100%' }}
        >
          <Select
            id={SEVERITY_FIELD_ID}
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            value={filters.severities}
            loading={meta.isPending}
            options={(meta.data?.severities ?? []).map((severity) => ({
              value: severity.code,
              label: severity.title,
            }))}
            placeholder="Любая"
            onChange={(severities) => onChange({ severities })}
          />
        </LabeledField>

        <div
          role="group"
          aria-labelledby={STATUS_LABEL_ID}
          style={{ display: 'flex', flexDirection: 'column', rowGap: token.marginXXS }}
        >
          <span
            id={STATUS_LABEL_ID}
            style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}
          >
            Статус относительно прошлого прогона
          </span>
          <Segmented
            value={filters.deltaStatus ?? ALL_STATUSES}
            options={statusOptions}
            onChange={(value) => {
              if (!isDeltaStatusOption(value)) return
              onChange({ deltaStatus: value === ALL_STATUSES ? undefined : value })
            }}
          />
        </div>

        <LabeledField
          htmlFor={SEARCH_FIELD_ID}
          label="Поиск"
          style={{ width: SEARCH_FIELD_WIDTH, maxWidth: '100%' }}
        >
          <SearchInput value={filters.q} onCommit={(q) => onChange({ q })} />
        </LabeledField>

        <Button onClick={onReset} disabled={!hasActiveFilters}>
          Сбросить фильтры
        </Button>
      </div>

      {disableResolved ? (
        <Typography.Text type="secondary">
          Статус «{statusTitles.get('resolved') ?? 'Исправлена'}» недоступен: это первый прогон,
          сравнивать не с чем.
        </Typography.Text>
      ) : null}
    </div>
  )
}
