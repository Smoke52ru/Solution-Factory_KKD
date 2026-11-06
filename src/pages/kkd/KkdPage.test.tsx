import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIssues, getMeta, getRuns, getSummary } from '@/shared/api/endpoints'
import {
  META,
  NULL_COUNTERS,
  makeIssue,
  makeIssues,
  makeMetric,
  makeRun,
  makeSummary,
} from '@/test/fixtures'
import { KkdPage } from './KkdPage'

vi.mock('@/shared/api/endpoints', () => ({
  getMeta: vi.fn(),
  getRuns: vi.fn(),
  getSummary: vi.fn(),
  getIssues: vi.fn(),
  getIssue: vi.fn(),
}))

const FIRST_RUN = makeRun({
  id: 'RUN-001',
  number: 1,
  snapshot_date: '2026-09-07',
  compared_to_run_id: null,
})
const FAILED_RUN = makeRun({
  id: 'RUN-006',
  number: 6,
  status: 'failed',
  error: 'Источник данных недоступен',
  compared_to_run_id: 'RUN-005',
  finished_at: null,
})

function renderPage(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <KkdPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function mockRuns(...runs: ReturnType<typeof makeRun>[]) {
  vi.mocked(getRuns).mockResolvedValue({
    items: runs,
    total: runs.length,
    limit: 100,
    offset: 0,
  })
}

beforeEach(() => {
  vi.mocked(getMeta).mockResolvedValue(META)
})

describe('KkdPage: первый прогон (RUN-001)', () => {
  beforeEach(() => {
    mockRuns(FIRST_RUN)
    vi.mocked(getSummary).mockResolvedValue(
      makeSummary({
        run: FIRST_RUN,
        compared_to: null,
        metrics: [
          makeMetric('clean_goals_share', {
            title: 'Доля корректных целей',
            value: 62.5,
            previous: null,
            delta: null,
            delta_pct: null,
            trend: null,
          }),
          makeMetric('goals_active', {
            title: 'Активных целей',
            unit: 'шт.',
            value: 40,
            previous: null,
            delta: null,
            delta_pct: null,
            trend: null,
          }),
        ],
        issues_by_severity: [
          { code: 'critical', title: 'Критичная', current: 4, previous: null, delta: null },
        ],
        issues_by_rule: [
          {
            code: 'R-01',
            title: 'Цель без владельца',
            severity: 'critical',
            object_type: 'goal',
            current: 4,
            previous: null,
            delta: null,
          },
        ],
        delta: NULL_COUNTERS,
      }),
    )
    vi.mocked(getIssues).mockResolvedValue(makeIssues([makeIssue()]))
  })

  it('счётчики заменены пояснением и не кликабельны, вместо дельты — «нет данных для сравнения»', async () => {
    renderPage('/')

    expect(await screen.findByText(/Первый прогон: статусы/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^(Новые|Сохраняются|Исправлены):/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Изменения проблем/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Стало лучше')).not.toBeInTheDocument()
    expect(screen.queryByText('Стало хуже')).not.toBeInTheDocument()

    expect((await screen.findAllByText('нет данных для сравнения')).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Первый прогон — сравнивать не с чем')).toBeInTheDocument()
    expect(screen.queryByText(/было /)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Не изменилось|Выросло|Снизилось/ })).not.toBeInTheDocument()
  })

  it('в разбивке «что исправлять» дельта нейтральна, строки правил — кнопки', async () => {
    renderPage('/')

    const rule = await screen.findByRole('button', {
      name: 'Показать в таблице: Цель без владельца, проблем 4',
    })
    expect(within(rule).getByText('нет данных для сравнения')).toBeInTheDocument()
  })

  it('статус «Исправлена» в фильтрах недоступен, дан пояснительный текст', async () => {
    renderPage('/')

    expect(await screen.findByText(/это первый прогон/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Исправлена' })).toBeDisabled()
  })

  it('запросы идут с явным id прогона и подразделением по умолчанию', async () => {
    renderPage('/')

    await screen.findByText(/Первый прогон: статусы/)
    expect(getSummary).toHaveBeenCalledWith(
      { runId: 'RUN-001', unitId: 'B2B' },
      expect.anything(),
    )
  })
})

describe('KkdPage: подразделение без целей (TX-NEW)', () => {
  beforeEach(() => {
    mockRuns(makeRun())
    vi.mocked(getSummary).mockResolvedValue(
      makeSummary({
        unit: {
          id: 'TX-NEW',
          name: 'Новый отдел',
          level: 'unit',
          parent_id: 'B2B',
          path: [
            { id: 'B2B', name: 'Блок B2B' },
            { id: 'TX-NEW', name: 'Новый отдел' },
          ],
        },
        metrics: [
          makeMetric('clean_goals_share', {
            title: 'Доля корректных целей',
            value: null,
            previous: null,
            delta: null,
            delta_pct: null,
            trend: null,
          }),
          makeMetric('goals_active', {
            title: 'Активных целей',
            unit: 'шт.',
            value: 0,
            previous: 0,
            delta: 0,
            delta_pct: null,
            trend: 'same',
          }),
        ],
        delta: { new: 0, persisting: 0, resolved: 0 },
      }),
    )
    vi.mocked(getIssues).mockResolvedValue(makeIssues([]))
  })

  it('показывает Empty «нет целей», нули как есть и нейтральное пустое состояние таблицы', async () => {
    renderPage('/?unit=TX-NEW')

    expect(
      await screen.findByText('В подразделении пока нет целей — проверять нечего'),
    ).toBeInTheDocument()
    expect(screen.getByText('Активных целей')).toBeInTheDocument()
    expect(screen.getAllByText('0 шт.').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Что исправлять в первую очередь')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^(Новые|Сохраняются|Исправлены):/ })).not.toBeInTheDocument()

    expect(await screen.findByText('В подразделении пока нет целей')).toBeInTheDocument()
    expect(screen.queryByText('Проблем не найдено')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сбросить фильтры' })).toBeDisabled()
  })
})


describe('KkdPage: неуспешный прогон (RUN-006)', () => {
  beforeEach(() => {
    mockRuns(makeRun(), FAILED_RUN)
  })

  it('не запрашивает сводку и проблемы, показывает причину и кнопку к последнему успешному', async () => {
    renderPage('/?run=RUN-006')

    expect(await screen.findByText(/Прогон RUN-006 от 26\.10\.2026 завершился с ошибкой/)).toBeInTheDocument()
    expect(screen.getByText('Источник данных недоступен')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Открыть последний успешный прогон' }),
    ).toBeInTheDocument()
    expect(getSummary).not.toHaveBeenCalled()
    expect(getIssues).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Сводка' })).not.toBeInTheDocument()
  })

  it('выполняющийся прогон: сообщение без запросов данных', async () => {
    mockRuns(makeRun(), makeRun({ id: 'RUN-009', number: 9, status: 'running', finished_at: null }))
    renderPage('/?run=RUN-009')

    expect(await screen.findByText('Прогон RUN-009 ещё выполняется')).toBeInTheDocument()
    expect(getSummary).not.toHaveBeenCalled()
    expect(getIssues).not.toHaveBeenCalled()
  })
})
