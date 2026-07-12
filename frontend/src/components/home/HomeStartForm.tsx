import type { ChangeEvent } from 'react'

type HomeStartFormProps = {
  taskText: string
  taskError: string
  isSubmitting: boolean
  onTaskTextChange: (value: string) => void
  onStart: () => void
}

export function HomeStartForm({
  taskText,
  taskError,
  isSubmitting,
  onTaskTextChange,
  onStart,
}: HomeStartFormProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onTaskTextChange(event.target.value)
  }

  return (
    <form
      className="home-start"
      aria-labelledby="home-start-title"
      onSubmit={(event) => event.preventDefault()}
    >
      <h2 id="home-start-title">今できることから</h2>
      <input
        className={`home-task-input ${taskError ? 'has-error' : ''}`}
        type="text"
        aria-label="今できること"
        aria-invalid={taskError ? 'true' : undefined}
        aria-describedby={taskError ? 'home-task-error' : undefined}
        placeholder="やることを入力"
        value={taskText}
        onChange={handleChange}
      />
      {taskError ? (
        <p className="home-task-error" id="home-task-error" role="alert">
          {taskError}
        </p>
      ) : null}
      <button
        className="home-start-button"
        type="button"
        disabled={isSubmitting}
        onClick={onStart}
      >
        始める
      </button>
    </form>
  )
}
