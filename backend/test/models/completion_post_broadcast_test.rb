require "test_helper"

class CompletionPostBroadcastTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  setup do
    @user = User.create!(
      name: "Post User",
      email: "post-broadcast@example.com",
      password: "password1",
      avatar_key: "avatar-1"
    )
    @task = @user.tasks.create!(title: "リアルタイム投稿", status: :pending)
  end

  test "投稿作成のコミット後にpost_createdを配信する" do
    events = capture_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      @task.create_completion_post!(user: @user, status: :doing, content: @task.title)
    end

    assert_equal 1, events.size
    event = events.first
    assert_equal "post_created", event["type"]
    assert_equal "リアルタイム投稿", event.dig("post", "task_title")
    assert_equal @user.id, event.dig("post", "user_id")
  end

  test "投稿削除のコミット後にpost_deletedを配信する" do
    post = @task.create_completion_post!(user: @user, status: :doing, content: @task.title)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    assert_broadcast_on(
      FeedUpdatesBroadcaster::STREAM_NAME,
      type: "post_deleted",
      post_id: post.id
    ) { post.destroy! }
  end

  test "投稿完了のコミット後にpost_updatedを配信する" do
    post = @task.create_completion_post!(user: @user, status: :doing, content: @task.title)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    events = capture_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      post.update!(status: :completed, completed_at: Time.current)
    end

    assert_equal 1, events.size
    assert_equal "post_updated", events.first["type"]
    assert_equal "completed", events.first.dig("post", "status")
  end

  test "ステータス以外の更新ではpost_updatedを配信しない" do
    post = @task.create_completion_post!(user: @user, status: :doing, content: @task.title)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    assert_no_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      post.update!(content: "更新した内容")
    end
  end

  test "投稿作成が失敗した場合は配信しない" do
    invalid_post = CompletionPost.new(user: @user, task: @task, status: nil)

    assert_no_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      assert_not invalid_post.save
    end
  end

  test "投稿削除がロールバックされた場合は配信しない" do
    post = @task.create_completion_post!(user: @user, status: :doing, content: @task.title)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    assert_no_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      CompletionPost.transaction do
        post.destroy!
        raise ActiveRecord::Rollback
      end
    end
  end
end
