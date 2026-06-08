class User < ApplicationRecord
  has_secure_password

  has_many :tasks, dependent: :destroy

  before_validation :normalize_email

  validates :name, presence: true
  validates :avatar_key, presence: true
  validates :avatar_image, length: { maximum: 2.megabytes }, allow_blank: true
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

  private

  def normalize_email
    self.email = email.to_s.strip.downcase if email.present?
  end
end
