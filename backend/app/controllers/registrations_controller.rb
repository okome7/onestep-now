class RegistrationsController < ApplicationController
  def create
    user = User.new(user_params)
    if user.save
      render json: {
        status: "success",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_key: user.avatar_key,
          avatar_image: user.avatar_image
        }
      }, status: :created
    else
      render json: { status: "error", errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation, :avatar_key, :avatar_image)
  end
end
