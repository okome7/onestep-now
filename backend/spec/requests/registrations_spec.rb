require 'rails_helper'

RSpec.describe "Registrations", type: :request do
  describe "POST /signup" do
    let(:valid_attributes) do
      {
        user: {
          name: "Test User",
          email: "rspec_test@example.com",
          password: "password1",
          password_confirmation: "password1",
          avatar_key: "avatar-5"
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
        expect(json_response["data"]["avatar_key"]).to eq("avatar-5")
        expect(User.last.avatar_key).to eq("avatar-5")

        # password_digestが含まれていないことを検証
        expect(json_response["data"]).not_to have_key("password_digest")
      end

      it "emailを正規化して保存すること" do
        valid_attributes[:user][:email] = " RSpec_Test@Example.COM "

        post "/signup", params: valid_attributes, as: :json

        expect(response).to have_http_status(:created)

        json_response = JSON.parse(response.body)
        expect(json_response["data"]["email"]).to eq("rspec_test@example.com")
        expect(User.last.email).to eq("rspec_test@example.com")
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

      it "大文字小文字が異なる同じemailではユーザーを重複作成しないこと" do
        User.create!(
          name: "Existing User",
          email: "rspec_test@example.com",
          password: "password1",
          password_confirmation: "password1"
        )

        valid_attributes[:user][:email] = "RSPEC_TEST@example.com"

        expect {
          post "/signup", params: valid_attributes, as: :json
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_entity)

        json_response = JSON.parse(response.body)
        expect(json_response["status"]).to eq("error")
        expect(json_response["errors"]).to be_present
      end

      it "パスワードが英数字以外の場合はユーザーを作成しないこと" do
        valid_attributes[:user][:password] = "パスワード123"
        valid_attributes[:user][:password_confirmation] = "パスワード123"

        expect {
          post "/signup", params: valid_attributes, as: :json
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_entity)

        json_response = JSON.parse(response.body)
        expect(json_response["status"]).to eq("error")
        expect(json_response["errors"]).to include("Password は英字と数字を両方含めてください")
      end

      it "パスワードが英字だけの場合はユーザーを作成しないこと" do
        valid_attributes[:user][:password] = "password"
        valid_attributes[:user][:password_confirmation] = "password"

        expect {
          post "/signup", params: valid_attributes, as: :json
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_entity)

        json_response = JSON.parse(response.body)
        expect(json_response["status"]).to eq("error")
        expect(json_response["errors"]).to include("Password は英字と数字を両方含めてください")
      end

      it "パスワードが数字だけの場合はユーザーを作成しないこと" do
        valid_attributes[:user][:password] = "12345678"
        valid_attributes[:user][:password_confirmation] = "12345678"

        expect {
          post "/signup", params: valid_attributes, as: :json
        }.not_to change(User, :count)

        expect(response).to have_http_status(:unprocessable_entity)

        json_response = JSON.parse(response.body)
        expect(json_response["status"]).to eq("error")
        expect(json_response["errors"]).to include("Password は英字と数字を両方含めてください")
      end
    end
  end
end
