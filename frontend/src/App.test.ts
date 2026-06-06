import { expect, test } from 'vitest'
import App from './App'

test('App component is available for rendering', () => {
  expect(App).toBeTypeOf('function')
})
