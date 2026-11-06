import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_UNIT_ID, PAGE_SIZE, useKkdParams } from './useKkdParams'

const mocks = vi.hoisted(() => ({
  defaultRunId: undefined as string | undefined,
}))

vi.mock('@/shared/api/hooks', () => ({
  useDefaultRun: () => ({ data: mocks.defaultRunId ? { id: mocks.defaultRunId } : undefined }),
}))

function setup(initialUrl = '/') {
  const wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  )
  return renderHook(
    () => ({
      kkd: useKkdParams(),
      search: new URLSearchParams(useLocation().search),
      navigationType: useNavigationType(),
    }),
    { wrapper },
  )
}

beforeEach(() => {
  mocks.defaultRunId = 'RUN-008'
})

describe('useKkdParams: чтение URL', () => {
  it('значения по умолчанию: unit B2B, первый completed прогон, страница 1, пустые фильтры', () => {
    const { result } = setup('/')
    const { kkd } = result.current

    expect(kkd.unitId).toBe(DEFAULT_UNIT_ID)
    expect(DEFAULT_UNIT_ID).toBe('B2B')
    expect(kkd.runId).toBe('RUN-008')
    expect(kkd.page).toBe(1)
    expect(kkd.issueId).toBeUndefined()
    expect(kkd.filters).toEqual({ ruleCodes: [], severities: [], deltaStatus: undefined, q: '' })
    expect(kkd.hasActiveFilters).toBe(false)
  })

  it('run не определён, пока список прогонов не загружен', () => {
    mocks.defaultRunId = undefined

    expect(setup('/').result.current.kkd.runId).toBeUndefined()
  })

  it('разбирает все параметры', () => {
    const { result } = setup(
      '/?unit=TX-NEW&run=RUN-003&rule=R-01,R-02&severity=critical,minor&status=resolved&q=%20foo%20&page=3&issue=ISS-1',
    )
    const { kkd } = result.current

    expect(kkd.unitId).toBe('TX-NEW')
    expect(kkd.runId).toBe('RUN-003')
    expect(kkd.filters.ruleCodes).toEqual(['R-01', 'R-02'])
    expect(kkd.filters.severities).toEqual(['critical', 'minor'])
    expect(kkd.filters.deltaStatus).toBe('resolved')
    expect(kkd.filters.q).toBe(' foo ')
    expect(kkd.page).toBe(3)
    expect(kkd.issueId).toBe('ISS-1')
    expect(kkd.hasActiveFilters).toBe(true)
  })

  it('явный run в URL важнее прогона по умолчанию', () => {
    expect(setup('/?run=RUN-002').result.current.kkd.runId).toBe('RUN-002')
  })

  it('отбрасывает неизвестные важности и пустые элементы CSV', () => {
    const { result } = setup('/?severity=critical,bogus,,major&rule=,R-01,')

    expect(result.current.kkd.filters.severities).toEqual(['critical', 'major'])
    expect(result.current.kkd.filters.ruleCodes).toEqual(['R-01'])
  })

  it('status — одно значение; неизвестное и CSV игнорируются', () => {
    expect(setup('/?status=bogus').result.current.kkd.filters.deltaStatus).toBeUndefined()
    expect(setup('/?status=new,resolved').result.current.kkd.filters.deltaStatus).toBeUndefined()
    expect(setup('/?status=new').result.current.kkd.filters.deltaStatus).toBe('new')
  })

  it.each(['0', '-2', 'abc', '2.5', ''])('некорректная страница «%s» → 1', (raw) => {
    expect(setup(`/?page=${raw}`).result.current.kkd.page).toBe(1)
  })

  it('размер страницы — 20', () => {
    expect(PAGE_SIZE).toBe(20)
  })

  it('hasActiveFilters: пробельный q — не фильтр', () => {
    expect(setup('/?q=%20%20').result.current.kkd.hasActiveFilters).toBe(false)
  })
})

