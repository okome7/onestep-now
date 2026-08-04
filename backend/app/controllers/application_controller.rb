class ApplicationController < ActionController::API
  include ActionController::Cookies

  SESSION_COOKIE = "onestep_session"
  CSRF_COOKIE = "onestep_csrf"

  before_action :authenticate_user!
  before_action :verify_request_origin!
  before_action :verify_csrf_token!

  private

  def current_user
    current_auth_session&.user
  end

  def current_auth_session
    return @current_auth_session if defined?(@current_auth_session)

    @current_auth_session = AuthSession.authenticate(cookies[SESSION_COOKIE])
  end

  def authenticate_user!
    return if current_auth_session

    render json: { status: "error", errors: [ "認証が必要です" ] }, status: :unauthorized
  end

  alias_method :require_current_user, :authenticate_user!

  def verify_request_origin!
    return if request.get? || request.head? || request.options?
    return if ::AllowedFrontendOrigins.all.include?(request.headers["Origin"])

    render json: { status: "error", errors: [ "許可されていないリクエストです" ] }, status: :forbidden
  end

  def verify_csrf_token!
    return if request.get? || request.head? || request.options?
    return unless current_auth_session

    header_token = request.headers["X-CSRF-Token"]
    cookie_token = cookies[CSRF_COOKIE]
    return if header_token.present? && header_token == cookie_token && current_auth_session.valid_csrf_token?(header_token)

    render json: { status: "error", errors: [ "CSRFトークンが無効です" ] }, status: :forbidden
  end

  def start_authenticated_session!(user)
    current_auth_session&.revoke!
    auth_session, token, csrf_token = AuthSession.issue_for(user)
    cookie_options = {
      path: "/",
      same_site: :lax,
      secure: Rails.env.production? || Rails.env.staging?,
      expires: auth_session.expires_at
    }
    cookies[SESSION_COOKIE] = cookie_options.merge(value: token, httponly: true)
    cookies[CSRF_COOKIE] = cookie_options.merge(value: csrf_token, httponly: false)
    auth_session
  end

  def end_authenticated_session!
    current_auth_session&.revoke!
    expire_authentication_cookies
  end

  def expire_authentication_cookies
    cookie_options = {
      path: "/",
      same_site: :lax,
      secure: Rails.env.production? || Rails.env.staging?
    }
    cookies.delete(SESSION_COOKIE, **cookie_options)
    cookies.delete(CSRF_COOKIE, **cookie_options)
  end

  def user_payload(user)
    {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_key: user.avatar_key
    }
  end

  def render_forbidden
    render json: { status: "error", errors: [ "権限がありません" ] }, status: :forbidden
  end
end
