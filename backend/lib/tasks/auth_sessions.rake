namespace :auth_sessions do
  desc "期限切れ・失効済みの認証セッションを削除する"
  task cleanup: :environment do
    AuthSessions::Cleanup.new.call
  end
end
