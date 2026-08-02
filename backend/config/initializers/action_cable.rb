default_origins = Rails.env.production? || Rails.env.staging? ? "" : "http://localhost:5173,http://127.0.0.1:5173"
allowed_origins = ENV.fetch("FRONTEND_ORIGINS", default_origins).split(",").map(&:strip).reject(&:empty?)

Rails.application.config.action_cable.allowed_request_origins = allowed_origins
Rails.application.config.action_cable.disable_request_forgery_protection = false
