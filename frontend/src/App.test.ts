import { expect, test } from 'vitest'
import App, { loadingScreenDelayMs } from './App'

test('App component is available for rendering', () => {
  expect(App).toBeTypeOf('function')
})

test('初期読み込み画面の表示開始時間を定数で管理する', () => {
  expect(loadingScreenDelayMs).toBe(300)
})
