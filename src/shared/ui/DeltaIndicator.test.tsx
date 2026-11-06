import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeltaIndicator } from './DeltaIndicator'

const NO_COMPARISON = 'нет данных для сравнения'

describe('DeltaIndicator', () => {
  describe('нет сравнения', () => {
    it('previous = null: только «нет данных для сравнения», без нуля', () => {
      const { container } = render(
        <DeltaIndicator delta={null} previous={null} trend={null} unit="шт." />,
      )

      expect(screen.getByText(NO_COMPARISON)).toBeInTheDocument()
      expect(container).not.toHaveTextContent('0')
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('previous = null с delta = 0: ноль всё равно не показывается', () => {
      const { container } = render(
        <DeltaIndicator delta={0} previous={null} trend="same" unit="%" />,
      )

      expect(screen.getByText(NO_COMPARISON)).toBeInTheDocument()
      expect(container).not.toHaveTextContent('0')
    })

    it('delta = null при заданном previous: «нет данных для сравнения»', () => {
      render(<DeltaIndicator delta={null} previous={5} trend={null} unit="шт." />)

      expect(screen.getByText(NO_COMPARISON)).toBeInTheDocument()
    })
  })

  describe('оценка по trend', () => {
    it('better при росте: стрелка вверх, +значение, «лучше»', () => {
      const { container } = render(
        <DeltaIndicator delta={4.3} previous={70} deltaPct={6.1} trend="better" unit="%" />,
      )

      const indicator = screen.getByRole('img', { name: /Выросло на 4,3.п\.п\. — лучше/ })
      expect(indicator).toHaveTextContent('+4,3')
      expect(indicator).toHaveTextContent('п.п.')
      expect(indicator).toHaveTextContent('(+6,1 %)')
      expect(indicator).toHaveTextContent('лучше')
      expect(container.querySelector('.anticon-arrow-up')).toBeInTheDocument()
    })

    it('worse при росте числа проблем: стрелка вверх, но «хуже»', () => {
      const { container } = render(
        <DeltaIndicator delta={3} previous={10} trend="worse" unit="шт." />,
      )

      const indicator = screen.getByRole('img', { name: /Выросло на 3.шт\. — хуже/ })
      expect(indicator).toHaveTextContent('хуже')
      expect(container.querySelector('.anticon-arrow-up')).toBeInTheDocument()
      expect(container.querySelector('.anticon-arrow-down')).not.toBeInTheDocument()
    })

    it('worse при снижении: стрелка вниз, знак минус, «хуже»', () => {
      const { container } = render(
        <DeltaIndicator delta={-4.3} previous={80} trend="worse" unit="%" />,
      )

      const indicator = screen.getByRole('img', { name: /Снизилось на 4,3.п\.п\. — хуже/ })
      expect(indicator).toHaveTextContent('\u22124,3')
      expect(container.querySelector('.anticon-arrow-down')).toBeInTheDocument()
    })

    it('better при снижении числа проблем: стрелка вниз, «лучше»', () => {
      const { container } = render(
        <DeltaIndicator delta={-2} previous={9} trend="better" unit="шт." />,
      )

      expect(screen.getByRole('img', { name: /Снизилось на 2.шт\. — лучше/ })).toBeInTheDocument()
      expect(container.querySelector('.anticon-arrow-down')).toBeInTheDocument()
    })

    it('same при delta = 0: нейтральное «без изменений» без иконки минуса', () => {
      const { container } = render(
        <DeltaIndicator delta={0} previous={7} trend="same" unit="шт." comparedToId="RUN-007" />,
      )

      const indicator = screen.getByRole('img', { name: 'Не изменилось относительно RUN-007' })
      expect(indicator).toHaveTextContent('без изменений')
      expect(indicator).not.toHaveTextContent('0')
      expect(container.querySelector('.anticon-minus')).not.toBeInTheDocument()
      expect(container.querySelector('.anticon-arrow-up')).not.toBeInTheDocument()
      expect(container.querySelector('.anticon-arrow-down')).not.toBeInTheDocument()
    })

    it('trend = null при delta = 0: тоже нейтральное «без изменений»', () => {
      render(<DeltaIndicator delta={0} previous={3} trend={null} unit="шт." />)

      expect(screen.getByRole('img', { name: 'Не изменилось' })).toHaveTextContent('без изменений')
    })
  })

  describe('trend = null при наличии delta', () => {
    it('стрелка и число по знаку, без слова оценки', () => {
      const { container } = render(
        <DeltaIndicator delta={2} previous={5} trend={null} unit="шт." />,
      )

      const indicator = screen.getByRole('img', { name: /^Выросло на 2.шт\.$/ })
      expect(indicator).toHaveTextContent('+2')
      expect(indicator).not.toHaveTextContent(/лучше|хуже|без изменений/)
      expect(container.querySelector('.anticon-arrow-up')).toBeInTheDocument()
    })

    it('отрицательная дельта: стрелка вниз, без оценки', () => {
      const { container } = render(
        <DeltaIndicator delta={-1} previous={5} trend={null} unit="шт." />,
      )

      expect(screen.getByRole('img', { name: /^Снизилось на 1.шт\.$/ })).toBeInTheDocument()
      expect(container.querySelector('.anticon-arrow-down')).toBeInTheDocument()
    })
  })

  describe('aria-label и процент', () => {
    it('содержит полную фразу с прогоном сравнения', () => {
      render(
        <DeltaIndicator
          delta={-4.3}
          previous={80}
          trend="worse"
          unit="%"
          comparedToId="RUN-007"
        />,
      )

      expect(
        screen.getByRole('img', {
          name: 'Снизилось на 4,3\u00A0п.п. относительно RUN-007 — хуже',
        }),
      ).toBeInTheDocument()
    })

    it('без comparedToId фраза не содержит «относительно»', () => {
      render(<DeltaIndicator delta={1} previous={1} trend="better" unit="шт." />)

      expect(screen.getByRole('img').getAttribute('aria-label')).not.toContain('относительно')
    })

    it('delta_pct = null: процент скрыт', () => {
      render(<DeltaIndicator delta={5} previous={0} deltaPct={null} trend="better" unit="шт." />)

      expect(screen.getByRole('img')).not.toHaveTextContent('(')
    })

    it('delta_pct отсутствует: процент скрыт', () => {
      render(<DeltaIndicator delta={5} previous={1} trend="better" unit="шт." />)

      expect(screen.getByRole('img')).not.toHaveTextContent('(')
    })
  })

  describe('showTrendLabel = false', () => {
    it('скрывает слово оценки на экране, но aria-label остаётся полным', () => {
      render(
        <DeltaIndicator
          delta={-4.3}
          previous={80}
          trend="worse"
          unit="%"
          comparedToId="RUN-007"
          showTrendLabel={false}
        />,
      )

      const indicator = screen.getByRole('img', {
        name: 'Снизилось на 4,3\u00A0п.п. относительно RUN-007 — хуже',
      })
      expect(indicator).toHaveTextContent('\u22124,3')
      expect(indicator).not.toHaveTextContent('хуже')
    })
  })
})
