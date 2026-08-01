class User < ApplicationRecord
  has_secure_password

  has_many :tasks, dependent: :destroy
  has_many :completion_posts, dependent: :destroy
  has_many :comments, dependent: :destroy
  has_many :completion_post_likes, dependent: :destroy
  has_many :password_reset_codes, dependent: :destroy

  before_validation :normalize_email

  validates :name, presence: true
  validates :avatar_key, presence: true
  validates :email,
    presence: true,
    uniqueness: { case_sensitive: false },
    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password,
    length: { minimum: 8 },
    format: {
      with: /\A(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]+\z/,
      message: "は英字と数字を両方含めてください"
    },
    allow_blank: true

  def self.find_by_email(email)
    find_by("LOWER(email) = ?", email.to_s.strip.downcase)
  end

  private

  def normalize_email
    self.email = email.to_s.strip.downcase if email.present?
  end
end
