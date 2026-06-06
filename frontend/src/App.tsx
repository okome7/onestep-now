import { type FormEvent, useState } from 'react'
import './App.css'
import { signup, type SignupSuccessResponse } from './signupApi'

type FormState = {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}

const initialFormState: FormState = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

function App() {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<SignupSuccessResponse['data'] | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setSuccess(null)
    setErrors([])

    try {
      const response = await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
      })

      if (response.status === 'success') {
        setSuccess(response.data)
        setForm(initialFormState)
      } else {
        setErrors(response.errors)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ユーザー登録に失敗しました。'
      setErrors([message])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-intro" aria-labelledby="signup-title">
        <p className="eyebrow">OneStep Now</p>
        <h1 id="signup-title">まず1歩を登録する</h1>
        <p className="lead">
          アカウントを作成して、今日の最初の行動をすぐ始めましょう。
        </p>
      </section>

      <section className="signup-panel" aria-label="ユーザー登録">
        <form className="signup-form" onSubmit={handleSubmit}>
          <label>
            名前
            <input
              autoComplete="name"
              name="name"
              onChange={(event) => updateField('name', event.target.value)}
              required
              type="text"
              value={form.name}
            />
          </label>

          <label>
            メールアドレス
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => updateField('email', event.target.value)}
              required
              type="email"
              value={form.email}
            />
          </label>

          <label>
            パスワード
            <input
              autoComplete="new-password"
              name="password"
              onChange={(event) => updateField('password', event.target.value)}
              required
              type="password"
              value={form.password}
            />
          </label>

          <label>
            パスワード確認
            <input
              autoComplete="new-password"
              name="passwordConfirmation"
              onChange={(event) =>
                updateField('passwordConfirmation', event.target.value)
              }
              required
              type="password"
              value={form.passwordConfirmation}
            />
          </label>

          <button className="primary-action" disabled={isSubmitting} type="submit">
            {isSubmitting ? '登録中' : '登録する'}
          </button>
        </form>

        {success ? (
          <div className="notice success" role="status">
            <strong>{success.name}</strong> さんを登録しました。
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="notice error" role="alert">
            <strong>登録できませんでした</strong>
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default App
