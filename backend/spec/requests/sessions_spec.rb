require 'rails_helper'

RSpec.describe "Sessions", type: :request do
  describe "POST /login" do
    let!(:user) do
      User.create!(
        name: "Login User",
        email: "login_user@example.com",
        password: "password1",
        password_confirmation: "password1",
        avatar_key: "avatar-2"
      )
    end

    it "正しいメールアドレスとパスワードでログインできること" do
      post "/login", params: {
        user: {
          email: " LOGIN_USER@Example.COM ",
          password: "password1"
        }
      }, as: :json

      expect(response).to have_http_status(:ok)

      json_response = JSON.parse(response.body)
      expect(json_response["status"]).to eq("success")
      expect(json_response["data"]["email"]).to eq(user.email)
      expect(json_response["data"]["avatar_key"]).to eq("avatar-2")
      expect(json_response["data"]).not_to have_key("password_digest")
    end

    it "認証情報が違う場合はエラーを返すこと" do
      post "/login", params: {
        user: {
          email: user.email,
          password: "wrongpass1"
        }
      }, as: :json

      expect(response).to have_http_status(:unauthorized)

      json_response = JSON.parse(response.body)
      expect(json_response["status"]).to eq("error")
      expect(json_response["errors"]).to include("メールアドレスまたはパスワードが正しくありません。")
    end
  end
end
