require "test_helper"
require "rake"

class AuthSessionsCleanupTaskTest < ActiveSupport::TestCase
  setup do
    Rails.application.load_tasks unless Rake::Task.task_defined?("auth_sessions:cleanup")
    @task = Rake::Task["auth_sessions:cleanup"]
    @task.reenable
  end

  test "Rakeタスクから削除処理を実行できる" do
    AuthSession.delete_all
    user = User.create!(
      name: "Rake Cleanup User",
      email: "rake-cleanup-#{SecureRandom.hex(4)}@example.com",
      password: "password1",
      avatar_key: "avatar-1"
    )
    session, = AuthSession.issue_for(user)
    session.update!(expires_at: 2.days.ago)

    assert_difference("AuthSession.count", -1) { @task.invoke }
  end
end
