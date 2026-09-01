import { describe, expect, it } from 'vitest'
import { formatElapsedTime } from './appHelpers'

describe('formatElapsedTime', () => {
  it.each([
    [5 * 60 + 7, '05:07'],
    [59 * 60 + 59, '59:59'],
  ])('1時間未満の%s秒をMM:SSで表示する', (totalSeconds, expected) => {
    expect(formatElapsedTime(totalSeconds)).toBe(expected)
  })

  it.each([
    [60 * 60, '01:00:00'],
    [60 * 60 + 5 * 60 + 7, '01:05:07'],
  ])('1時間以上の%s秒をHH:MM:SSで表示する', (totalSeconds, expected) => {
    expect(formatElapsedTime(totalSeconds)).toBe(expected)
  })

  it('24時間を超えても時間を累積表示する', () => {
    expect(formatElapsedTime(71 * 60 * 60 + 56 * 60 + 57)).toBe('71:56:57')
    expect(formatElapsedTime(72 * 60 * 60 + 6 * 60 + 11)).toBe('72:06:11')
  })
})
