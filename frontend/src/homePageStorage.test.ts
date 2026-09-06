import { describe, expect, it } from 'vitest'
import {
  activeHomeViewStorageKey,
  getInitialHomeView,
  getInitialTaskDraft,
  getLastDisplayedLevelStorageKey,
  taskDraftStorageKey,
} from './homePageStorage'

describe('home page storage', () => {
  const storageWith = (values: Record<string, string>) => ({
    getItem: (key: string) => values[key] ?? null,
  })

  it('returns saved home view and task draft', () => {
    const storage = storageWith({
      [activeHomeViewStorageKey]: 'feed',
      [taskDraftStorageKey]: '次にやること',
    })

    expect(getInitialHomeView(storage)).toBe('feed')
    expect(getInitialTaskDraft(storage)).toBe('次にやること')
  })

  it('returns an empty draft when no draft is saved', () => {
    const emptyStorage = storageWith({})

    expect(getInitialHomeView(emptyStorage)).toBeNull()
    expect(getInitialTaskDraft(emptyStorage)).toBe('')
  })

  it('scopes the displayed level key by user', () => {
    expect(getLastDisplayedLevelStorageKey(42)).toBe(
      'onestep-last-displayed-level:42',
    )
  })
})
