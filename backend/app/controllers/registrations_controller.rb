class RegistrationsController < ApplicationController
  skip_before_action :authenticate_user!, only: [ :email_check, :create ]
  skip_before_action :verify_csrf_token!, only: [ :email_check, :create ]

  def email_check
    user = User.new(email: email_check_params[:email])
    user.validate
    email_errors = user.errors.full_messages_for(:email)

    if email_errors.empty?
      render json: { status: "success" }, status: :ok
    else
      render json: { status: "error", errors: email_errors }, status: :unprocessable_entity
    end
  end

  def create
    user = User.new(user_params)
    if user.save
      start_authenticated_session!(user)
      render json: {
        status: "success",
        data: user_payload(user)
      }, status: :created
    else
      render json: { status: "error", errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    user = current_user
    end_authenticated_session!
    ActionCable.server.remote_connections.where(current_user: user).disconnect
    user.destroy!
    render json: { status: "success" }, status: :ok
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation, :avatar_key)
  end

  def email_check_params
    params.require(:user).permit(:email)
  end
end
