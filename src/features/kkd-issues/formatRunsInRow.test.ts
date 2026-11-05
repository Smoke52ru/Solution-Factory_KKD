import { describe, expect, it } from 'vitest'
import { formatRunsInRow } from './formatRunsInRow'

describe('formatRunsInRow', () => {
  it('склоняет «прогон»', () => {
    expect(formatRunsInRow(1)).toBe('1 прогон')
    expect(formatRunsInRow(2)).toBe('2 прогона')
    expect(formatRunsInRow(5)).toBe('5 прогонов')
    expect(formatRunsInRow(11)).toBe('11 прогонов')
    expect(formatRunsInRow(21)).toBe('21 прогон')
  })

  it('null (исправленная проблема) — прочерк', () => {
    expect(formatRunsInRow(null)).toBe('—')
  })
})
