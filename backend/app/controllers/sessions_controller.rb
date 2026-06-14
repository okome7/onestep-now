class SessionsController < ApplicationController
  def create
    user = User.find_by(email: session_params[:email].to_s.strip.downcase)

    if user&.authenticate(session_params[:password])
      render json: {
        status: "success",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_key: user.avatar_key
        }
      }, status: :ok
    else
      render json: {
        status: "error",
        errors: [ "メールアドレスまたはパスワードが違います" ]
      }, status: :unauthorized
    end
  end

  private

  def session_params
    params.require(:user).permit(:email, :password)
  end
end
