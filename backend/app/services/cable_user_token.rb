class CableUserToken
  PURPOSE = "cable_user"
  EXPIRES_IN = 5.minutes

  class << self
    def issue(auth_session)
      verifier.generate(auth_session.id, expires_in: EXPIRES_IN, purpose: PURPOSE)
    end

    def user_for(token)
      auth_session_id = verifier.verified(token.to_s, purpose: PURPOSE)
      AuthSession.active.find_by(id: auth_session_id)&.user if auth_session_id
    end

    private

    def verifier
      Rails.application.message_verifier(PURPOSE)
    end
  end
end
