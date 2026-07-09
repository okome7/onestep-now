class MypageController < ApplicationController
  before_action :require_current_user

  RECENT_ACHIEVEMENTS_LIMIT = 2
  COMPLETIONS_PER_LEVEL = 10

  def show
    completed_posts = current_user.completion_posts
      .completed
      .includes(:task, :completion_post_likes, :comments)
      .order(completed_at: :desc, created_at: :desc)

    total_completed_count = completed_posts.size
    level_payload = level_payload(total_completed_count)

    render json: {
      status: "success",
      data: level_payload.merge(
        achievements_count: total_completed_count,
        streak_days: streak_days(completed_posts),
        likes_count: completed_posts.sum { |post| post.completion_post_likes.size },
        comments_count: completed_posts.sum { |post| post.comments.size },
        recent_achievements: completed_posts.first(RECENT_ACHIEVEMENTS_LIMIT).map { |post| achievement_payload(post) },
        all_achievements: completed_posts.map { |post| achievement_payload(post) }
      )
    }
  end

  private

  def level_payload(total_completed_count)
    completed_in_current_level = total_completed_count % COMPLETIONS_PER_LEVEL

    if total_completed_count.zero?
      return {
        level: 0,
        next_level: 1,
        remaining_to_next_level: COMPLETIONS_PER_LEVEL,
        progress_percent: 0
      }
    end

    level = (total_completed_count / COMPLETIONS_PER_LEVEL).floor + 1

    {
      level: level,
      next_level: level + 1,
      remaining_to_next_level: COMPLETIONS_PER_LEVEL - completed_in_current_level,
      progress_percent: completed_in_current_level * 10
    }
  end

  def streak_days(completed_posts)
    dates = completed_posts.filter_map { |post| (post.completed_at || post.created_at)&.to_date }.uniq
    return 0 if dates.empty?

    streak = 0
    cursor = dates.max
    while dates.include?(cursor)
      streak += 1
      cursor -= 1.day
    end

    streak
  end

  def achievement_payload(post)
    {
      id: post.id,
      task_title: post.task&.title || post.content,
      likes_count: post.completion_post_likes.size,
      comments_count: post.comments.size,
      created_at: post.completed_at || post.created_at
    }
  end
end
