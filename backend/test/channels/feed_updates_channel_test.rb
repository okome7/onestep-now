require "test_helper"

class FeedUpdatesChannelTest < ActionCable::Channel::TestCase
  setup do
    stub_connection current_user: User.create!(
      name: "Feed User",
      email: "feed-channel@example.com",
      password: "password1",
      avatar_key: "avatar-1",
      feed_access_expires_at: 3.minutes.from_now
    )
  end

  test "閲覧時間内のユーザーがフィード更新を購読する" do
    subscribe

    assert subscription.confirmed?
    assert_has_stream FeedUpdatesBroadcaster::STREAM_NAME
  end

  test "閲覧時間外のユーザーの購読を拒否する" do
    connection.current_user.update!(feed_access_expires_at: 1.minute.ago)

    subscribe

    assert subscription.rejected?
  end
end
