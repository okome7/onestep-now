class CompletionPostsController < ApplicationController
  before_action :require_current_user
  before_action :set_completion_post

  def destroy
    return render_forbidden unless @completion_post.user_id == current_user.id

    @completion_post.destroy!
    head :no_content
  end

  private

  def set_completion_post
    @completion_post = CompletionPost.find(params[:id])
  end
end
