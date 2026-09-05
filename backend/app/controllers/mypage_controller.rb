class MypageController < ApplicationController
  POSTS_LIMIT = 20

  before_action :require_current_user

  def show
    profile_user = params[:user_id].present? ? User.find_by(id: params[:user_id]) : current_user
    return render json: { status: "error", errors: [ "ユーザーが見つかりません。" ] }, status: :not_found unless profile_user

    completed_posts = profile_user.completion_posts.completed
    completed_count = completed_posts.count
    likes_count = CompletionPostLike.where(completion_post_id: completed_posts.select(:id)).count
    comments_count = Comment.where(completion_post_id: completed_posts.select(:id)).count
    achieved_dates = completed_posts.pluck(:completed_at, :created_at).map do |completed_at, created_at|
      (completed_at || created_at).in_time_zone.to_date
    end

    posts = completed_posts
      .preload(:task, :user, completion_post_likes: :user, comments: :user)
      .order(Arel.sql("COALESCE(completion_posts.completed_at, completion_posts.created_at) DESC"))
      .limit(POSTS_LIMIT)
      .to_a
    @completed_post_counts = completed_post_counts_for(posts)

    render json: {
      status: "success",
      data: {
        user: {
          id: profile_user.id,
          name: profile_user.name,
          avatar_key: profile_user.avatar_key
        },
        level: level_for(completed_count),
        next_level: next_level_for(completed_count),
        remaining_to_next_level: remaining_to_next_level_for(completed_count),
        progress_percent: progress_percent_for(completed_count),
        achievements_count: completed_count,
        streak_days: streak_days(achieved_dates),
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

    (completed_count / User::COMPLETIONS_PER_LEVEL).floor + 1
  end

  def next_level_for(completed_count)
    level_for(completed_count) + 1
  end

  def remaining_to_next_level_for(completed_count)
    completed_in_current_level = completed_count % User::COMPLETIONS_PER_LEVEL
    remaining = User::COMPLETIONS_PER_LEVEL - completed_in_current_level
    remaining.zero? ? User::COMPLETIONS_PER_LEVEL : remaining
  end

  def progress_percent_for(completed_count)
    (completed_count % User::COMPLETIONS_PER_LEVEL) * 100 / User::COMPLETIONS_PER_LEVEL
  end

  def streak_days(achieved_dates)
    achieved_dates = achieved_dates.uniq
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
      can_delete: post.user_id == current_user.id,
      task_title: post.task.title,
      likes_count: post.completion_post_likes.size,
      comments_count: post.comments.size,
      created_at: achieved_at(post),
      liked_users: post.completion_post_likes.map { |like| user_payload(like.user) },
      comments: ordered_comments(post).map { |comment| comment_payload(comment) }
    }
  end

  def achieved_at(post)
    post.completed_at || post.created_at
  end

  def user_payload(user)
    {
      id: user.id,
      name: user.name,
      level: level_for(@completed_post_counts.fetch(user.id, 0))
    }
  end

  def comment_payload(comment)
    {
      id: comment.id,
      user_name: comment.user.name,
      user_level: level_for(@completed_post_counts.fetch(comment.user_id, 0)),
      avatar_key: comment.user.avatar_key,
      body: comment.body,
      created_at: comment.created_at
    }
  end

  def ordered_comments(post)
    post.comments.sort_by { |comment| [ comment.created_at, comment.id ] }
  end

  def completed_post_counts_for(posts)
    user_ids = posts.flat_map do |post|
      [ post.user_id, *post.comments.map(&:user_id), *post.completion_post_likes.map(&:user_id) ]
    end.uniq

    CompletionPost.completed.where(user_id: user_ids).group(:user_id).count
  end
end
