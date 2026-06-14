require 'rails_helper'

RSpec.describe "Sessions", type: :request do
  describe "POST /login" do
    before do
      User.create!(
        name: "Login User",
        email: "login@example.com",
        password: "password1",
        password_confirmation: "password1"
      )
    end

    it "正しいメールアドレスとパスワードでログインできること" do
      post "/login", params: {
        user: {
          email: " LOGIN@example.com ",
          password: "password1"
        }
      }, as: :json

      expect(response).to have_http_status(:ok)

      json_response = JSON.parse(response.body)
      expect(json_response["status"]).to eq("success")
      expect(json_response["data"]).to include(
        "name" => "Login User",
        "email" => "login@example.com"
      )
      expect(json_response["data"]).not_to have_key("password_digest")
    end

    it "メールアドレスまたはパスワードが違う場合はエラーを返すこと" do
      post "/login", params: {
        user: {
          email: "login@example.com",
          password: "wrongpass1"
        }
      }, as: :json

      expect(response).to have_http_status(:unauthorized)

      json_response = JSON.parse(response.body)
      expect(json_response["status"]).to eq("error")
      expect(json_response["errors"]).to include("メールアドレスまたはパスワードが違います")
    end
  end
end
