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
          avatar_key: user.avatar_key,
          cable_token: CableUserToken.issue(user)
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
    elsif legacy_profile_candidates.many?
      render json: { status: "error", errors: [ "アカウントを特定できませんでした。もう一度ログインしてから削除してください。" ] }, status: :conflict
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
    return User.find_by_email(email) if email.present?
    return legacy_profile_candidates.first if legacy_profile_candidates.one?

    nil
  end

  def legacy_profile_candidates
    @legacy_profile_candidates ||= begin
      name = account_params[:name].to_s.strip
      avatar_key = account_params[:avatar_key].to_s

      if name.present? && avatar_key.present?
        User.where(name: name, avatar_key: avatar_key).limit(2).to_a
      else
        []
      end
    end
  end

  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation, :avatar_key)
  end

  def email_check_params
    params.require(:user).permit(:email)
  end

  def account_params
    params.require(:user).permit(:id, :email, :name, :avatar_key)
  end
end
