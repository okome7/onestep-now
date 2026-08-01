class CommentsController < ApplicationController
  COMMENTS_LIMIT = 20

  before_action :require_current_user
  before_action :set_completion_post

  def index
    page = [ params.fetch(:page, 1).to_i, 1 ].max
    comments = @completion_post.comments
      .preload(:user)
      .order(created_at: :desc, id: :desc)
      .offset((page - 1) * COMMENTS_LIMIT)
      .limit(COMMENTS_LIMIT + 1)
      .to_a
    has_more = comments.length > COMMENTS_LIMIT
    comments = comments.first(COMMENTS_LIMIT).reverse
    @completed_post_counts = completed_post_counts_for(comments)

    render json: {
      status: "success",
      pagination: {
        page: page,
        per_page: COMMENTS_LIMIT,
        has_more: has_more
      },
      data: comments.map { |comment| comment_payload(comment) }
    }, status: :ok
  end

  def create
    comment = @completion_post.comments.create!(user: current_user, body: comment_params[:body])
    @completed_post_counts = {
      current_user.id => current_user.completion_posts.completed.count
    }
    render json: { status: "success", data: comment_payload(comment) }, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { status: "error", errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  private

  def set_completion_post
    @completion_post = CompletionPost.find(params[:completion_post_id])
  end

  def comment_params
    params.require(:comment).permit(:body)
  end

  def comment_payload(comment)
    {
      id: comment.id,
      user_id: comment.user_id,
      user_name: comment.user.name,
      level: level_for(@completed_post_counts.fetch(comment.user_id, 0)),
      avatar_key: comment.user.avatar_key,
      completion_post_id: comment.completion_post_id,
      body: comment.body,
      post_status_when_commented: comment.post_status_when_commented,
      created_at: comment.created_at,
      updated_at: comment.updated_at
    }
  end

  def completed_post_counts_for(comments)
    CompletionPost.completed
      .where(user_id: comments.map(&:user_id).uniq)
      .group(:user_id)
      .count
  end

  def level_for(completed_count)
    return 0 if completed_count.zero?

    (completed_count / 10).floor + 1
  end
end
