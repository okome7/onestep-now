module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = CableUserToken.user_for(request.params[:token])
      reject_unauthorized_connection unless current_user
    end
  end
end
