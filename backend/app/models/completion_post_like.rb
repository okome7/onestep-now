class CompletionPostLike < ApplicationRecord
  belongs_to :user
  belongs_to :completion_post

  validates :user_id, uniqueness: { scope: :completion_post_id }

  after_create_commit -> { ::FeedUpdatesBroadcaster.like_created(self) }
  after_destroy_commit -> { ::FeedUpdatesBroadcaster.like_deleted(self) }, unless: :destroyed_with_post?

  private

  def destroyed_with_post?
    destroyed_by_association&.active_record == CompletionPost
  end
end
