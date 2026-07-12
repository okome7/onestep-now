Rails.application.routes.draw do
  root to: ->(_) { [ 200, { "Content-Type" => "application/json" }, [ { status: "Running" }.to_json ] ] }

  get "up" => "rails/health#show", as: :rails_health_check
  # 新規登録
  post "signup", to: "registrations#create"
  post "signup/email_check", to: "registrations#email_check"
  delete "account", to: "registrations#destroy"
  post "login", to: "sessions#create"
  post "password_reset", to: "password_resets#create"
  post "password_reset/verify", to: "password_resets#verify"
  patch "password_reset", to: "password_resets#update"

  scope "/api" do
    get "feed", to: "feed#index"
    get "mypage", to: "mypage#show"
    post "tasks", to: "tasks#create"
    patch "tasks/:id/start", to: "tasks#start"
    patch "tasks/:id/complete", to: "tasks#complete"
    delete "tasks/:id", to: "tasks#destroy"
    post "completion_posts/:completion_post_id/likes", to: "completion_post_likes#create"
    delete "completion_posts/:completion_post_id/likes", to: "completion_post_likes#destroy"
    post "completion_posts/:completion_post_id/comments", to: "comments#create"
  end
end
