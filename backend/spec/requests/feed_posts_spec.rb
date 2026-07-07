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

  let(:user) { create_user(email: "owner@example.com") }
  let(:other_user) { create_user(email: "other@example.com") }

  describe "POST /api/tasks" do
    it "現在のユーザーのタスクを作成する" do
      post "/api/tasks",
        params: { task: { title: "参考記事を1つ読む" } },
        headers: { "X-User-Id" => user.id.to_s },
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

      patch "/api/tasks/#{task.id}/start", headers: { "X-User-Id" => user.id.to_s }, as: :json

      expect(response).to have_http_status(:ok)
      expect(task.reload).to be_active
      expect(task.started_at).to be_present
      expect(task.completion_post).to have_attributes(
        user_id: user.id,
        status: "doing",
        content: "参考記事を1つ読む"
      )
    end
  end

  describe "PATCH /api/tasks/:id/complete" do
    it "開始時の投稿をcompletedに更新し、新規投稿を作成しない" do
      task = user.tasks.create!(title: "参考記事を1つ読む", status: :active, started_at: 1.minute.ago)
      completion_post = task.create_completion_post!(user: user, status: :doing, content: task.title)

      expect {
        patch "/api/tasks/#{task.id}/complete", headers: { "X-User-Id" => user.id.to_s }, as: :json
      }.not_to change(CompletionPost, :count)

      expect(response).to have_http_status(:ok)
      expect(task.reload).to be_completed
      expect(task.completed_at).to be_present
      expect(completion_post.reload).to be_completed
      expect(completion_post.completed_at.to_i).to eq(task.completed_at.to_i)
      expect(user.reload.feed_access_expires_at).to be > Time.current
    end
  end

  describe "GET /api/feed" do
    it "自分の投稿も含め、操作可否を返す" do
      user.update!(feed_access_expires_at: 5.minutes.from_now)
      own_task = user.tasks.create!(title: "自分のタスク")
      own_post = own_task.create_completion_post!(user: user, status: :completed, completed_at: Time.current)
      other_task = other_user.tasks.create!(title: "他人のタスク")
      other_completion_post = other_task.create_completion_post!(user: other_user, status: :doing)
      other_completion_post.completion_post_likes.create!(user: user)
      other_completion_post.comments.create!(user: user, body: "応援しています")

      get "/api/feed", headers: { "X-User-Id" => user.id.to_s }, as: :json

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
        "is_mine" => true,
        "can_like" => false,
        "can_comment" => false,
        "liked_by_me" => false
      )
      expect(other_payload).to include(
        "is_mine" => false,
        "can_like" => true,
        "can_comment" => true,
        "liked_by_me" => true,
        "likes_count" => 1,
        "comments_count" => 1
      )
      expect(other_payload.fetch("comments").first).to include(
        "body" => "応援しています",
        "post_status_when_commented" => "doing"
      )
    end

    it "閲覧時間外は403を返す" do
      user.update!(feed_access_expires_at: 1.second.ago)

      get "/api/feed", headers: { "X-User-Id" => user.id.to_s }, as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/completion_posts/:id/comments" do
    it "コメント時点の投稿状態を保存する" do
      task = other_user.tasks.create!(title: "他人のタスク")
      completion_post = task.create_completion_post!(user: other_user, status: :completed)

      post "/api/completion_posts/#{completion_post.id}/comments",
        params: { comment: { body: "おめでとう" } },
        headers: { "X-User-Id" => user.id.to_s },
        as: :json

      expect(response).to have_http_status(:created)
      expect(completion_post.comments.last).to have_attributes(
        body: "おめでとう",
        post_status_when_commented: "completed"
      )
    end

    it "自分の投稿にはコメントできない" do
      task = user.tasks.create!(title: "自分のタスク")
      completion_post = task.create_completion_post!(user: user, status: :doing)

      post "/api/completion_posts/#{completion_post.id}/comments",
        params: { comment: { body: "自分へのコメント" } },
        headers: { "X-User-Id" => user.id.to_s },
        as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/completion_posts/:id/likes" do
    it "いいね解除できる" do
      task = other_user.tasks.create!(title: "他人のタスク")
      completion_post = task.create_completion_post!(user: other_user, status: :doing)
      completion_post.completion_post_likes.create!(user: user)

      expect {
        delete "/api/completion_posts/#{completion_post.id}/likes", headers: { "X-User-Id" => user.id.to_s }, as: :json
      }.to change(CompletionPostLike, :count).by(-1)

      expect(response).to have_http_status(:ok)
    end

    it "自分の投稿にはいいねできない" do
      task = user.tasks.create!(title: "自分のタスク")
      completion_post = task.create_completion_post!(user: user, status: :doing)

      post "/api/completion_posts/#{completion_post.id}/likes", headers: { "X-User-Id" => user.id.to_s }, as: :json

      expect(response).to have_http_status(:forbidden)
    end
  end
end
