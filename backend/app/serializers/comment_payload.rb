class CommentPayload
  def initialize(comment, completed_count:)
    @comment = comment
    @completed_count = completed_count
  end

  def as_json
    {
      id: comment.id,
      user_id: comment.user_id,
      user_name: comment.user.name,
      level: LevelProgress.new(completed_count).level,
      avatar_key: comment.user.avatar_key,
      completion_post_id: comment.completion_post_id,
      body: comment.body,
      post_status_when_commented: comment.post_status_when_commented,
      created_at: comment.created_at,
      updated_at: comment.updated_at
    }
  end

  private

  attr_reader :comment, :completed_count
end
