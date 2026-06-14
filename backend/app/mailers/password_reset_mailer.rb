class PasswordResetMailer < ApplicationMailer
  def reset_code
    @code = params[:code]

    mail(
      to: params[:email],
      subject: "パスワード再設定コード"
    )
  end
end
