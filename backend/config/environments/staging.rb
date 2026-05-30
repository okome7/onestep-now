require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false

  # 1. ログを強制的に標準出力へ（これでようやく本当のエラーが見えるはずです）
  config.logger = ActiveSupport::Logger.new(STDOUT)
  config.log_level = :debug

  # 2. Solid系（DBを使う新機能）をこの環境では「完全オフ」にする
  # Rails 8が裏側でDBを探しに行くのを確実に止めます
  config.cache_store = :null_store  # キャッシュを使わない
  config.active_job.queue_adapter = :inline # キューをDBに入れず即時実行する

  # 3. ホスト許可
  config.hosts.clear # 一旦すべてのホストを許可してエラーを回避

  config.i18n.fallbacks = true
  config.active_record.dump_schema_after_migration = false
end
