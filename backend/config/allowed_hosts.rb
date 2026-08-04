module AllowedHosts
  DEFAULTS = [
    "onestep-now.onrender.com",
    "onestep-now-frontend.vercel.app"
  ].freeze

  def self.from(environment_value = ENV["ALLOWED_HOSTS"])
    value = environment_value.presence || DEFAULTS.join(",")

    value.split(",").map(&:strip).reject(&:empty?).uniq
  end
end
