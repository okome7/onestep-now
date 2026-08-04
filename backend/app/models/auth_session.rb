class AuthSession < ApplicationRecord
  LIFETIME = 7.days

  belongs_to :user

  validates :token_digest, :csrf_token_digest, :expires_at, presence: true
  validates :token_digest, uniqueness: true

  scope :active, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  def self.issue_for(user)
    token = SecureRandom.urlsafe_base64(32)
    csrf_token = SecureRandom.urlsafe_base64(32)
    auth_session = create!(
      user: user,
      token_digest: digest(token),
      csrf_token_digest: digest(csrf_token),
      expires_at: LIFETIME.from_now
    )

    [ auth_session, token, csrf_token ]
  end

  def self.authenticate(token)
    return if token.blank?

    active.eager_load(:user).find_by(token_digest: digest(token))
  end

  def self.digest(value)
    Digest::SHA256.hexdigest(value.to_s)
  end

  def active?
    revoked_at.nil? && expires_at.future?
  end

  def valid_csrf_token?(token)
    return false if token.blank?

    ActiveSupport::SecurityUtils.secure_compare(
      csrf_token_digest,
      self.class.digest(token)
    )
  end

  def revoke!
    update!(revoked_at: Time.current) unless revoked_at?
  end
end
