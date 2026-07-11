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

  def status_label
    completed? ? "できた" : "やります"
  end

  def card_variant
    completed? ? "completed" : "doing"
  end
end
