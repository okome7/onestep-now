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
      log_broadcast_error("post_deleted", error)
    end

    def like_created(like)
      broadcast_event(
        type: "like_created",
        post_id: like.completion_post_id,
        user_id: like.user_id,
        likes_count: like_count(like.completion_post_id)
      )
    end

    def like_deleted(like)
      broadcast_event(
        type: "like_deleted",
        post_id: like.completion_post_id,
        user_id: like.user_id,
        likes_count: like_count(like.completion_post_id)
      )
    end

    def comment_created(comment)
      loaded_comment = Comment.preload(:user).find(comment.id)
      completed_count = CompletionPost.completed.where(user_id: loaded_comment.user_id).count

      broadcast_event(
        type: "comment_created",
        post_id: loaded_comment.completion_post_id,
        user_id: loaded_comment.user_id,
        comments_count: Comment.where(completion_post_id: loaded_comment.completion_post_id).count,
        comment: CommentPayload.new(loaded_comment, completed_count: completed_count).as_json
      )
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
      log_broadcast_error(type, error)
    end

    def like_count(post_id)
      CompletionPostLike.where(completion_post_id: post_id).count
    end

    def broadcast_event(payload)
      type = payload.fetch(:type)
      ActionCable.server.broadcast(
        STREAM_NAME,
        payload.merge(occurred_at: Time.current.iso8601(6))
      )
    rescue StandardError => error
      log_broadcast_error(type, error)
    end

    def log_broadcast_error(type, error)
      Rails.logger.error("Feed #{type} broadcast failed: #{error.class}: #{error.message}")
    end
  end
end
