import { describe, expect, it } from 'vitest'

import { calculateFeedRemainingSeconds } from './useFeedTimer'

describe('calculateFeedRemainingSeconds', () => {
  const measuredAt = 10_000

  it('APIの残り時間と単調増加時間から残り時間を計算する', () => {
    expect(calculateFeedRemainingSeconds(180, measuredAt, measuredAt)).toBe(180)
    expect(
      calculateFeedRemainingSeconds(180, measuredAt, measuredAt + 60_000),
    ).toBe(120)
  })

  it('1秒未満を切り上げて開始直後の表示を不自然に減らさない', () => {
    expect(calculateFeedRemainingSeconds(180, measuredAt, measuredAt + 1)).toBe(
      180,
    )
  })

  it('intervalが間引かれても現在時刻から正しい残り時間を返す', () => {
    expect(
      calculateFeedRemainingSeconds(180, measuredAt, measuredAt + 149_500),
    ).toBe(31)
  })

  it('期限を超えた場合は0未満にしない', () => {
    expect(
      calculateFeedRemainingSeconds(180, measuredAt, measuredAt + 180_000),
    ).toBe(0)
    expect(
      calculateFeedRemainingSeconds(180, measuredAt, measuredAt + 240_000),
    ).toBe(0)
  })
})
