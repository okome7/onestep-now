class CableUserToken
  PURPOSE = "cable_user"
  EXPIRES_IN = 24.hours

  class << self
    def issue(user)
      verifier.generate(user.id, expires_in: EXPIRES_IN, purpose: PURPOSE)
    end

    def user_for(token)
      user_id = verifier.verified(token.to_s, purpose: PURPOSE)
      User.find_by(id: user_id) if user_id
    end

    private

    def verifier
      Rails.application.message_verifier(PURPOSE)
    end
  end
end
