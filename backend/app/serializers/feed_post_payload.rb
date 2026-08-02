class FeedPostPayload
  def initialize(post, viewer: nil, completed_count: nil, comment_count: nil, commented_by_viewer: false, include_user_id: false)
    @post = post
    @viewer = viewer
    @completed_count = completed_count
    @comment_count = comment_count
    @commented_by_viewer = commented_by_viewer
    @include_user_id = include_user_id
  end

  def as_json
    payload = {
      id: post.id,
      user_name: post.user.name,
      level: level_for(completed_count),
      task_title: post.task.title,
      status: post.status,
      status_label: post.status_label,
      card_variant: post.card_variant,
      is_mine: viewer.present? && post.user_id == viewer.id,
      can_like: true,
      can_comment: true,
      likes_count: post.completion_post_likes.size,
      comments_count: comment_count,
      liked_by_me: viewer.present? && post.completion_post_likes.any? { |like| like.user_id == viewer.id },
      commented_by_me: @commented_by_viewer,
      comments: [],
      created_at: post.created_at,
      completed_at: post.completed_at
    }

    payload[:user_id] = post.user_id if @include_user_id
    payload
  end

  private

  attr_reader :post, :viewer

  def completed_count
    @completed_count || CompletionPost.completed.where(user_id: post.user_id).count
  end

  def comment_count
    @comment_count || post.comments.count
  end

  def level_for(count)
    return 0 if count.zero?

    (count / 10).floor + 1
  end
end
