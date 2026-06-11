class RegistrationsController < ApplicationController
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
      render json: {
        status: "success",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_key: user.avatar_key
        }
      }, status: :created
    else
      render json: { status: "error", errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation, :avatar_key)
  end

  def email_check_params
    params.require(:user).permit(:email)
  end
end
