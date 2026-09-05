export const feedIntroStorageKey = 'onestep-feed-intro-seen'
export const activeHomeViewStorageKey = 'onestep-active-home-view'
export const taskDraftStorageKey = 'onestep-task-draft'

const lastDisplayedLevelStorageKeyPrefix = 'onestep-last-displayed-level'

export function getLastDisplayedLevelStorageKey(userId: number) {
  return `${lastDisplayedLevelStorageKeyPrefix}:${userId}`
}

type ReadableStorage = Pick<Storage, 'getItem'>

export function getInitialHomeView(storage: ReadableStorage = sessionStorage) {
  return storage.getItem(activeHomeViewStorageKey)
}

export function getInitialTaskDraft(storage: ReadableStorage = sessionStorage) {
  return storage.getItem(taskDraftStorageKey) ?? ''
}
