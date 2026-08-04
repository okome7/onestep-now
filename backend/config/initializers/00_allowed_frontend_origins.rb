class AllowedFrontendOrigins
  DEVELOPMENT_DEFAULTS = [ "http://localhost:5173", "http://127.0.0.1:5173" ].freeze
  PRODUCTION_DEFAULTS = [ "https://onestep-now-frontend.vercel.app" ].freeze

  def self.all
    defaults = Rails.env.production? || Rails.env.staging? ? PRODUCTION_DEFAULTS : DEVELOPMENT_DEFAULTS
    ENV.fetch("FRONTEND_ORIGINS", defaults.join(",")).split(",").map(&:strip).reject(&:empty?).uniq
  end
end
