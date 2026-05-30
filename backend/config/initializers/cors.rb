Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # 開発環境（localhost）と本番環境（Render）の両方を許可する
    origins "http://localhost:5173",
            /\Ahttps:\/\/.*\.onrender\.com\z/ # Renderのドメインを正規表現で一括許可

    resource "*",
      headers: :any,
      methods: [ :get, :post, :put, :patch, :delete, :options, :head ],
      credentials: true
  end
end
