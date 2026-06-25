class CompletionPostLikesController < ApplicationController
  before_action :require_current_user
  before_action :set_completion_post

  def create
    return render_forbidden if own_post?

    @completion_post.completion_post_likes.find_or_create_by!(user: current_user)
    render json: { status: "success" }, status: :created
  end

  private

  def set_completion_post
    @completion_post = CompletionPost.find(params[:completion_post_id])
  end

  def own_post?
    @completion_post.user_id == current_user.id
  end
end
