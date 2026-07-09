class MypageController < ApplicationController
  before_action :require_current_user

  def show
    posts = current_user.completion_posts.completed
      .includes(:task, :completion_post_likes, comments: :user)
      .order(Arel.sql("COALESCE(completion_posts.completed_at, completion_posts.created_at) DESC"))

    completed_count = posts.size
    likes_count = posts.sum { |post| post.completion_post_likes.size }
    comments_count = posts.sum { |post| post.comments.size }

    render json: {
      status: "success",
      data: {
        level: level_for(completed_count),
        next_level: next_level_for(completed_count),
        remaining_to_next_level: remaining_to_next_level_for(completed_count),
        progress_percent: progress_percent_for(completed_count),
        achievements_count: completed_count,
        streak_days: streak_days(posts),
        likes_count: likes_count,
        comments_count: comments_count,
        recent_achievements: posts.first(2).map { |post| achievement_payload(post) },
        all_achievements: posts.map { |post| achievement_payload(post) }
      }
    }, status: :ok
  end

  private

  def level_for(completed_count)
    return 0 if completed_count.zero?

    (completed_count / 10).floor + 1
  end

  def next_level_for(completed_count)
    level_for(completed_count) + 1
  end

  def remaining_to_next_level_for(completed_count)
    completed_in_current_level = completed_count % 10
    remaining = 10 - completed_in_current_level
    remaining.zero? ? 10 : remaining
  end

  def progress_percent_for(completed_count)
    (completed_count % 10) * 10
  end

  def streak_days(posts)
    achieved_dates = posts.map { |post| achieved_at(post).in_time_zone.to_date }.uniq
    return 0 if achieved_dates.empty?

    streak = 0
    current_date = achieved_dates.max

    while achieved_dates.include?(current_date)
      streak += 1
      current_date -= 1.day
    end

    streak
  end

  def achievement_payload(post)
    {
      id: post.id,
      task_title: post.task.title,
      likes_count: post.completion_post_likes.size,
      comments_count: post.comments.size,
      created_at: achieved_at(post),
      liked_users: post.completion_post_likes.map { |like| user_payload(like.user) },
      comments: post.comments.order(created_at: :asc).map { |comment| comment_payload(comment) }
    }
  end

  def achieved_at(post)
    post.completed_at || post.created_at
  end

  def user_payload(user)
    {
      id: user.id,
      name: user.name,
      level: level_for(user.completion_posts.completed.count)
    }
  end

  def comment_payload(comment)
    {
      id: comment.id,
      user_name: comment.user.name,
      user_level: level_for(comment.user.completion_posts.completed.count),
      avatar_key: comment.user.avatar_key,
      body: comment.body,
      created_at: comment.created_at
    }
  end
end
