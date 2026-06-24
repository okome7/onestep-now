import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  avatarOptions,
  customPhotoIconId,
  passwordPattern,
  signupCompleteStorageKey,
  signupDraftStorageKey,
  signupScreenStorageKey,
} from '../appConstants'
import {
  apiMessageToFieldErrors,
  createAvatarImageDataUrl,
  errorFieldClass,
  formatPasswordInput,
  getAvatarSrc,
  getCompleteAvatarSrc,
  getInitialCompleteProfile,
  getInitialForm,
  hasActiveAuthSession,
  hasErrors,
  isPasswordGuidanceError,
  saveCompleteProfile,
  saveSignupDraft,
  validateForm,
} from '../appHelpers'
import type { FieldErrors, SignupScreen } from '../appTypes'
import cameraIcon from '../assets/icons/camera.svg'
import passwordHideIcon from '../assets/icons/password_hide.svg'
import passwordShowIcon from '../assets/icons/password_show.svg'
import { SignupHeader } from '../sharedComponents'
import { checkSignupEmail, signup } from '../signupApi'
import type { SignupForm } from '../signupApi'

function getInitialScreen(): SignupScreen {
  const savedScreen = window.sessionStorage.getItem(signupScreenStorageKey)
  const savedCompleteProfile = window.localStorage.getItem(
    signupCompleteStorageKey,
  )

  if (savedScreen === 'complete' || savedScreen === 'icon') {
    return savedScreen
  }

  if (savedCompleteProfile && hasActiveAuthSession()) {
    return 'complete'
  }

  return 'signup'
}

