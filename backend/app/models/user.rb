class User < ApplicationRecord
  has_secure_password

  has_many :tasks, dependent: :destroy

  before_validation :normalize_email

  validates :name, presence: true
  validates :email,
    presence: true,
    uniqueness: { case_sensitive: false },
    format: { with: URI::MailTo::EMAIL_REGEXP }

  private

  def normalize_email
    self.email = email.to_s.strip.downcase if email.present?
  end
end
