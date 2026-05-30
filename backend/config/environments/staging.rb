require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false

  # 1. ログを標準出力に流す（Renderでエラーを見るために必須）
  config.log_tags = [ :request_id ]
  config.logger = ActiveSupport::Logger.new(STDOUT)
    .tap  { |logger| logger.formatter = ::Logger::Formatter.new }
    .then { |logger| ActiveSupport::TaggedLogging.new(logger) }

  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")
  config.active_support.report_deprecations = false

  # 2. 【重要】データベースを1つに統合する設定
  # Rails 8のデフォルト（Solid系）が別DBを探しに行くのを防ぎます
  config.cache_store = :solid_cache_store
  config.active_job.queue_adapter = :solid_queue

  # これらを nil にすることで、メインの DATABASE_URL を使うようになります
  config.solid_cache.connects_to = nil
  config.solid_queue.connects_to = nil
  config.solid_cable.connects_to = nil

  # 3. Renderのホストを許可
  config.hosts << ".onrender.com"

  # その他基本設定
  config.i18n.fallbacks = true
  config.active_record.dump_schema_after_migration = false
  config.active_record.attributes_for_inspect = [ :id ]
  config.active_storage.service = :local
end
