smtp_address = ENV["SMTP_ADDRESS"].to_s.strip

if smtp_address.present?
  Rails.application.config.action_mailer.delivery_method = :smtp
  Rails.application.config.action_mailer.perform_deliveries = true
  Rails.application.config.action_mailer.raise_delivery_errors =
    ENV.fetch("SMTP_RAISE_DELIVERY_ERRORS", "true") == "true"

  Rails.application.config.action_mailer.smtp_settings = {
    address: smtp_address,
    port: ENV.fetch("SMTP_PORT", "587").to_i,
    domain: ENV["SMTP_DOMAIN"].presence || "localhost",
    user_name: ENV["SMTP_USERNAME"].presence,
    password: ENV["SMTP_PASSWORD"].presence,
    authentication: (ENV["SMTP_AUTHENTICATION"].presence || "plain").to_sym,
    tls: ENV.fetch("SMTP_TLS", "false") == "true",
    enable_starttls_auto: ENV.fetch("SMTP_ENABLE_STARTTLS_AUTO", "true") == "true"
  }.compact
end
