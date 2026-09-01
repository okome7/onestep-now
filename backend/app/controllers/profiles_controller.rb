class ProfilesController < ApplicationController
  def update
    if current_user.update(profile_params)
      render json: {
        status: "success",
        data: user_payload(current_user.reload)
      }, status: :ok
    else
      render json: {
        status: "error",
        errors: current_user.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  private

  def profile_params
    params.require(:user).permit(:name, :avatar_key)
  end
end
