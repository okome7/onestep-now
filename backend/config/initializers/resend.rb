resend_api_key = ENV["RESEND_API_KEY"].to_s.strip

if resend_api_key.present? && !Rails.env.test?
  Resend.api_key = resend_api_key

  Rails.application.config.action_mailer.delivery_method = :resend
  Rails.application.config.action_mailer.perform_deliveries = true
  Rails.application.config.action_mailer.raise_delivery_errors = true
elsif !Rails.env.test?
  Rails.application.config.action_mailer.perform_deliveries = false
end
