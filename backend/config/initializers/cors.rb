default_origins = Rails.env.production? || Rails.env.staging? ? "" : "http://localhost:5173"
allowed_origins = ENV.fetch("FRONTEND_ORIGINS", default_origins).split(",").map(&:strip).reject(&:empty?)

if allowed_origins.any?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins(*allowed_origins)

      resource "*",
        headers: :any,
        methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
        credentials: ENV.fetch("CORS_CREDENTIALS", "false") == "true"
    end
  end
end
