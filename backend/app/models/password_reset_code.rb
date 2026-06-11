class PasswordResetCode < ApplicationRecord
  CODE_TTL = 10.minutes
  SEND_COOLDOWN = 60.seconds

  belongs_to :user, optional: true

  before_validation :normalize_email

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :code_digest, presence: true
  validates :expires_at, presence: true

  scope :active, -> { where(used_at: nil).where("expires_at > ?", Time.current) }

  def self.issue_for(email:, user:)
    code = SecureRandom.random_number(1_000_000).to_s.rjust(6, "0")
    record = create!(
      email: email,
      user: user,
      code_digest: BCrypt::Password.create(code),
      expires_at: CODE_TTL.from_now
    )

    [ record, code ]
  end

  def self.cooldown_active?(email)
    where(email: normalize(email)).where("created_at > ?", SEND_COOLDOWN.ago).exists?
  end

  def self.latest_active_for(email)
    active.where(email: normalize(email)).order(created_at: :desc).first
  end

  def authenticate_code(code)
    return false if used? || expired?

    BCrypt::Password.new(code_digest).is_password?(code.to_s)
  rescue BCrypt::Errors::InvalidHash
    false
  end

  def expired?
    expires_at <= Time.current
  end

  def used?
    used_at.present?
  end

  def mark_used!
    update!(used_at: Time.current)
  end

  def self.normalize(email)
    email.to_s.strip.downcase
  end

  private

  def normalize_email
    self.email = self.class.normalize(email)
  end
end
