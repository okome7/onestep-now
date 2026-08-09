require "rails_helper"

RSpec.describe "Profiles", type: :request do
  let!(:user) do
    User.create!(name: "Before", email: "profile@example.com", password: "password1", password_confirmation: "password1", avatar_key: "avatar-1")
  end
  let!(:other_user) do
    User.create!(name: "Other", email: "other@example.com", password: "password1", password_confirmation: "password1", avatar_key: "avatar-2")
  end

  it "名前とアイコンをDBへ保存し、再取得しても最新情報を返すこと" do
    patch "/api/profile", params: { user: { name: "After", avatar_key: "avatar-5" } }, headers: authenticated_headers(user), as: :json

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["data"]).to include("id" => user.id, "name" => "After", "avatar_key" => "avatar-5")
    expect(user.reload).to have_attributes(name: "After", avatar_key: "avatar-5")
    expect(other_user.reload).to have_attributes(name: "Other", avatar_key: "avatar-2")

    get "/session", as: :json
    expect(JSON.parse(response.body)["data"]).to include("name" => "After", "avatar_key" => "avatar-5")
  end

  it "名前またはアイコンだけを個別に更新できること" do
    headers = authenticated_headers(user)
    patch "/api/profile", params: { user: { name: "Renamed" } }, headers: headers, as: :json
    expect(user.reload).to have_attributes(name: "Renamed", avatar_key: "avatar-1")

    patch "/api/profile", params: { user: { avatar_key: "avatar-8" } }, headers: headers, as: :json
    expect(user.reload).to have_attributes(name: "Renamed", avatar_key: "avatar-8")
  end

  it "未ログインでは更新できないこと" do
    patch "/api/profile", params: { user: { name: "Blocked" } }, headers: frontend_headers, as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(user.reload.name).to eq("Before")
  end
end
