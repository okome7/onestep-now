import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LoadingScreen } from './LoadingScreen'

describe('LoadingScreen', () => {
  it('通常の初期読み込み画面を表示する', () => {
    const markup = renderToStaticMarkup(<LoadingScreen />)

    expect(markup).not.toContain('OneStep Now')
    expect(markup).toContain('読み込んでいます…')
    expect(markup).toContain('aria-busy="true"')
  })
})
