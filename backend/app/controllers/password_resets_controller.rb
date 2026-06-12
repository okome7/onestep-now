class PasswordResetsController < ApplicationController
  SUCCESS_MESSAGE = "登録されているメールアドレスの場合、再設定用コードを送信しました"
  VERIFIED_MESSAGE = "認証コードを確認しました"
  RESET_MESSAGE = "パスワードを再設定しました"
  RATE_LIMIT_MESSAGE = "しばらく時間をおいてから再度お試しください"
  INVALID_CODE_MESSAGE = "認証コードが正しくないか、有効期限が切れています"

  def create
    email = normalized_email
    return render_email_error if email.blank? || invalid_email?(email)

    if PasswordResetCode.cooldown_active?(email)
      render json: { status: "error", errors: [ RATE_LIMIT_MESSAGE ] }, status: :too_many_requests
      return
    end

    user = User.find_by(email: email)
    _record, code = PasswordResetCode.issue_for(email: email, user: user)
    PasswordResetMailer.with(email: email, code: code).reset_code.deliver_now if user

    render json: { status: "success", message: SUCCESS_MESSAGE }, status: :ok
  end

  def verify
    reset_code = find_verified_code
    return render_invalid_code unless reset_code

    render json: { status: "success", message: VERIFIED_MESSAGE }, status: :ok
  end

  def update
    reset_code = find_verified_code
    return render_invalid_code unless reset_code

    user = reset_code.user
    return render_invalid_code unless user

    if user.update(password_params)
      reset_code.mark_used!
      render json: { status: "success", message: RESET_MESSAGE }, status: :ok
    else
      render json: { status: "error", errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def find_verified_code
    reset_code = PasswordResetCode.latest_active_for(normalized_email)
    return unless reset_code&.user
    return unless reset_code&.authenticate_code(reset_params[:code])

    reset_code
  end

  def reset_params
    params.require(:user).permit(:email, :code, :password, :password_confirmation)
  end

  def password_params
    reset_params.permit(:password, :password_confirmation)
  end

  def normalized_email
    PasswordResetCode.normalize(reset_params[:email])
  end

  def invalid_email?(email)
    URI::MailTo::EMAIL_REGEXP.match?(email) == false
  end

  def render_email_error
    render json: { status: "error", errors: [ "メールアドレスを入力してください" ] }, status: :unprocessable_entity
  end

  def render_invalid_code
    render json: { status: "error", errors: [ INVALID_CODE_MESSAGE ] }, status: :unprocessable_entity
  end
end
