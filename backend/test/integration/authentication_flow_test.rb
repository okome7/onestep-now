require "test_helper"

class AuthenticationFlowTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  ORIGIN = "http://localhost:5173"

  setup do
    @user = User.create!(
      name: "Auth User",
      email: "auth-user@example.com",
      password: "password1",
      avatar_key: "avatar-1"
    )
    @other_user = User.create!(
      name: "Other User",
      email: "other-user@example.com",
      password: "password1",
      avatar_key: "avatar-2"
    )
  end

  test "正しいCookieセッションで保護APIを利用できる" do
    login_as(@user)

    get "/api/mypage"

    assert_response :ok
  end

  test "Cookieセッションの有効期限は30日後になる" do
    login_as(@user)

    assert_in_delta 30.days.from_now, @user.auth_sessions.last.expires_at, 5.seconds
  end

  test "未認証ではX-User-Idを指定しても利用できない" do
    get "/api/mypage", headers: { "X-User-Id" => @user.id.to_s }

    assert_response :unauthorized
  end

  test "改ざんされたCookieを拒否する" do
    cookies[ApplicationController::SESSION_COOKIE] = "tampered"

    get "/api/mypage"

    assert_response :unauthorized
  end

  test "有効期限切れのセッションを拒否する" do
    login_as(@user)
    @user.auth_sessions.last.update!(expires_at: 1.minute.ago)

    get "/api/mypage"

    assert_response :unauthorized
  end

  test "ログアウト後はセッションとWebSocketトークンを利用できない" do
    login_as(@user)
    post "/api/cable_token", headers: authenticated_headers
    cable_token = response.parsed_body.dig("data", "token")

    delete "/logout", headers: authenticated_headers
    assert_response :ok
    assert_nil CableUserToken.user_for(cable_token)

    get "/api/mypage"
    assert_response :unauthorized
  end

  test "認証中でも指定した他ユーザーのマイページを閲覧できる" do
    own_post = create_post_for(@user, "自分の達成", completed: true)
    other_post = create_post_for(@other_user, "他人の達成", completed: true)
    login_as(@user)

    get "/api/mypage", params: { user_id: @other_user.id }, headers: { "X-User-Id" => @other_user.id.to_s }

    assert_response :ok
    achievement_ids = response.parsed_body.dig("data", "all_achievements").pluck("id")
    assert_includes achievement_ids, other_post.id
    assert_not_includes achievement_ids, own_post.id
  end

  test "他ユーザーの投稿を削除できない" do
    other_post = create_post_for(@other_user, "削除不可")
    login_as(@user)

    delete "/api/completion_posts/#{other_post.id}", headers: authenticated_headers

    assert_response :forbidden
    assert_predicate other_post.reload, :persisted?
  end

  test "他ユーザーのタスクを変更できない" do
    other_task = @other_user.tasks.create!(title: "変更不可", status: :pending)
    login_as(@user)

    patch "/api/tasks/#{other_task.id}/start", headers: authenticated_headers

    assert_response :forbidden
    assert_predicate other_task.reload, :pending?
  end

  test "本文のユーザーIDを信用せず現在のユーザーとしていいねとコメントを作成する" do
    other_post = create_post_for(@other_user, "応援対象")
    login_as(@user)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    events = capture_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      post "/api/completion_posts/#{other_post.id}/likes",
        params: { user_id: @other_user.id },
        headers: authenticated_headers,
        as: :json
      post "/api/completion_posts/#{other_post.id}/comments",
        params: { user_id: @other_user.id, comment: { body: "応援" } },
        headers: authenticated_headers,
        as: :json
    end

    assert_equal @user.id, other_post.completion_post_likes.last.user_id
    assert_equal @user.id, other_post.comments.last.user_id
    assert_equal [ @user.id ], events.map { |event| event["user_id"] }.uniq
  end

  test "未認証のいいねとコメントは配信しない" do
    other_post = create_post_for(@other_user, "未認証では応援不可")
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    assert_no_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      post "/api/completion_posts/#{other_post.id}/likes", as: :json
      assert_response :unauthorized
      post "/api/completion_posts/#{other_post.id}/comments",
        params: { comment: { body: "拒否されるコメント" } },
        as: :json
      assert_response :unauthorized
    end
  end

  test "CSRFエラーのいいねとコメントは配信しない" do
    other_post = create_post_for(@other_user, "CSRFなしでは応援不可")
    login_as(@user)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    assert_no_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      post "/api/completion_posts/#{other_post.id}/likes",
        headers: { "Origin" => ORIGIN },
        as: :json
      assert_response :forbidden
      post "/api/completion_posts/#{other_post.id}/comments",
        params: { comment: { body: "拒否されるコメント" } },
        headers: { "Origin" => ORIGIN },
        as: :json
      assert_response :forbidden
    end
  end

  test "アカウント削除後は認証できない" do
    login_as(@user)

    delete "/account", headers: authenticated_headers

    assert_response :ok
    assert_not User.exists?(@user.id)
    get "/api/mypage"
    assert_response :unauthorized
  end

  test "パスワード再設定後は既存セッションを無効化する" do
    login_as(@user)
    _reset_code, raw_code = PasswordResetCode.issue_for(email: @user.email, user: @user)

    patch "/password_reset",
      params: {
        user: {
          email: @user.email,
          code: raw_code,
          password: "newpassword1",
          password_confirmation: "newpassword1"
        }
      },
      headers: { "Origin" => ORIGIN },
      as: :json

    assert_response :ok
    assert_empty @user.auth_sessions.active
    get "/api/mypage"
    assert_response :unauthorized
  end

  test "CSRFトークンがない状態変更を拒否する" do
    login_as(@user)

    post "/api/tasks",
      params: { task: { title: "拒否されるタスク" } },
      headers: { "Origin" => ORIGIN },
      as: :json

    assert_response :forbidden
    assert_not @user.tasks.exists?(title: "拒否されるタスク")
  end

  private

  def login_as(user)
    post "/login",
      params: { user: { email: user.email, password: "password1" } },
      headers: { "Origin" => ORIGIN },
      as: :json
    assert_response :ok
  end

  def authenticated_headers
    {
      "Origin" => ORIGIN,
      "X-CSRF-Token" => cookies[ApplicationController::CSRF_COOKIE]
    }
  end

  def create_post_for(user, title, completed: false)
    task = user.tasks.create!(
      title: title,
      status: completed ? :completed : :active,
      completed_at: completed ? Time.current : nil
    )
    task.create_completion_post!(
      user: user,
      status: completed ? :completed : :doing,
      content: title,
      completed_at: completed ? Time.current : nil
    )
  end
end
