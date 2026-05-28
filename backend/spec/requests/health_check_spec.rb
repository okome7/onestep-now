require 'rails_helper'

RSpec.describe "HealthCheck", type: :request do
  describe "GET /up" do
    it "returns http success" do
      get rails_health_check_path 
      expect(response).to have_http_status(:success)
    end
  end
end
