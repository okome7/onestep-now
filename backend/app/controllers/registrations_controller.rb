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

  def destroy
    user = account_user

    if user
      user.destroy!
      render json: { status: "success" }, status: :ok
    else
      render json: { status: "error", errors: [ "アカウントが見つかりません" ] }, status: :not_found
    end
  end

  private

  def account_user
    id = account_params[:id]
    email = account_params[:email].to_s.strip.downcase

    return User.find_by(id: id, email: email) if id.present? && email.present?
    return User.find_by(id: id) if id.present?
    return User.find_by(email: email) if email.present?

    nil
  end

  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation, :avatar_key)
  end

  def email_check_params
    params.require(:user).permit(:email)
  end

  def account_params
    params.require(:user).permit(:id, :email)
  end
end
