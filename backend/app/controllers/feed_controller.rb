class FeedController < ApplicationController
  POSTS_LIMIT = 20

  before_action :require_current_user

  def index
    return render_feed_unavailable unless feed_accessible?

    page = [ params.fetch(:page, 1).to_i, 1 ].max
    posts = CompletionPost
      .preload(:task, :user, completion_post_likes: :user, comments: :user)
      .order(created_at: :desc, id: :desc)
      .offset((page - 1) * POSTS_LIMIT)
      .limit(POSTS_LIMIT + 1)
      .to_a
    has_more = posts.length > POSTS_LIMIT
    posts = posts.first(POSTS_LIMIT)
    @completed_post_counts = completed_post_counts_for(posts)

    render json: {
      status: "success",
      remaining_seconds: remaining_seconds,
      feed_access_expires_at: current_user.feed_access_expires_at,
      pagination: {
        page: page,
        per_page: POSTS_LIMIT,
        has_more: has_more
      },
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

  def render_feed_unavailable
    render json: {
      status: "success",
      access_allowed: false,
      remaining_seconds: 0,
      feed_access_expires_at: current_user.feed_access_expires_at,
      data: []
    }, status: :ok
  end

  def feed_post_payload(post)
    is_mine = post.user_id == current_user.id

    {
      id: post.id,
      user_name: post.user.name,
      level: level_for(@completed_post_counts.fetch(post.user_id, 0)),
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
      comments: ordered_comments(post).map { |comment| comment_payload(comment) },
      created_at: post.created_at,
      completed_at: post.completed_at
    }
  end

  def comment_payload(comment)
    {
      id: comment.id,
      user_id: comment.user_id,
      user_name: comment.user.name,
      level: level_for(@completed_post_counts.fetch(comment.user_id, 0)),
      avatar_key: comment.user.avatar_key,
      body: comment.body,
      post_status_when_commented: comment.post_status_when_commented,
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

  def level_for(completed_count)
    return 0 if completed_count.zero?

    (completed_count / 10).floor + 1
  end
end
