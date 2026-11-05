import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatDelta,
  formatDeltaPct,
  formatNumber,
  formatValue,
} from './format'

const NBSP = '\u00A0'
const MINUS = '\u2212'

describe('formatNumber', () => {
  it('группирует разряды и использует запятую', () => {
    expect(formatNumber(1234.5)).toBe(`1${NBSP}234,5`)
  })

  it('округляет до двух знаков только при показе', () => {
    expect(formatNumber(1.236)).toBe('1,24')
  })

  it('null и undefined — прочерк, а не ноль', () => {
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
  })

  it('ноль остаётся нулём', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatValue', () => {
  it('процент и штуки', () => {
    expect(formatValue(87.5, '%')).toBe(`87,5${NBSP}%`)
    expect(formatValue(12, 'шт.')).toBe(`12${NBSP}шт.`)
  })

  it('null — прочерк без единицы', () => {
    expect(formatValue(null, '%')).toBe('—')
  })
})

describe('formatDelta', () => {
  it('положительная дельта со знаком плюс; для процентов — п.п.', () => {
    expect(formatDelta(4.3, '%')).toBe(`+4,3${NBSP}п.п.`)
    expect(formatDelta(3, 'шт.')).toBe(`+3${NBSP}шт.`)
  })

  it('отрицательная дельта с настоящим минусом', () => {
    expect(formatDelta(-2, 'шт.')).toBe(`${MINUS}2${NBSP}шт.`)
  })

  it('нулевая дельта без знака', () => {
    expect(formatDelta(0, 'шт.')).toBe(`0${NBSP}шт.`)
  })

  it('null — прочерк', () => {
    expect(formatDelta(null, 'шт.')).toBe('—')
    expect(formatDelta(undefined, '%')).toBe('—')
  })
})

describe('formatDeltaPct', () => {
  it('знак и пробел перед процентом', () => {
    expect(formatDeltaPct(12.5)).toBe(`+12,5${NBSP}%`)
    expect(formatDeltaPct(-3)).toBe(`${MINUS}3${NBSP}%`)
    expect(formatDeltaPct(0)).toBe(`0${NBSP}%`)
  })

  it('null — прочерк', () => {
    expect(formatDeltaPct(null)).toBe('—')
  })
})

describe('formatDate', () => {
  it('ISO-дата без сдвига часового пояса', () => {
    expect(formatDate('2026-10-26')).toBe('26.10.2026')
    expect(formatDate('2026-01-01')).toBe('01.01.2026')
  })

  it('пусто — прочерк', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('содержит дату и время', () => {
    expect(formatDateTime('2026-10-26T06:14:00')).toBe('26.10.2026, 06:14')
  })

  it('пусто — прочерк', () => {
    expect(formatDateTime(null)).toBe('—')
  })
})
