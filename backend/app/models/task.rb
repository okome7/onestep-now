class Task < ApplicationRecord
  belongs_to :user

  enum :status, {
    pending: "pending",
    active: "active",
    completed: "completed"
  }, default: :pending

  before_validation :normalize_title

  validates :title, presence: true
  validates :status, presence: true
  validate :only_one_active_task_per_user, if: :active?

  private

  def normalize_title
    self.title = title.to_s.strip if title.present?
  end

  def only_one_active_task_per_user
    return if user.blank?

    active_tasks = user.tasks.active
    active_tasks = active_tasks.where.not(id:) if persisted?

    errors.add(:status, "allows only one active task per user") if active_tasks.exists?
  end
end
