require 'rails_helper'

RSpec.describe "PasswordResets", type: :request do
  let!(:user) do
    User.create!(
      name: "Reset User",
      email: "reset@example.com",
      password: "password1",
      password_confirmation: "password1",
      avatar_key: "avatar-1"
    )
  end

  before do
    ActionMailer::Base.deliveries.clear
    allow(SecureRandom).to receive(:random_number).and_return(123456)
  end

  def request_code(email = user.email)
    post "/password_reset", params: {
      user: {
        email: email
      }
    }, as: :json
  end

  def delivered_code
    "123456"
  end

  describe "POST /password_reset" do
    it "登録済みメールアドレスに認証コードを送信し、コードはハッシュで保存すること" do
      request_code

      expect(response).to have_http_status(:ok)

      json_response = JSON.parse(response.body)
      expect(json_response["message"]).to eq("登録されているメールアドレスの場合、再設定用コードを送信しました")
      expect(ActionMailer::Base.deliveries.size).to eq(1)
      expect(ActionMailer::Base.deliveries.last.text_part.body.decoded).to include("123456")

      code = delivered_code
      reset_code = PasswordResetCode.last
      expect(reset_code.email).to eq("reset@example.com")
      expect(reset_code.user).to eq(user)
      expect(reset_code.code_digest).not_to eq(code)
      expect(reset_code.authenticate_code(code)).to be(true)
      expect(reset_code.expires_at).to be_within(5.seconds).of(10.minutes.from_now)
    end

    it "存在しないメールアドレスでも同じ成功メッセージを返すこと" do
      request_code("missing@example.com")

      expect(response).to have_http_status(:ok)

      json_response = JSON.parse(response.body)
      expect(json_response["message"]).to eq("登録されているメールアドレスの場合、再設定用コードを送信しました")
      expect(ActionMailer::Base.deliveries).to be_empty
    end

    it "短時間に何度も送信できないこと" do
      request_code
      request_code

      expect(response).to have_http_status(:too_many_requests)

      json_response = JSON.parse(response.body)
      expect(json_response["errors"]).to include("しばらく時間をおいてから再度お試しください")
    end
  end

  describe "POST /password_reset/verify" do
    it "正しい認証コードを確認できること" do
      request_code
      code = delivered_code

      post "/password_reset/verify", params: {
        user: {
          email: " RESET@example.com ",
          code: code
        }
      }, as: :json

      expect(response).to have_http_status(:ok)

      json_response = JSON.parse(response.body)
      expect(json_response["message"]).to eq("認証コードを確認しました")
    end

    it "誤った認証コードは拒否すること" do
      request_code

      post "/password_reset/verify", params: {
        user: {
          email: user.email,
          code: "000000"
        }
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)

      json_response = JSON.parse(response.body)
      expect(json_response["errors"]).to include("認証コードが正しくないか、有効期限が切れています")
    end

    it "存在しないメールアドレスの認証コード確認は成功させないこと" do
      request_code("missing@example.com")

      post "/password_reset/verify", params: {
        user: {
          email: "missing@example.com",
          code: delivered_code
        }
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /password_reset" do
    it "正しい認証コードでパスワードを再設定し、使用済みコードを再利用できないこと" do
      request_code
      code = delivered_code

      patch "/password_reset", params: {
        user: {
          email: user.email,
          code: code,
          password: "newpass1",
          password_confirmation: "newpass1"
        }
      }, as: :json

      expect(response).to have_http_status(:ok)

      user.reload
      expect(user.authenticate("newpass1")).to be_truthy
      expect(user.authenticate("password1")).to be(false)
      expect(PasswordResetCode.last.used_at).to be_present

      patch "/password_reset", params: {
        user: {
          email: user.email,
          code: code,
          password: "otherpass1",
          password_confirmation: "otherpass1"
        }
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "新しいパスワードは既存ルールでバリデーションすること" do
      request_code
      code = delivered_code

      patch "/password_reset", params: {
        user: {
          email: user.email,
          code: code,
          password: "password",
          password_confirmation: "password"
        }
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)

      json_response = JSON.parse(response.body)
      expect(json_response["errors"]).to include("Password は英字と数字を両方含めてください")
      expect(PasswordResetCode.last.used_at).to be_nil
    end

    it "有効期限切れの認証コードは拒否すること" do
      request_code
      code = delivered_code
      PasswordResetCode.last.update!(expires_at: 1.minute.ago)

      patch "/password_reset", params: {
        user: {
          email: user.email,
          code: code,
          password: "newpass1",
          password_confirmation: "newpass1"
        }
      }, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
