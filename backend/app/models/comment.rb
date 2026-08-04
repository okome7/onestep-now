class Comment < ApplicationRecord
  belongs_to :user
  belongs_to :completion_post

  enum :post_status_when_commented, {
    doing: "doing",
    completed: "completed"
  }, prefix: :post_was

  before_validation :capture_post_status, on: :create

  validates :body, presence: true
  validates :post_status_when_commented, presence: true

  after_create_commit -> { ::FeedUpdatesBroadcaster.comment_created(self) }

  private

  def capture_post_status
    self.post_status_when_commented ||= completion_post&.status
  end
end
