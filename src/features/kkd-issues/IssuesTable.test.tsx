import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { makeIssue, makeIssues } from '@/test/fixtures'
import { IssuesTable } from './IssuesTable'

type Props = Parameters<typeof IssuesTable>[0]

function renderTable(overrides: Partial<Props> = {}) {
  const handlers = {
    onRetry: vi.fn(),
    onPageChange: vi.fn(),
    onOpenIssue: vi.fn(),
    onResetFilters: vi.fn(),
  }
  const props: Props = {
    data: makeIssues([]),
    isPending: false,
    isFetching: false,
    error: null,
    hasActiveFilters: false,
    page: 1,
    pageSize: 20,
    ...handlers,
    ...overrides,
  }
  render(<IssuesTable {...props} />)
  return handlers
}

describe('IssuesTable: пустые состояния', () => {
  it('пустой фильтр: Empty с текстом и кнопкой «Сбросить фильтры»', async () => {
    const { onResetFilters } = renderTable({ hasActiveFilters: true })

    expect(screen.getByText('По выбранным фильтрам проблем не найдено')).toBeInTheDocument()
    expect(screen.queryByText('Проблем не найдено')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))
    expect(onResetFilters).toHaveBeenCalledTimes(1)
  })

  it('нет проблем и нет фильтров: позитивное состояние без кнопки сброса', () => {
    renderTable({ hasActiveFilters: false })

    expect(screen.getByText('Проблем не найдено')).toBeInTheDocument()
    expect(screen.queryByText(/По выбранным фильтрам/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сбросить фильтры' })).not.toBeInTheDocument()
  })

  it('нет целей: нейтральный Empty без зелёной галочки', () => {
    renderTable({ noGoals: true })

    expect(screen.getByText('В подразделении пока нет целей')).toBeInTheDocument()
    expect(screen.queryByText('Проблем не найдено')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сбросить фильтры' })).not.toBeInTheDocument()
  })
})


describe('IssuesTable: данные, загрузка, ошибка', () => {
  it('показывает строки и открывает карточку по клику и по Enter', async () => {
    const issue = makeIssue({ id: 'ISS-7', rule_title: 'Цель без владельца' })
    const { onOpenIssue } = renderTable({ data: makeIssues([issue]) })

    const row = screen.getByRole('row', { name: 'Открыть карточку проблемы: Цель без владельца' })
    expect(row).toHaveTextContent('Не назначен')
    expect(row).toHaveTextContent('1 прогон')

    await userEvent.click(row)
    expect(onOpenIssue).toHaveBeenLastCalledWith('ISS-7')

    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(onOpenIssue).toHaveBeenCalledTimes(2)
  })

  it('у исправленной проблемы «подряд» — прочерк', () => {
    const resolved = makeIssue({ delta_status: 'resolved', runs_in_row: null })
    renderTable({ data: makeIssues([resolved]) })

    expect(screen.getByText('Исправлена')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Открыть карточку/ })).toHaveTextContent('—')
  })

  it('пока данных нет, показывается скелетон, а не пустое состояние', () => {
    renderTable({ data: undefined, isPending: true })

    expect(screen.queryByText('Проблем не найдено')).not.toBeInTheDocument()
    expect(document.querySelector('[aria-busy]')).toBeInTheDocument()
  })

  it('ошибка 5xx: ErrorState с кнопкой «Повторить»', async () => {
    const { onRetry } = renderTable({ data: undefined, error: new ApiError('UNKNOWN_ERROR', 'Упало', 503) })

    expect(screen.getByText('Сервер временно недоступен')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Повторить/ }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('ошибка 4xx: без кнопки «Повторить»', () => {
    renderTable({ data: undefined, error: new ApiError('INVALID_PARAM', 'Плохой параметр', 400) })

    expect(screen.getByText('Не удалось загрузить данные')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Повторить/ })).not.toBeInTheDocument()
  })
})
