require 'rails_helper'

RSpec.describe "HealthCheck", type: :request do
  describe "GET /up" do
    it "returns http success" do
      get rails_health_check_path
      expect(response).to have_http_status(:success)
    end

    it "allows the configured frontend origin" do
      get rails_health_check_path, headers: { "Origin" => "http://localhost:5173" }

      expect(response.headers["Access-Control-Allow-Origin"]).to eq("http://localhost:5173")
      expect(response.headers["Access-Control-Allow-Credentials"]).to be_nil
    end

    it "does not allow arbitrary Vercel preview origins" do
      get rails_health_check_path, headers: { "Origin" => "https://example.vercel.app" }

      expect(response.headers["Access-Control-Allow-Origin"]).to be_nil
    end
  end
end
