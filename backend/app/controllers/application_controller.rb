class ApplicationController < ActionController::API
  private

  def current_user
    @current_user ||= User.find_by(id: request.headers["X-User-Id"].presence || params[:user_id])
  end

  def require_current_user
    return if current_user

    render json: { status: "error", errors: [ "認証が必要です" ] }, status: :unauthorized
  end

  def render_forbidden
    render json: { status: "error", errors: [ "権限がありません" ] }, status: :forbidden
  end
end
