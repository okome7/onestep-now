class CommentsController < ApplicationController
  before_action :require_current_user
  before_action :set_completion_post

  def create
    comment = @completion_post.comments.create!(user: current_user, body: comment_params[:body])
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
      completion_post_id: comment.completion_post_id,
      body: comment.body,
      post_status_when_commented: comment.post_status_when_commented,
      created_at: comment.created_at,
      updated_at: comment.updated_at
    }
  end
end
