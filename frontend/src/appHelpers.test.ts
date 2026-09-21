import { describe, expect, it } from 'vitest'
import { formatElapsedTime, formatFeedPostAge } from './appHelpers'

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

describe('formatFeedPostAge', () => {
  const createdAt = new Date('2026-08-01T00:00:00Z').getTime()

  it.each([
    [0, '0分前'],
    [1, '0分前'],
    [59, '0分前'],
    [60, '1分前'],
  ])('%s秒経過時に%sと表示する', (elapsedSeconds, expected) => {
    expect(formatFeedPostAge(createdAt, createdAt + elapsedSeconds * 1000)).toBe(
      expected,
    )
  })

  it('端末時刻が投稿時刻より前でも負の分数を表示しない', () => {
    expect(formatFeedPostAge(createdAt, createdAt - 1000)).toBe('0分前')
  })
})
