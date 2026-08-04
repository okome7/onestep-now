require "test_helper"
require Rails.root.join("config/allowed_hosts").to_s

class AllowedHostsTest < ActiveSupport::TestCase
  test "本番構成で必要なRenderとVercelのHostだけを既定で許可する" do
    assert_equal [
      "onestep-now.onrender.com",
      "onestep-now-frontend.vercel.app"
    ], AllowedHosts.from(nil)
  end

  test "ALLOWED_HOSTSをカンマ区切りで設定できる" do
    hosts = AllowedHosts.from(" api.example.com,frontend.example.com,api.example.com ")

    assert_equal [ "api.example.com", "frontend.example.com" ], hosts
  end

  test "許可したHostは通し不正なHostは拒否する" do
    app = ->(_env) { [ 200, { "Content-Type" => "text/plain" }, [ "OK" ] ] }
    middleware = ActionDispatch::HostAuthorization.new(app, AllowedHosts.from(nil))
    request = Rack::MockRequest.new(middleware)

    assert_equal 200, request.get("/session", "HTTP_HOST" => "onestep-now.onrender.com").status
    assert_equal 200, request.get("/session", "HTTP_HOST" => "onestep-now-frontend.vercel.app").status
    assert_equal 403, request.get("/session", "HTTP_HOST" => "attacker.example.com").status
  end
end
