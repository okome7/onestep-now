require "test_helper"
require "stringio"

class FeedReactionBroadcastTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  setup do
    @author = create_user("author")
    @reactor = create_user("reactor")
    task = @author.tasks.create!(title: "応援される投稿", status: :pending)
    @post = task.create_completion_post!(user: @author, status: :doing, content: task.title)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)
  end

  test "いいね成功後にlike_createdを1回配信する" do
    events = capture_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      @post.completion_post_likes.create!(user: @reactor)
    end

    assert_equal 1, events.size
    assert_equal "like_created", events.first["type"]
    assert_equal @post.id, events.first["post_id"]
    assert_equal @reactor.id, events.first["user_id"]
    assert_equal @post.completion_post_likes.count, events.first["likes_count"]
  end

  test "いいね解除後にlike_deletedを1回配信する" do
    like = @post.completion_post_likes.create!(user: @reactor)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    events = capture_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) { like.destroy! }

    assert_equal 1, events.size
    assert_equal "like_deleted", events.first["type"]
    assert_equal @reactor.id, events.first["user_id"]
    assert_equal 0, events.first["likes_count"]
  end

  test "コメント成功後にcomment_createdを1回配信する" do
    events = capture_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      @post.comments.create!(user: @reactor, body: "応援しています")
    end

    assert_equal 1, events.size
    event = events.first
    assert_equal "comment_created", event["type"]
    assert_equal @post.id, event["post_id"]
    assert_equal @reactor.id, event["user_id"]
    assert_equal @post.comments.count, event["comments_count"]
    assert_equal "応援しています", event.dig("comment", "body")
    assert_equal @reactor.id, event.dig("comment", "user_id")
    assert_nil event.dig("comment", "email")
    assert_nil event.dig("comment", "password_digest")
  end

  test "バリデーションエラーでは配信しない" do
    assert_no_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      assert_not @post.comments.create(user: @reactor, body: "").persisted?
    end
  end

  test "ロールバックされた反応は配信しない" do
    assert_no_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      CompletionPostLike.transaction do
        @post.completion_post_likes.create!(user: @reactor)
        raise ActiveRecord::Rollback
      end
    end
  end

  test "同じいいねを再作成しても重複配信しない" do
    @post.completion_post_likes.create!(user: @reactor)
    clear_messages(FeedUpdatesBroadcaster::STREAM_NAME)

    assert_no_broadcasts(FeedUpdatesBroadcaster::STREAM_NAME) do
      @post.completion_post_likes.find_or_create_by!(user: @reactor)
    end
  end

  test "配信障害でも保存したいいねを失敗扱いにしない" do
    original_server = ActionCable.server
    failing_server = Object.new
    failing_server.define_singleton_method(:broadcast) { |*| raise "Cable unavailable" }
    ActionCable.instance_variable_set(:@server, failing_server)

    assert_difference("CompletionPostLike.count", 1) do
      @post.completion_post_likes.create!(user: @reactor)
    end
  ensure
    ActionCable.instance_variable_set(:@server, original_server)
  end

  test "アダプター読込失敗でも保存したいいねを失敗扱いにせず機密情報をログへ出さない" do
    original_server = ActionCable.server
    failing_server = Object.new
    failing_server.define_singleton_method(:broadcast) do |*|
      raise Gem::LoadError, "redis is not part of the bundle: secret-token"
    end
    ActionCable.instance_variable_set(:@server, failing_server)
    original_logger = Rails.logger
    log_output = StringIO.new
    Rails.logger = ActiveSupport::Logger.new(log_output)

    assert_difference("CompletionPostLike.count", 1) do
      @post.completion_post_likes.create!(user: @reactor)
    end

    assert_includes log_output.string, "Feed like_created broadcast failed: Gem::LoadError"
    assert_not_includes log_output.string, "secret-token"
  ensure
    Rails.logger = original_logger if original_logger
    ActionCable.instance_variable_set(:@server, original_server)
  end

  private

  def create_user(prefix)
    User.create!(
      name: prefix.capitalize,
      email: "#{prefix}-#{SecureRandom.hex(4)}@example.com",
      password: "password1",
      avatar_key: "avatar-1"
    )
  end
end
