require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = false
  config.consider_all_requests_local = false

  # Render logs are collected from stdout.
  config.logger = ActiveSupport::Logger.new(STDOUT)
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info").to_sym

  # Keep Solid-backed features disabled in staging.
  config.cache_store = :null_store
  config.active_job.queue_adapter = :inline

  backend_hosts = ENV.fetch("BACKEND_HOSTS", "")
                     .split(",")
                     .map(&:strip)
                     .reject(&:empty?)

  (%w[.onrender.com] + backend_hosts).each do |host|
    config.hosts << host
  end

  config.i18n.fallbacks = true
  config.active_record.dump_schema_after_migration = false
end
