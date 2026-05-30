require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false

  # ログ設定
  config.log_tags = [ :request_id ]
  config.logger = ActiveSupport::Logger.new(STDOUT)
    .tap  { |logger| logger.formatter = ::Logger::Formatter.new }
    .then { |logger| ActiveSupport::TaggedLogging.new(logger) }

  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # データベース設定
  # Solid系はデフォルトでメインDBを使うので、特別な connects_to 指定をしないのが正解です
  config.cache_store = :solid_cache_store
  config.active_job.queue_adapter = :solid_queue

  # ホスト許可
  config.hosts << ".onrender.com"

  config.i18n.fallbacks = true
  config.active_record.dump_schema_after_migration = false
  config.active_storage.service = :local
end
