import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ServerStartingScreen } from './ServerStartingScreen'

describe('ServerStartingScreen', () => {
  it('サーバー起動中の案内を表示する', () => {
    const markup = renderToStaticMarkup(<ServerStartingScreen />)

    expect(markup).toContain('OneStep Now')
    expect(markup).toContain('サーバーを起動しています')
    expect(markup).toContain(
      'はじめてのアクセスのため、少し時間がかかることがあります。',
    )
    expect(markup).toContain('しばらくお待ちください…')
    expect(markup).toContain('role="progressbar"')
  })
})
