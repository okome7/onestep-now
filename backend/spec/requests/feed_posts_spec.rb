require 'rails_helper'

RSpec.describe "Feed posts", type: :request do
  def create_user(email:)
    User.create!(
      name: email.split('@').first,
      email: email,
      password: "password1",
      password_confirmation: "password1"
    )
  end

  def create_completed_posts(user:, count:)
    count.times do |index|
      task = user.tasks.create!(
        title: "#{user.name}の完了#{index}",
        status: :completed,
        completed_at: Time.current
      )
      task.create_completion_post!(
        user: user,
        status: :completed,
        content: task.title,
        completed_at: task.completed_at
      )
    end
  end

  def sql_query_count
    count = 0
    subscriber = lambda do |_name, _started, _finished, _unique_id, payload|
      count += 1 unless payload[:cached] || %w[SCHEMA TRANSACTION].include?(payload[:name])
    end

    ActiveSupport::Notifications.subscribed(subscriber, "sql.active_record") { yield }
    count
  end

  let(:user) { create_user(email: "owner@example.com") }
  let(:other_user) { create_user(email: "other@example.com") }

  describe "POST /api/tasks" do
    it "現在のユーザーのタスクを作成する" do
      post "/api/tasks",
        params: { task: { title: "参考記事を1つ読む" } },
        headers: authenticated_headers(user),
        as: :json

      expect(response).to have_http_status(:created)
      expect(user.tasks.last).to have_attributes(
        title: "参考記事を1つ読む",
        status: "pending"
      )
    end
  end

  describe "PATCH /api/tasks/:id/start" do
    it "タスク開始時にdoingの投稿を作成する" do
      task = user.tasks.create!(title: "参考記事を1つ読む")

      patch "/api/tasks/#{task.id}/start", headers: authenticated_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(task.reload).to be_active
      expect(task.started_at).to be_present
      expect(task.completion_post).to have_attributes(
        user_id: user.id,
        status: "doing",
        content: "参考記事を1つ読む"
      )
      body = JSON.parse(response.body)
      expect(body.dig("data", "completion_post")).to include(
        "id" => task.completion_post.id,
        "status" => "doing",
        "status_label" => "やります",
        "card_variant" => "doing"
      )
    end

    it "古い開始中タスクが残っていても新しいタスクを開始できる" do
      old_task = user.tasks.create!(title: "中止しそこねたタスク", status: :active, started_at: 1.minute.ago)
      old_task.create_completion_post!(user: user, status: :doing, content: old_task.title)
      old_post_id = old_task.completion_post.id
      next_task = user.tasks.create!(title: "もう一回始める")

      patch "/api/tasks/#{next_task.id}/start", headers: authenticated_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(Task.exists?(old_task.id)).to be(false)
      expect(CompletionPost.exists?(old_post_id)).to be(false)
      expect(next_task.reload).to be_active
      expect(next_task.completion_post).to have_attributes(
        user_id: user.id,
        status: "doing",
        content: "もう一回始める"
      )
    end
  end

  describe "PATCH /api/tasks/:id/complete" do
    it "開始時の投稿をcompletedに更新し、新規投稿を作成しない" do
      task = user.tasks.create!(title: "参考記事を1つ読む", status: :active, started_at: 1.minute.ago)
      completion_post = task.create_completion_post!(user: user, status: :doing, content: task.title)
      completion_post.completion_post_likes.create!(user: other_user)
      completion_post.comments.create!(user: other_user, body: "応援しています")

      expect {
        patch "/api/tasks/#{task.id}/complete", headers: authenticated_headers(user), as: :json
      }.not_to change(CompletionPost, :count)

      expect(response).to have_http_status(:ok)
      expect(task.reload).to be_completed
      expect(task.completed_at).to be_present
      expect(completion_post.reload).to be_completed
      expect(completion_post.completed_at.to_i).to eq(task.completed_at.to_i)
      expect(user.reload.feed_access_expires_at).to be > Time.current
      body = JSON.parse(response.body)
      expect(body.dig("data", "completion_post")).to include(
        "id" => completion_post.id,
        "status" => "completed",
        "status_label" => "できた",
        "card_variant" => "completed",
        "likes_count" => 1,
        "comments_count" => 1
      )
      expect(body.dig("data", "completion_post", "comments").first).to include(
        "body" => "応援しています",
        "avatar_key" => other_user.avatar_key,
        "post_status_when_commented" => "doing"
      )
    end
  end

  describe "DELETE /api/tasks/:id" do
    it "開始中のタスクと投稿を削除する" do
      task = user.tasks.create!(title: "やめるタスク", status: :active, started_at: Time.current)
      task.create_completion_post!(user: user, status: :doing, content: task.title)

      expect {
        delete "/api/tasks/#{task.id}", headers: authenticated_headers(user), as: :json
      }.to change(Task, :count).by(-1)
        .and change(CompletionPost, :count).by(-1)

      expect(response).to have_http_status(:ok)
    end

    it "完了済みタスクは削除しない" do
      task = user.tasks.create!(title: "完了済み", status: :completed, completed_at: Time.current)
      task.create_completion_post!(user: user, status: :completed, content: task.title, completed_at: task.completed_at)

      expect {
        delete "/api/tasks/#{task.id}", headers: authenticated_headers(user), as: :json
      }.not_to change(Task, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(task.reload).to be_completed
    end
  end

  describe "GET /api/feed" do
    it "自分の投稿も含め、操作可否を返す" do
      user.update!(feed_access_expires_at: 5.minutes.from_now)
      create_completed_posts(user: user, count: 9)
      create_completed_posts(user: other_user, count: 20)
      own_task = user.tasks.create!(title: "自分のタスク")
      own_post = own_task.create_completion_post!(user: user, status: :completed, completed_at: Time.current)
      own_post.completion_post_likes.create!(user: user)
      other_task = other_user.tasks.create!(title: "他人のタスク")
      other_completion_post = other_task.create_completion_post!(user: other_user, status: :doing)
      other_completion_post.completion_post_likes.create!(user: user)
      other_completion_post.comments.create!(user: user, body: "応援しています")

      get "/api/feed", headers: authenticated_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      data = body.fetch("data")
      own_payload = data.find { |post| post["id"] == own_post.id }
      other_payload = data.find { |post| post["id"] == other_completion_post.id }

      expect(body.fetch("remaining_seconds")).to be_between(1, 300)
      expect(body.fetch("feed_access_expires_at")).to be_present
      expect(own_payload).to include(
        "task_title" => "自分のタスク",
        "status" => "completed",
        "status_label" => "できた",
        "card_variant" => "completed",
        "level" => 2,
        "is_mine" => true,
        "can_like" => true,
        "can_comment" => true,
        "liked_by_me" => true,
        "commented_by_me" => false
      )
      expect(other_payload).to include(
        "is_mine" => false,
        "can_like" => true,
        "can_comment" => true,
        "liked_by_me" => true,
        "commented_by_me" => true,
        "level" => 3,
        "likes_count" => 1,
        "comments_count" => 1
      )
      expect(other_payload.fetch("comments")).to eq([])

      get "/api/completion_posts/#{other_completion_post.id}/comments",
        headers: authenticated_headers(user),
        as: :json

      comment_payload = JSON.parse(response.body).fetch("data").first
      expect(comment_payload).to include(
        "body" => "応援しています",
        "level" => 2,
        "avatar_key" => user.avatar_key,
        "post_status_when_commented" => "doing"
      )
    end

    it "閲覧時間外はアクセス不可を通常レスポンスで返す" do
      user.update!(feed_access_expires_at: 1.second.ago)

      get "/api/feed", headers: authenticated_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to include(
        "status" => "success",
        "access_allowed" => false,
        "remaining_seconds" => 0,
        "data" => []
      )
    end

    it "20件ずつ全投稿をページ取得できる" do
      user.update!(feed_access_expires_at: 5.minutes.from_now)
      create_completed_posts(user: other_user, count: 25)

      get "/api/feed", headers: authenticated_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      first_page = JSON.parse(response.body)
      expect(first_page.fetch("data").size).to eq(20)
      expect(first_page.fetch("pagination")).to include(
        "page" => 1,
        "per_page" => 20,
        "has_more" => true
      )

      get "/api/feed?page=2", headers: authenticated_headers(user)

      second_page = JSON.parse(response.body)
      expect(second_page.fetch("data").size).to eq(5)
      expect(second_page.fetch("pagination")).to include(
        "page" => 2,
        "per_page" => 20,
        "has_more" => false
      )
      expect(first_page.fetch("data").pluck("id") & second_page.fetch("data").pluck("id")).to be_empty
    end

    it "投稿やコメントが増えてもSQL数が増えない" do
      user.update!(feed_access_expires_at: 5.minutes.from_now)
      first_task = other_user.tasks.create!(title: "最初の投稿")
      first_post = first_task.create_completion_post!(user: other_user, status: :completed)
      first_post.completion_post_likes.create!(user: user)
      first_post.comments.create!(user: user, body: "最初のコメント")

      initial_count = sql_query_count do
        get "/api/feed", headers: authenticated_headers(user), as: :json
      end

      5.times do |index|
        task = other_user.tasks.create!(title: "追加投稿#{index}")
        post = task.create_completion_post!(user: other_user, status: :completed)
        post.completion_post_likes.create!(user: user)
        post.comments.create!(user: user, body: "追加コメント#{index}")
      end

      increased_count = sql_query_count do
        get "/api/feed", headers: authenticated_headers(user), as: :json
      end

      # Cookie session validation adds the session and current-user lookups.
      expect(initial_count).to be <= 10
      expect(increased_count).to eq(initial_count)
    end
  end

  describe "GET /api/completion_posts/:id/comments" do
    it "最新側から20件ずつ取得し、各ページ内は古い順で返す" do
      task = other_user.tasks.create!(title: "コメントが多い投稿")
      completion_post = task.create_completion_post!(user: other_user, status: :completed)
      base_time = Time.current.change(usec: 0)

      25.times do |index|
        completion_post.comments.create!(
          user: user,
          body: "コメント#{index}",
          created_at: base_time + index.seconds,
          updated_at: base_time + index.seconds
        )
      end

      get "/api/completion_posts/#{completion_post.id}/comments",
        headers: authenticated_headers(user),
        as: :json

      first_page = JSON.parse(response.body)
      expect(first_page.fetch("data").pluck("body")).to eq((5..24).map { |index| "コメント#{index}" })
      expect(first_page.fetch("pagination")).to include(
        "page" => 1,
        "per_page" => 20,
        "has_more" => true
      )

      get "/api/completion_posts/#{completion_post.id}/comments?page=2",
        headers: authenticated_headers(user)

      second_page = JSON.parse(response.body)
      expect(second_page.fetch("data").pluck("body")).to eq((0..4).map { |index| "コメント#{index}" })
      expect(second_page.fetch("pagination")).to include(
        "page" => 2,
        "per_page" => 20,
        "has_more" => false
      )
    end
  end

  describe "POST /api/completion_posts/:id/comments" do
    it "コメント時点の投稿状態を保存する" do
      task = other_user.tasks.create!(title: "他人のタスク")
      completion_post = task.create_completion_post!(user: other_user, status: :completed)

      post "/api/completion_posts/#{completion_post.id}/comments",
        params: { comment: { body: "おめでとう" } },
        headers: authenticated_headers(user),
        as: :json

      expect(response).to have_http_status(:created)
      expect(completion_post.comments.last).to have_attributes(
        body: "おめでとう",
        post_status_when_commented: "completed"
      )
    end

    it "自分の投稿にもコメントできる" do
      task = user.tasks.create!(title: "自分のタスク")
      completion_post = task.create_completion_post!(user: user, status: :doing)

      post "/api/completion_posts/#{completion_post.id}/comments",
        params: { comment: { body: "自分へのコメント" } },
        headers: authenticated_headers(user),
        as: :json

      expect(response).to have_http_status(:created)
      expect(completion_post.comments.last).to have_attributes(
        user_id: user.id,
        body: "自分へのコメント",
        post_status_when_commented: "doing"
      )
    end
  end

  describe "POST /api/completion_posts/:id/likes" do
    it "いいね解除できる" do
      task = other_user.tasks.create!(title: "他人のタスク")
      completion_post = task.create_completion_post!(user: other_user, status: :doing)
      completion_post.completion_post_likes.create!(user: user)

      expect {
        delete "/api/completion_posts/#{completion_post.id}/likes", headers: authenticated_headers(user), as: :json
      }.to change(CompletionPostLike, :count).by(-1)

      expect(response).to have_http_status(:ok)
    end

    it "自分の投稿にもいいねできる" do
      task = user.tasks.create!(title: "自分のタスク")
      completion_post = task.create_completion_post!(user: user, status: :doing)

      expect {
        post "/api/completion_posts/#{completion_post.id}/likes", headers: authenticated_headers(user), as: :json
      }.to change(CompletionPostLike, :count).by(1)

      expect(response).to have_http_status(:created)
    end
  end
end
