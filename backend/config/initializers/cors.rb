default_origins = Rails.env.production? || Rails.env.staging? ? "" : "http://localhost:5173"
allowed_origins = ENV.fetch("FRONTEND_ORIGINS", default_origins).split(",").map(&:strip).reject(&:empty?)

vercel_preview_origin = %r{\Ahttps://onestep-now-frontend-[a-z0-9]+-okomes-projects-07a34d19\.vercel\.app\z}

if allowed_origins.any?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins(*allowed_origins, vercel_preview_origin)

      resource "*",
        headers: :any,
        methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
        credentials: ENV.fetch("CORS_CREDENTIALS", "false") == "true"
    end
  end
end