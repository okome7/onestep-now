class RegistrationsController < ApplicationController
  # skip_before_action :verify_authenticity_token # APIとして使うために必要

  def create
    user = User.new(user_params)
    if user.save
      render json: { status: "success", data: user }, status: :created
    else
      render json: { status: "error", errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation)
  end
end
