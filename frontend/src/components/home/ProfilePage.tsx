import type { MouseEvent } from 'react'
import type { AchievementDetailTab, ProfileAchievement } from '../../appTypes'
import settingsIcon from '../../assets/icons/settings.svg'
import { AppHeader, BackIcon, HomeBottomNav } from '../../sharedComponents'
import { AchievementDetailPanel } from './AchievementDetailPanel'
import { AchievementList } from './AchievementList'
import { LevelUpAvatar, LevelUpToast } from './LevelUpCelebration'
import { PostDeleteModal } from './PostDeleteModal'
import { ProfileEmptyState } from './ProfileEmptyState'
import { ProfileLevelCard } from './ProfileLevelCard'
import { ProfileStatsGrid } from './ProfileStatsGrid'

type ProfilePageProps = {
  isViewingOwnProfile: boolean
  avatarSrc: string
  profileName: string
  level: number
  nextLevel: number
  remainingToNextLevel: number
  progressPercent: number
  achievementsCount: number
  streakDays: number
  likesCount: number
  commentsCount: number
  recentAchievements: ProfileAchievement[]
  now: number
  error: string
  isLoading: boolean
  hasLoadedData: boolean
  activeAchievement: ProfileAchievement | null
  activeAchievementTab: AchievementDetailTab
  openAchievementMenuId: string | null
  isDeletingPost: boolean
  postDeleteError: string
  isPostDeleteModalOpen: boolean
  levelUpNotificationLevel: number | null
  isLevelUpNotificationClosing: boolean
  onBackToFeed: () => void
  onOpenSettings: () => void
  onDismissLevelUp: () => void
  onOpenAchievements: (event: MouseEvent<HTMLAnchorElement>) => void
  onOpenAchievementDetail: (
    achievementId: string,
    tab: AchievementDetailTab,
  ) => void
  onCloseAchievementDetail: () => void
  onAchievementTabChange: (tab: AchievementDetailTab) => void
  onToggleAchievementMenu: (achievementId: string) => void
  onRequestPostDeletion: (achievementId: string) => void
  onCancelPostDeletion: () => void
  onConfirmPostDeletion: () => void
  onHomeClick: (
    event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  ) => void
  onFeedClick: (
    event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  ) => void
  onProfileClick: (event?: MouseEvent<HTMLAnchorElement>) => void
}

export function ProfilePage({
  isViewingOwnProfile,
  avatarSrc,
  profileName,
  level,
  nextLevel,
  remainingToNextLevel,
  progressPercent,
  achievementsCount,
  streakDays,
  likesCount,
  commentsCount,
  recentAchievements,
  now,
  error,
  isLoading,
  hasLoadedData,
  activeAchievement,
  activeAchievementTab,
  openAchievementMenuId,
  isDeletingPost,
  postDeleteError,
  isPostDeleteModalOpen,
  levelUpNotificationLevel,
  isLevelUpNotificationClosing,
  onBackToFeed,
  onOpenSettings,
  onDismissLevelUp,
  onOpenAchievements,
  onOpenAchievementDetail,
  onCloseAchievementDetail,
  onAchievementTabChange,
  onToggleAchievementMenu,
  onRequestPostDeletion,
  onCancelPostDeletion,
  onConfirmPostDeletion,
  onHomeClick,
  onFeedClick,
  onProfileClick,
}: ProfilePageProps) {
  const hasAchievements = achievementsCount > 0

  return (
    <main className="home-page profile-page">
      <AppHeader
        title="マイページ"
        leftAction={
          isViewingOwnProfile ? null : (
            <button
              className="profile-back-button"
              type="button"
              aria-label="フィードに戻る"
              onClick={onBackToFeed}
            >
              <BackIcon />
            </button>
          )
        }
        rightAction={
          isViewingOwnProfile ? (
            <button
              className="profile-settings-button"
              type="button"
              aria-label="設定"
              onClick={onOpenSettings}
            >
              <img src={settingsIcon} alt="" aria-hidden="true" />
            </button>
          ) : null
        }
      />

      <LevelUpToast
        isClosing={isLevelUpNotificationClosing}
        level={levelUpNotificationLevel}
        onDismiss={onDismissLevelUp}
      />

      <section className="profile-content" aria-label="マイページ">
        <LevelUpAvatar
          avatarSrc={avatarSrc}
          isLevelingUp={levelUpNotificationLevel !== null}
        />
        <p className="profile-name">{profileName}</p>

        <ProfileLevelCard
          level={level}
          nextLevel={nextLevel}
          remainingToNextLevel={remainingToNextLevel}
          progressPercent={progressPercent}
        />

        {error ? (
          <p className="profile-state-message" role="alert">
            {error}
          </p>
        ) : isLoading && !hasLoadedData ? (
          <p className="profile-state-message">読み込み中...</p>
        ) : hasAchievements ? (
          <>
            <section
              className="profile-section"
              aria-labelledby="profile-stats-title"
            >
              <h2 id="profile-stats-title">実績</h2>
              <ProfileStatsGrid
                achievementsCount={achievementsCount}
                streakDays={streakDays}
                likesCount={likesCount}
                commentsCount={commentsCount}
              />
            </section>

            <section
              className="profile-section"
              aria-labelledby="profile-recent-title"
            >
              <div className="profile-section-heading">
                <h2 id="profile-recent-title">最近の達成</h2>
                <a href="/home" onClick={onOpenAchievements}>
                  すべて見る&gt;
                </a>
              </div>
              <AchievementList
                achievements={recentAchievements}
                now={now}
                onOpenDetail={onOpenAchievementDetail}
                openMenuId={openAchievementMenuId}
                onToggleMenu={onToggleAchievementMenu}
                onRequestDelete={onRequestPostDeletion}
              />
            </section>
          </>
        ) : isViewingOwnProfile ? (
          <ProfileEmptyState onStart={onHomeClick} />
        ) : (
          <section className="profile-empty-state" aria-label="記録なし">
            <h2>まだ記録はありません</h2>
          </section>
        )}
      </section>

      {activeAchievement ? (
        <AchievementDetailPanel
          achievement={activeAchievement}
          activeTab={activeAchievementTab}
          now={now}
          onClose={onCloseAchievementDetail}
          onTabChange={onAchievementTabChange}
        />
      ) : null}

      {isPostDeleteModalOpen ? (
        <PostDeleteModal
          isDeleting={isDeletingPost}
          error={postDeleteError}
          onCancel={onCancelPostDeletion}
          onConfirm={onConfirmPostDeletion}
        />
      ) : null}

      <HomeBottomNav
        activeItem="profile"
        onHomeClick={onHomeClick}
        onFeedClick={onFeedClick}
        onProfileClick={onProfileClick}
      />
    </main>
  )
}
