class FeedUpdatesBroadcaster
  STREAM_NAME = "feed_updates"

  class << self
    def post_created(post)
      broadcast_post("post_created", post)
    end

    def post_updated(post)
      broadcast_post("post_updated", post)
    end

    def post_deleted(post_id)
      ActionCable.server.broadcast(
        STREAM_NAME,
        {
          type: "post_deleted",
          post_id: post_id
        }
      )
    rescue StandardError => error
      Rails.logger.error("Feed post_deleted broadcast failed: #{error.class}: #{error.message}")
    end

    private

    def broadcast_post(type, post)
      loaded_post = CompletionPost
        .preload(:task, :user, :completion_post_likes)
        .find(post.id)

      ActionCable.server.broadcast(
        STREAM_NAME,
        {
          type: type,
          post: FeedPostPayload.new(loaded_post, include_user_id: true).as_json
        }
      )
    rescue StandardError => error
      Rails.logger.error("Feed #{type} broadcast failed: #{error.class}: #{error.message}")
    end
  end
end
