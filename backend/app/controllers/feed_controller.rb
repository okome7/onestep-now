class FeedController < ApplicationController
  before_action :require_current_user

  def index
    posts = CompletionPost.includes(:task, :user, :comments, :completion_post_likes).order(created_at: :desc)

    render json: {
      status: "success",
      data: posts.map { |post| feed_post_payload(post) }
    }, status: :ok
  end

  private

  def feed_post_payload(post)
    is_mine = post.user_id == current_user.id

    {
      id: post.id,
      task_title: post.task.title,
      status: post.status,
      status_label: post.status_label,
      card_variant: post.card_variant,
      is_mine: is_mine,
      can_like: !is_mine,
      can_comment: !is_mine,
      likes_count: post.completion_post_likes.size,
      comments_count: post.comments.size,
      liked_by_me: !is_mine && post.completion_post_likes.any? { |like| like.user_id == current_user.id },
      created_at: post.created_at,
      completed_at: post.completed_at
    }
  end
end
