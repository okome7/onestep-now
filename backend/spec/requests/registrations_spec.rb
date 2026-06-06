require 'rails_helper'

RSpec.describe "Registrations", type: :request do
  describe "POST /signup" do
    let(:valid_attributes) do
      {
        user: {
          name: "Test User",
          email: "rspec_test@example.com",
          password: "password",
          password_confirmation: "password"
        }
      }
    end

    let(:invalid_attributes) do
      {
        user: {
          name: "",
          email: "bad_email",
          password: "foo",
          password_confirmation: "bar"
        }
      }
    end

    context "有効なパラメータの場合" do
      it "ユーザーが作成され、201ステータスと安全なデータが返ること" do
        expect {
          post "/signup", params: valid_attributes, as: :json
        }.to change(User, :count).by(1)

        expect(response).to have_http_status(:created)
        
        json_response = JSON.parse(response.body)
        expect(json_response["status"]).to eq("success")
        expect(json_response["data"]).to have_key("id")
        expect(json_response["data"]["name"]).to eq("Test User")
        expect(json_response["data"]["email"]).to eq("rspec_test@example.com")
        
        # password_digestが含まれていないことを検証
        expect(json_response["data"]).not_to have_key("password_digest")
      end
    end

    context "無効なパラメータの場合" do
      it "ユーザーは作成されず、422ステータスとエラーメッセージが返ること" do
        expect {
          post "/signup", params: invalid_attributes, as: :json
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_entity)
        
        json_response = JSON.parse(response.body)
        expect(json_response["status"]).to eq("error")
        expect(json_response["errors"]).to be_present
      end
    end
  end
end
