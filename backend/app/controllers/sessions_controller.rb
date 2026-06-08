class SessionsController < ApplicationController
  def create
    user = User.find_by(email: login_params[:email].to_s.strip.downcase)

    if user&.authenticate(login_params[:password])
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
        errors: [ "メールアドレスまたはパスワードが正しくありません。" ]
      }, status: :unauthorized
    end
  end

  private

  def login_params
    params.require(:user).permit(:email, :password)
  end
end
