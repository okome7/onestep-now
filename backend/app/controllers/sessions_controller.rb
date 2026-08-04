class SessionsController < ApplicationController
  skip_before_action :authenticate_user!, only: [ :create, :show ]
  skip_before_action :verify_csrf_token!, only: :create

  def create
    user = User.find_by_email(session_params[:email])

    if user&.authenticate(session_params[:password])
      start_authenticated_session!(user)
      render json: {
        status: "success",
        data: user_payload(user)
      }, status: :ok
    else
      render json: {
        status: "error",
        errors: [ "メールアドレスまたはパスワードが違います" ]
      }, status: :unauthorized
    end
  end

  def show
    data = current_user ? user_payload(current_user) : nil
    render json: { status: "success", data: data }, status: :ok
  end

  def destroy
    user = current_user
    end_authenticated_session!
    ActionCable.server.remote_connections.where(current_user: user).disconnect
    render json: { status: "success" }, status: :ok
  end

  private

  def session_params
    params.require(:user).permit(:email, :password)
  end
end
