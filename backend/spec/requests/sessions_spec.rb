require 'rails_helper'

RSpec.describe "Sessions", type: :request do
  describe "GET /session" do
    it "未ログイン時はエラーにせず未認証状態を返すこと" do
      get "/session", as: :json

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq("status" => "success", "data" => nil)
    end

    it "アカウントごとの初回説明確認日時を返すこと" do
      seen_at = Time.zone.local(2026, 9, 19, 10, 0, 0)
      confirmed_user = User.create!(
        name: "Confirmed User",
        email: "confirmed@example.com",
        password: "password1",
        password_confirmation: "password1",
        feed_intro_seen_at: seen_at
      )
      unconfirmed_user = User.create!(
        name: "Unconfirmed User",
        email: "unconfirmed@example.com",
        password: "password1",
        password_confirmation: "password1"
      )

      get "/session", headers: authenticated_headers(confirmed_user), as: :json
      expect(JSON.parse(response.body).dig("data", "feed_intro_seen_at")).to eq(seen_at.iso8601(3))

      get "/session", headers: authenticated_headers(unconfirmed_user), as: :json
      expect(JSON.parse(response.body).dig("data", "feed_intro_seen_at")).to be_nil

      expect(confirmed_user.reload.feed_intro_seen_at).to eq(seen_at)
      expect(unconfirmed_user.reload.feed_intro_seen_at).to be_nil
    end
  end

  describe "POST /login" do
    before do
      @login_user = User.create!(
        name: "Login User",
        email: "login@example.com",
        password: "password1",
        password_confirmation: "password1"
      )
    end

    it "正しいメールアドレスとパスワードでログインできること" do
      seen_at = Time.zone.local(2026, 9, 19, 10, 0, 0)
      @login_user.update!(feed_intro_seen_at: seen_at)
      post "/login", params: {
        user: {
          email: " LOGIN@example.com ",
          password: "password1"
        }
      }, headers: frontend_headers, as: :json

      expect(response).to have_http_status(:ok)

      json_response = JSON.parse(response.body)
      expect(json_response["status"]).to eq("success")
      expect(json_response["data"]).to include(
        "name" => "Login User",
        "email" => "login@example.com",
        "feed_intro_seen_at" => seen_at.iso8601(3)
      )
      expect(json_response["data"]).not_to have_key("password_digest")
    end

    it "メールアドレスまたはパスワードが違う場合はエラーを返すこと" do
      post "/login", params: {
        user: {
          email: "login@example.com",
          password: "wrongpass1"
        }
      }, headers: frontend_headers, as: :json

      expect(response).to have_http_status(:unauthorized)

      json_response = JSON.parse(response.body)
      expect(json_response["status"]).to eq("error")
      expect(json_response["errors"]).to include("メールアドレスまたはパスワードが違います")
    end
  end
end
