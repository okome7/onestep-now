Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # 新規登録
  post "signup", to: "registrations#create"
end
