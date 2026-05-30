Rails.application.routes.draw do
  root to: ->(_) { [ 200, { "Content-Type" => "application/json" }, [ { status: "Running" }.to_json ] ] }

  get "up" => "rails/health#show", as: :rails_health_check
  # 新規登録
  post "signup", to: "registrations#create"
end
