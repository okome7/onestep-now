import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  avatarOptions,
  customPhotoIconId,
  signupCompleteStorageKey,
  signupDraftStorageKey,
  signupScreenStorageKey,
} from '../appConstants'
import {
  apiMessageToFieldErrors,
  createAvatarImageDataUrl,
  formatPasswordInput,
  getAvatarSrc,
  getCompleteAvatarSrc,
  getInitialCompleteProfile,
  getInitialForm,
  hasErrors,
  saveCompleteProfile,
  saveSignupDraft,
  validateForm,
} from '../appHelpers'
import type { FieldErrors, SignupScreen } from '../appTypes'
import {
  IconSelectionStep,
  SignupCompleteStep,
  SignupFormStep,
} from '../components/signup'
import { SignupHeader } from '../sharedComponents'
import { checkSignupEmail, signup } from '../signupApi'
import type { SignupForm } from '../signupApi'

function getInitialScreen(): SignupScreen {
  const savedScreen = window.sessionStorage.getItem(signupScreenStorageKey)

  if (savedScreen === 'icon') {
    return savedScreen
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
        <SignupCompleteStep
          completedName={completedName}
          completedIconSrc={completedIconSrc}
          onStart={handleStart}
        />
      ) : screen === 'icon' ? (
        <IconSelectionStep
          cameraInputRef={cameraInputRef}
          photoInputRef={photoInputRef}
          selectedIconId={selectedIconId}
          customPhotoUrl={customPhotoUrl}
          isSubmitting={isSubmitting}
          message={message}
          error={error}
          onAvatarClick={handleAvatarClick}
          onPhotoChange={handlePhotoChange}
          onSubmit={handleIconSubmit}
        />
      ) : (
        <SignupFormStep
          form={form}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          message={message}
          error={error}
          isPasswordVisible={isPasswordVisible}
          isPasswordConfirmationVisible={isPasswordConfirmationVisible}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onTogglePassword={() =>
            setIsPasswordVisible((current) => !current)
          }
          onTogglePasswordConfirmation={() =>
            setIsPasswordConfirmationVisible((current) => !current)
          }
        />
      )}
    </main>
  )
}