export function SignupPage() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [screen, setScreen] = useState<SignupScreen>(getInitialScreen)
  const [form, setForm] = useState<SignupForm>(() =>
    getInitialForm(getInitialScreen()),
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedIconId, setSelectedIconId] = useState(avatarOptions[0].id)
  const [customPhotoUrl, setCustomPhotoUrl] = useState('')
  const [customPhotoDataUrl, setCustomPhotoDataUrl] = useState('')
  const [completedName, setCompletedName] = useState(
    () => getInitialCompleteProfile().name,
  )
  const [completedIconSrc, setCompletedIconSrc] = useState(() =>
    getCompleteAvatarSrc(getInitialCompleteProfile()),
  )
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] =
    useState(false)
  const showPasswordGuidanceError = isPasswordGuidanceError(
    fieldErrors.password,
  )
  const noticeText = message || error

  useEffect(() => {
    return () => {
      if (customPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(customPhotoUrl)
      }
    }
  }, [customPhotoUrl])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    const nextValue =
      name === 'password' || name === 'passwordConfirmation'
        ? formatPasswordInput(value)
        : value

    setForm((current) => {
      const nextForm = { ...current, [name]: nextValue }

      if (name === 'name' || name === 'email') {
        saveSignupDraft(nextForm)
      }

      return nextForm
    })
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    const nextErrors = validateForm(form)
    setFieldErrors(nextErrors)

    if (hasErrors(nextErrors)) {
      return
    }

    setIsSubmitting(true)

    try {
      await checkSignupEmail(form.email)
      saveSignupDraft(form, true)
      window.sessionStorage.setItem(signupScreenStorageKey, 'icon')
      window.localStorage.removeItem(signupCompleteStorageKey)
      setScreen('icon')
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : '登録に失敗しました。'
      const nextFieldErrors = apiMessageToFieldErrors(nextError)

      if (hasErrors(nextFieldErrors)) {
        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        return
      }

      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleIconSubmit() {
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      const selectedAvatar = avatarOptions.find(
        (avatar) => avatar.id === selectedIconId,
      )
      const isCustomPhotoSelected = selectedIconId === customPhotoIconId

      if (isCustomPhotoSelected && !customPhotoDataUrl) {
        throw new Error('写真をもう一度選択してください。')
      }

      const nextCompletedName = form.name.trim()
      const avatarKeyToSave = isCustomPhotoSelected
        ? customPhotoDataUrl
        : selectedIconId
      const createdUser = await signup({
        ...form,
        avatarKey: avatarKeyToSave,
      })
      const nextCompletedAvatarId = createdUser.avatar_key ?? avatarKeyToSave
      const nextCompletedIconSrc =
        getAvatarSrc(nextCompletedAvatarId) ??
        selectedAvatar?.src ??
        avatarOptions[0].src

      setCompletedName(nextCompletedName)
      setCompletedIconSrc(nextCompletedIconSrc)
      setFieldErrors({})
      window.sessionStorage.removeItem(signupDraftStorageKey)
      window.sessionStorage.setItem(signupScreenStorageKey, 'complete')
      saveCompleteProfile({
        id: createdUser.id,
        name: nextCompletedName,
        email: createdUser.email,
        avatarId: nextCompletedAvatarId,
      })
      setScreen('complete')
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : '登録に失敗しました。'
      const nextFieldErrors = apiMessageToFieldErrors(nextError)

      if (hasErrors(nextFieldErrors)) {
        setFieldErrors((current) => ({ ...current, ...nextFieldErrors }))
        window.sessionStorage.setItem(signupScreenStorageKey, 'signup')
        setScreen('signup')
        return
      }

      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (selectedFile) {
      try {
        const photoDataUrl = await createAvatarImageDataUrl(selectedFile)
        setCustomPhotoDataUrl(photoDataUrl)
        setCustomPhotoUrl(photoDataUrl)
        setSelectedIconId(customPhotoIconId)
        setMessage('')
        setError('')
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : '写真の読み込みに失敗しました。',
        )
      }
    }
  }

  function handleAvatarClick(avatarId: string) {
    if (avatarId !== customPhotoIconId || customPhotoUrl) {
      setSelectedIconId(avatarId)
      return
    }
  }

  function handleStart() {
    window.sessionStorage.removeItem(signupScreenStorageKey)
    window.location.href = '/home'
  }

  return (
    <main
      className={`signup-page ${screen === 'complete' ? 'complete-page' : ''}`}
    >
      {screen === 'complete' ? null : <SignupHeader title="新規登録" />}

      {screen === 'complete' ? (
        <section className="complete-content" aria-labelledby="complete-title">
          <h2 id="complete-title">登録が完了しました！</h2>
          <p className="complete-description">早速始めましょう！</p>

          <div className="complete-profile">
            <span className="sparkle sparkle-one" aria-hidden="true" />
            <span className="sparkle sparkle-two" aria-hidden="true" />
            <span className="sparkle sparkle-three" aria-hidden="true" />
            <span className="sparkle sparkle-four" aria-hidden="true" />
            <span className="sparkle sparkle-five" aria-hidden="true" />
            <span className="sparkle sparkle-six" aria-hidden="true" />
            <span className="celebration-dot dot-one" aria-hidden="true" />
            <span className="celebration-dot dot-two" aria-hidden="true" />
            <span className="celebration-dot dot-three" aria-hidden="true" />
            <img
              className="complete-avatar"
              src={completedIconSrc}
              alt=""
              aria-hidden="true"
            />
            <span className="complete-check" aria-hidden="true" />
            <p className="complete-name">{completedName}</p>
          </div>

          <button
            className="submit-button start-button"
            type="button"
            onClick={handleStart}
          >
            最初の一歩を始める
          </button>
        </section>
      ) : screen === 'icon' ? (
        <section className="icon-content" aria-labelledby="icon-title">
          <h2 id="icon-title">アイコンを選ぼう！</h2>
          <p className="icon-description">
            気に入ったアイコンを選んでください。
            <br />
            後からでも変更できます。
          </p>

          <div className="avatar-grid" role="radiogroup" aria-label="アイコン">
            {avatarOptions.map((avatar) => {
              const isCustomPhoto = avatar.id === customPhotoIconId
              const hasCustomPhoto = isCustomPhoto && customPhotoUrl
              const isCameraSlot = isCustomPhoto && !hasCustomPhoto

              return (
                <button
                  key={avatar.id}
                  className={`avatar-option ${
                    selectedIconId === avatar.id ? 'selected' : ''
                  } ${isCameraSlot ? 'photo-slot-empty' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={selectedIconId === avatar.id}
                  aria-label={isCameraSlot ? '写真未選択' : avatar.label}
                  disabled={isCameraSlot}
                  onClick={() => handleAvatarClick(avatar.id)}
                >
                  {hasCustomPhoto ? (
                    <img src={customPhotoUrl} alt="" aria-hidden="true" />
                  ) : (
                    !isCustomPhoto && (
                      <img src={avatar.src} alt="" aria-hidden="true" />
                    )
                  )}
                </button>
              )
            })}
          </div>

          <div className="icon-edit-action-list signup-photo-action-list">
            <button
              className="icon-edit-action icon-edit-camera-action"
              type="button"
              onClick={() => cameraInputRef.current?.click()}
            >
              <img
                className="icon-edit-action-icon icon-edit-action-icon-camera"
                src={cameraIcon}
                alt=""
                aria-hidden="true"
              />
              <span>カメラで撮影</span>
            </button>
            <button
              className="icon-edit-action"
              type="button"
              onClick={() => photoInputRef.current?.click()}
            >
              <span
                className="icon-edit-action-icon icon-edit-action-icon-folder folder-icon"
                aria-hidden="true"
              />
              <span>写真を選ぶ</span>
            </button>
          </div>

          <input
            ref={cameraInputRef}
            className="photo-input"
            type="file"
            accept="image/*"
            capture="user"
            aria-label="撮影する写真"
            onChange={handlePhotoChange}
          />
          <input
            ref={photoInputRef}
            className="photo-input"
            type="file"
            accept="image/*"
            aria-label="選択する写真"
            onChange={handlePhotoChange}
          />

          <button
            className="submit-button icon-submit-button"
            type="button"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            onClick={handleIconSubmit}
          >
            決定
          </button>

          <p
            className={`notice ${message ? 'success' : ''} ${error ? 'error' : ''}`}
            role={error ? 'alert' : undefined}
            aria-live="polite"
          >
            {noticeText}
          </p>
        </section>
      ) : (
        <section className="signup-content">
          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            <div className="form-fields">
              <div className="form-field">
                <label htmlFor="name">表示名</label>
                <input
                  id="name"
                  className={errorFieldClass(fieldErrors.name)}
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="表示名を入力"
                  value={form.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={
                    fieldErrors.name ? 'name-error' : 'name-description'
                  }
                  required
                />
                <p id="name-description" className="field-note">
                  ※他のユーザーに公開される名前です
                </p>
                {fieldErrors.name && (
                  <p
                    id="name-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="email">メールアドレス</label>
                <input
                  id="email"
                  className={errorFieldClass(fieldErrors.email)}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="メールアドレスを入力"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? 'email-error' : undefined
                  }
                  required
                />
                {fieldErrors.email && (
                  <p
                    id="email-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="password">パスワード</label>
                <div
                  className={`password-field ${errorFieldClass(fieldErrors.password) ?? ''}`}
                >
                  <input
                    id="password"
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    inputMode="text"
                    placeholder="パスワードを入力"
                    pattern={passwordPattern}
                    title="8文字以上で英字と数字を含めてください"
                    value={form.password}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={
                      fieldErrors.password && !showPasswordGuidanceError
                        ? 'password-error'
                        : 'password-description'
                    }
                    required
                  />
                  <button
                    className="visibility-button"
                    type="button"
                    aria-label={
                      isPasswordVisible
                        ? 'パスワードを非表示にする'
                        : 'パスワードを表示する'
                    }
                    aria-pressed={isPasswordVisible}
                    onClick={() => setIsPasswordVisible((current) => !current)}
                  >
                    <img
                      src={
                        isPasswordVisible ? passwordShowIcon : passwordHideIcon
                      }
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <p
                  id="password-description"
                  className={`field-note ${
                    showPasswordGuidanceError ? 'field-note-error' : ''
                  }`}
                >
                  ※8文字以上で英字と数字を含めてください
                </p>
                {fieldErrors.password && !showPasswordGuidanceError && (
                  <p
                    id="password-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="passwordConfirmation">パスワード確認</label>
                <div
                  className={`password-field ${
                    errorFieldClass(fieldErrors.passwordConfirmation) ?? ''
                  }`}
                >
                  <input
                    id="passwordConfirmation"
                    name="passwordConfirmation"
                    type={isPasswordConfirmationVisible ? 'text' : 'password'}
                    autoComplete="new-password"
                    inputMode="text"
                    placeholder="パスワードを再入力"
                    pattern={passwordPattern}
                    title="8文字以上で英字と数字を含めてください"
                    value={form.passwordConfirmation}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.passwordConfirmation)}
                    aria-describedby={
                      fieldErrors.passwordConfirmation
                        ? 'password-confirmation-error'
                        : undefined
                    }
                    required
                  />
                  <button
                    className="visibility-button"
                    type="button"
                    aria-label={
                      isPasswordConfirmationVisible
                        ? 'パスワード確認を非表示にする'
                        : 'パスワード確認を表示する'
                    }
                    aria-pressed={isPasswordConfirmationVisible}
                    onClick={() =>
                      setIsPasswordConfirmationVisible((current) => !current)
                    }
                  >
                    <img
                      src={
                        isPasswordConfirmationVisible
                          ? passwordShowIcon
                          : passwordHideIcon
                      }
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                </div>
                {fieldErrors.passwordConfirmation && (
                  <p
                    id="password-confirmation-error"
                    className="field-error-message"
                    role="alert"
                  >
                    {fieldErrors.passwordConfirmation}
                  </p>
                )}
              </div>
            </div>

            <button
              className="submit-button"
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              登録
            </button>
          </form>

          <p
            className={`notice ${message ? 'success' : ''} ${error ? 'error' : ''}`}
            role={error ? 'alert' : undefined}
            aria-live="polite"
          >
            {noticeText}
          </p>

          <div className="login-link-area">
            <p>すでにアカウントをお持ちですか？</p>
            <a className="login-action-link" href="/login">
              ログイン
            </a>
          </div>
        </section>
      )}
    </main>
  )
}

