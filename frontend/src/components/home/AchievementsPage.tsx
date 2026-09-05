import type { AchievementDetailTab, ProfileAchievement } from '../../appTypes'
import { AppHeader, BackIcon } from '../../sharedComponents'
import { AchievementDetailPanel } from './AchievementDetailPanel'
import { AchievementList } from './AchievementList'
import { PostDeleteModal } from './PostDeleteModal'

type AchievementsPageProps = {
  achievements: ProfileAchievement[]
  now: number
  activeAchievement: ProfileAchievement | null
  activeAchievementId: string | null
  activeTab: AchievementDetailTab
  openMenuId: string | null
  error: string
  isLoading: boolean
  hasLoadedData: boolean
  isDeleteModalOpen: boolean
  isDeleting: boolean
  deleteError: string
  onBack: () => void
  onOpenDetail: (achievementId: string, tab: AchievementDetailTab) => void
  onCloseDetail: () => void
  onTabChange: (tab: AchievementDetailTab) => void
  onToggleMenu: (achievementId: string) => void
  onRequestDelete: (achievementId: string) => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

export function AchievementsPage({
  achievements,
  now,
  activeAchievement,
  activeAchievementId,
  activeTab,
  openMenuId,
  error,
  isLoading,
  hasLoadedData,
  isDeleteModalOpen,
  isDeleting,
  deleteError,
  onBack,
  onOpenDetail,
  onCloseDetail,
  onTabChange,
  onToggleMenu,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: AchievementsPageProps) {
  return (
    <main
      className={`home-page profile-page achievements-page ${
        activeAchievement ? 'detail-open' : ''
      }`}
    >
      <AppHeader
        title="すべての達成"
        leftAction={
          <button
            className="settings-back-button"
            type="button"
            aria-label="マイページに戻る"
            onClick={onBack}
          >
            <BackIcon />
          </button>
        }
      />

      <section className="all-achievements-content" aria-label="すべての達成">
        {error ? (
          <p className="profile-state-message" role="alert">
            {error}
          </p>
        ) : isLoading && !hasLoadedData ? (
          <p className="profile-state-message">読み込み中...</p>
        ) : achievements.length === 0 ? (
          <p className="profile-state-message">まだ記録はありません</p>
        ) : (
          <AchievementList
            achievements={achievements}
            now={now}
            activeAchievementId={activeAchievementId}
            variant="all"
            onOpenDetail={onOpenDetail}
            openMenuId={openMenuId}
            onToggleMenu={onToggleMenu}
            onRequestDelete={onRequestDelete}
          />
        )}
      </section>

      {activeAchievement ? (
        <AchievementDetailPanel
          achievement={activeAchievement}
          activeTab={activeTab}
          now={now}
          onClose={onCloseDetail}
          onTabChange={onTabChange}
        />
      ) : null}

      {isDeleteModalOpen ? (
        <PostDeleteModal
          isDeleting={isDeleting}
          error={deleteError}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      ) : null}
    </main>
  )
}
