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
      <div className="home-task-input-wrap">
        <svg
          className="home-task-input-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Z" />
          <path d="m14.5 6.3 3.2 3.2" />
        </svg>
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
      </div>
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
        <span>始める</span>
        <span className="home-start-button-arrow" aria-hidden="true">
          →
        </span>
      </button>
    </form>
  )
}
