import { TreeSelect } from 'antd'
import type { TreeSelectProps } from 'antd'
import { useMemo } from 'react'
import { useMeta } from '@/shared/api/hooks'
import type { MetaUnit } from '@/shared/api/types'

type TreeNode = NonNullable<TreeSelectProps['treeData']>[number]

interface UnitTreeSelectProps {
  id: string
  value: string
  onChange: (unitId: string) => void
}

/** Строит дерево из плоского списка по `parent_id`; порядок — как в ответе API. */
function buildUnitTree(units: readonly MetaUnit[]): TreeNode[] {
  const childrenByParent = new Map<string | null, MetaUnit[]>()
  for (const unit of units) {
    const siblings = childrenByParent.get(unit.parent_id) ?? []
    siblings.push(unit)
    childrenByParent.set(unit.parent_id, siblings)
  }

  const toNodes = (parentId: string | null): TreeNode[] =>
    (childrenByParent.get(parentId) ?? []).map((unit) => ({
      value: unit.id,
      title: unit.name,
      children: toNodes(unit.id),
    }))

  return toNodes(null)
}

export function UnitTreeSelect({ id, value, onChange }: UnitTreeSelectProps) {
  const meta = useMeta()
  const treeData = useMemo(() => buildUnitTree(meta.data?.units ?? []), [meta.data])

  return (
    <TreeSelect
      id={id}
      value={value}
      treeData={treeData}
      loading={meta.isPending}
      status={meta.isError ? 'error' : undefined}
      treeDefaultExpandAll
      showSearch
      treeNodeFilterProp="title"
      placeholder="Выберите подразделение"
      notFoundContent="Подразделение не найдено"
      popupMatchSelectWidth={false}
      style={{ width: '100%' }}
      onChange={onChange}
    />
  )
}
