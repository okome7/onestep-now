require "test_helper"

class ApplicationCable::ConnectionTest < ActionCable::Connection::TestCase
  setup do
    @user = User.create!(
      name: "Cable User",
      email: "cable@example.com",
      password: "password1",
      avatar_key: "avatar-1"
    )
  end

  test "署名済みトークンのユーザーを接続に設定する" do
    auth_session, = AuthSession.issue_for(@user)
    connect params: { token: CableUserToken.issue(auth_session) }

    assert_equal @user, connection.current_user
  end

  test "トークンがない接続を拒否する" do
    assert_reject_connection { connect }
  end

  test "改ざんされたトークンの接続を拒否する" do
    assert_reject_connection { connect params: { token: "invalid-token" } }
  end
end
