class CompletionPostLike < ApplicationRecord
  belongs_to :user
  belongs_to :completion_post

  validates :user_id, uniqueness: { scope: :completion_post_id }
end
