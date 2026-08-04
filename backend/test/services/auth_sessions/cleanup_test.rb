require "test_helper"

class AuthSessions::CleanupTest < ActiveSupport::TestCase
  FIXED_TIME = Time.zone.parse("2026-08-04 12:00:00")

  setup do
    AuthSession.delete_all
    @user = User.create!(
      name: "Cleanup User",
      email: "cleanup-#{SecureRandom.hex(4)}@example.com",
      password: "password1",
      avatar_key: "avatar-1"
    )
  end

  test "有効期限内かつ未失効のセッションは削除しない" do
    travel_to(FIXED_TIME) do
      session = create_session(expires_at: 1.day.from_now)

      assert_equal 0, cleanup
      assert_predicate session.reload, :persisted?
    end
  end

  test "猶予期間を過ぎた期限切れセッションを削除する" do
    travel_to(FIXED_TIME) do
      session = create_session(expires_at: 24.hours.ago)

      assert_equal 1, cleanup
      assert_not AuthSession.exists?(session.id)
    end
  end

  test "猶予期間を過ぎた失効済みセッションを削除する" do
    travel_to(FIXED_TIME) do
      session = create_session(expires_at: 1.day.from_now, revoked_at: 24.hours.ago)

      assert_equal 1, cleanup
      assert_not AuthSession.exists?(session.id)
    end
  end

  test "期限切れ直後で猶予期間内のセッションは削除しない" do
    travel_to(FIXED_TIME) do
      session = create_session(expires_at: 23.hours.ago)

      assert_equal 0, cleanup
      assert_predicate session.reload, :persisted?
    end
  end

  test "失効直後で猶予期間内のセッションは削除しない" do
    travel_to(FIXED_TIME) do
      session = create_session(expires_at: 1.day.from_now, revoked_at: 23.hours.ago)

      assert_equal 0, cleanup
      assert_predicate session.reload, :persisted?
    end
  end

  test "有効なWebSocket紐付きセッションは削除しない" do
    travel_to(FIXED_TIME) do
      session, = AuthSession.issue_for(@user)
      cable_token = CableUserToken.issue(session)

      assert_equal 0, cleanup
      assert_equal @user, CableUserToken.user_for(cable_token)
    end
  end

  test "対象がなくても複数回実行でき削除件数は0になる" do
    travel_to(FIXED_TIME) do
      assert_equal 0, cleanup
      assert_equal 0, cleanup
    end
  end

  private

  def cleanup
    AuthSessions::Cleanup.new(as_of: FIXED_TIME).call
  end

  def create_session(expires_at:, revoked_at: nil)
    AuthSession.create!(
      user: @user,
      token_digest: AuthSession.digest(SecureRandom.urlsafe_base64(32)),
      csrf_token_digest: AuthSession.digest(SecureRandom.urlsafe_base64(32)),
      expires_at: expires_at,
      revoked_at: revoked_at
    )
  end
end
