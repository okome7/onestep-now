import { expect, test, vi } from 'vitest'
import { signup } from './signupApi'

test('signup posts Rails-compatible user params', async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      status: 'success',
      data: { id: 1, name: 'Test User', email: 'test@example.com' },
    }),
  })

  const response = await signup(
    {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password',
      passwordConfirmation: 'password',
    },
    fetcher,
  )

  expect(fetcher).toHaveBeenCalledWith(
    'http://localhost:3000/signup',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        user: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password',
          password_confirmation: 'password',
        },
      }),
    }),
  )
  expect(response.status).toBe('success')
})

test('signup returns validation errors from the API', async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({
      status: 'error',
      errors: ["Email can't be blank"],
    }),
  })

  const response = await signup(
    {
      name: '',
      email: '',
      password: 'password',
      passwordConfirmation: 'password',
    },
    fetcher,
  )

  expect(response).toEqual({
    status: 'error',
    errors: ["Email can't be blank"],
  })
})
