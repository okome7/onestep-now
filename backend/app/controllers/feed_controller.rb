class FeedController < ApplicationController
  before_action :require_current_user

  def index
    return render_feed_forbidden unless feed_accessible?

    posts = CompletionPost.includes(:task, :user, :completion_post_likes, comments: :user).order(created_at: :desc)

    render json: {
      status: "success",
      remaining_seconds: remaining_seconds,
      feed_access_expires_at: current_user.feed_access_expires_at,
      data: posts.map { |post| feed_post_payload(post) }
    }, status: :ok
  end

  private

  def feed_accessible?
    current_user.feed_access_expires_at.present? && current_user.feed_access_expires_at.future?
  end

  def remaining_seconds
    return 0 unless current_user.feed_access_expires_at

    [ (current_user.feed_access_expires_at - Time.current).ceil, 0 ].max
  end

  def render_feed_forbidden
    render json: {
      status: "error",
      errors: [ "フィード閲覧時間外です" ]
    }, status: :forbidden
  end

  def feed_post_payload(post)
    is_mine = post.user_id == current_user.id

    {
      id: post.id,
      user_name: post.user.name,
      level: level_for(post.user.completion_posts.completed.count),
      task_title: post.task.title,
      status: post.status,
      status_label: post.status_label,
      card_variant: post.card_variant,
      is_mine: is_mine,
      can_like: true,
      can_comment: true,
      likes_count: post.completion_post_likes.size,
      comments_count: post.comments.size,
      liked_by_me: post.completion_post_likes.any? { |like| like.user_id == current_user.id },
      commented_by_me: post.comments.any? { |comment| comment.user_id == current_user.id },
      comments: post.comments.order(created_at: :asc).map { |comment| comment_payload(comment) },
      created_at: post.created_at,
      completed_at: post.completed_at
    }
  end

  def comment_payload(comment)
    {
      id: comment.id,
      user_id: comment.user_id,
      user_name: comment.user.name,
      level: level_for(comment.user.completion_posts.completed.count),
      avatar_key: comment.user.avatar_key,
      body: comment.body,
      post_status_when_commented: comment.post_status_when_commented,
      created_at: comment.created_at
    }
  end

  def level_for(completed_count)
    return 0 if completed_count.zero?

    (completed_count / 10).floor + 1
  end
end
