class CompletionPost < ApplicationRecord
  belongs_to :user
  belongs_to :task
  has_many :comments, dependent: :destroy
  has_many :completion_post_likes, dependent: :destroy

  enum :status, {
    doing: "doing",
    completed: "completed"
  }, default: :doing

  validates :status, presence: true
  validates :task_id, uniqueness: true

  after_create_commit -> { ::FeedUpdatesBroadcaster.post_created(self) }
  after_update_commit -> { ::FeedUpdatesBroadcaster.post_updated(self) }, if: :saved_change_to_status?
  after_destroy_commit -> { ::FeedUpdatesBroadcaster.post_deleted(id) }

  def status_label
    completed? ? "できた" : "やります"
  end

  def card_variant
    completed? ? "completed" : "doing"
  end
end