describe('useKkdParams: сброс страницы и закрытие модалки', () => {
  it('смена подразделения сбрасывает page и issue, фильтры остаются', () => {
    const { result } = setup('/?unit=B2B&page=4&issue=ISS-1&severity=major&q=abc')

    act(() => result.current.kkd.setUnit('TX-NEW'))

    expect(result.current.search.get('unit')).toBe('TX-NEW')
    expect(result.current.search.has('page')).toBe(false)
    expect(result.current.search.has('issue')).toBe(false)
    expect(result.current.search.get('severity')).toBe('major')
    expect(result.current.search.get('q')).toBe('abc')
    expect(result.current.navigationType).toBe('PUSH')
  })

  it('смена прогона сбрасывает page и issue', () => {
    const { result } = setup('/?run=RUN-008&page=2&issue=ISS-1&rule=R-01')

    act(() => result.current.kkd.setRun('RUN-003'))

    expect(result.current.search.get('run')).toBe('RUN-003')
    expect(result.current.search.has('page')).toBe(false)
    expect(result.current.search.has('issue')).toBe(false)
    expect(result.current.search.get('rule')).toBe('R-01')
    expect(result.current.kkd.page).toBe(1)
    expect(result.current.kkd.issueId).toBeUndefined()
  })

  it('смена фильтров сбрасывает page, но не issue и не unit/run', () => {
    const { result } = setup('/?unit=TX-NEW&run=RUN-003&page=3')

    act(() => result.current.kkd.setFilters({ severities: ['critical', 'minor'] }))

    expect(result.current.search.get('severity')).toBe('critical,minor')
    expect(result.current.search.has('page')).toBe(false)
    expect(result.current.search.get('unit')).toBe('TX-NEW')
    expect(result.current.search.get('run')).toBe('RUN-003')
    expect(result.current.navigationType).toBe('PUSH')
  })

  it('setFilters пишет rule и status; пустые значения удаляют параметры', () => {
    const { result } = setup('/?rule=R-01&status=new')

    act(() => result.current.kkd.setFilters({ ruleCodes: ['R-02', 'R-03'], deltaStatus: 'resolved' }))
    expect(result.current.search.get('rule')).toBe('R-02,R-03')
    expect(result.current.search.get('status')).toBe('resolved')

    act(() => result.current.kkd.setFilters({ ruleCodes: [], deltaStatus: undefined }))
    expect(result.current.search.has('rule')).toBe(false)
    expect(result.current.search.has('status')).toBe(false)
  })

  it('setFilters без deltaStatus в патче не трогает status', () => {
    const { result } = setup('/?status=new')

    act(() => result.current.kkd.setFilters({ ruleCodes: ['R-01'] }))

    expect(result.current.search.get('status')).toBe('new')
  })

  it('q: значение обрезается, сбрасывает page и не создаёт записи в истории (replace)', () => {
    const { result } = setup('/?page=5')

    act(() => result.current.kkd.setFilters({ q: '  поиск  ' }))

    expect(result.current.search.get('q')).toBe('поиск')
    expect(result.current.search.has('page')).toBe(false)
    expect(result.current.navigationType).toBe('REPLACE')
  })

  it('пустой q удаляет параметр', () => {
    const { result } = setup('/?q=abc')

    act(() => result.current.kkd.setFilters({ q: '   ' }))

    expect(result.current.search.has('q')).toBe(false)
  })

  it('resetFilters убирает rule, severity, status, q и page, но оставляет unit/run/issue', () => {
    const { result } = setup(
      '/?unit=TX-NEW&run=RUN-003&rule=R-01&severity=major&status=new&q=x&page=2&issue=ISS-1',
    )

    act(() => result.current.kkd.resetFilters())

    expect([...result.current.search.keys()].toSorted()).toEqual(['issue', 'run', 'unit'])
    expect(result.current.kkd.hasActiveFilters).toBe(false)
  })
})

describe('useKkdParams: страница и модалка', () => {
  it('setPage: страница > 1 пишется в URL, страница 1 — удаляет параметр', () => {
    const { result } = setup('/')

    act(() => result.current.kkd.setPage(3))
    expect(result.current.search.get('page')).toBe('3')
    expect(result.current.kkd.page).toBe(3)

    act(() => result.current.kkd.setPage(1))
    expect(result.current.search.has('page')).toBe(false)
    expect(result.current.kkd.page).toBe(1)
  })

  it('setPage с replace не добавляет запись в историю', () => {
    const { result } = setup('/?page=9')

    act(() => result.current.kkd.setPage(1, { replace: true }))

    expect(result.current.navigationType).toBe('REPLACE')
  })

  it('openIssue добавляет issue через push; closeIssue возвращает назад по истории', () => {
    const { result } = setup('/?unit=B2B&page=2')

    act(() => result.current.kkd.openIssue('ISS-42'))
    expect(result.current.search.get('issue')).toBe('ISS-42')
    expect(result.current.kkd.issueId).toBe('ISS-42')
    expect(result.current.search.get('page')).toBe('2')
    expect(result.current.navigationType).toBe('PUSH')

    act(() => result.current.kkd.closeIssue())
    expect(result.current.search.has('issue')).toBe(false)
    expect(result.current.kkd.issueId).toBeUndefined()
    expect(result.current.search.get('page')).toBe('2')
    expect(result.current.navigationType).toBe('POP')
  })

  it('closeIssue по прямой ссылке убирает issue через replace, без возврата назад', () => {
    const { result } = setup('/?unit=B2B&page=2&issue=ISS-42')

    act(() => result.current.kkd.closeIssue())

    expect(result.current.search.has('issue')).toBe(false)
    expect(result.current.kkd.issueId).toBeUndefined()
    expect(result.current.search.get('page')).toBe('2')
    expect(result.current.navigationType).toBe('REPLACE')
  })
})
