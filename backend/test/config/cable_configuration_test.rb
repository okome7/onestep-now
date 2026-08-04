require "test_helper"
require "erb"
require "yaml"

class CableConfigurationTest < ActiveSupport::TestCase
  setup do
    cable_yml = ERB.new(Rails.root.join("config/cable.yml").read).result
    @configuration = YAML.safe_load(cable_yml)
  end

  test "各環境が意図したAction Cableアダプターを使用する" do
    assert_equal "async", @configuration.dig("development", "adapter")
    assert_equal "test", @configuration.dig("test", "adapter")
    assert_equal "solid_cable", @configuration.dig("staging", "adapter")
    assert_equal "solid_cable", @configuration.dig("production", "adapter")
  end

  test "Redisアダプターを使用しない" do
    adapters = @configuration.values.filter_map { |config| config["adapter"] }

    assert_not_includes adapters, "redis"
  end

  test "Solid Cableテーブルが主DBに存在する" do
    assert ActiveRecord::Base.connection.data_source_exists?("solid_cable_messages")
  end
end
