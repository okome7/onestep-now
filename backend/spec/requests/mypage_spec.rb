require 'rails_helper'

RSpec.describe "Mypage", type: :request do
  def create_user(email:)
    User.create!(
      name: email.split('@').first,
      email: email,
      password: "password1",
      password_confirmation: "password1"
    )
  end

  def create_completed_post(user:, title:, completed_at: Time.current)
    task = user.tasks.create!(title: title, status: :completed, completed_at: completed_at)
    task.create_completion_post!(user: user, status: :completed, content: title, completed_at: completed_at)
  end

  let(:user) { create_user(email: "owner@example.com") }
  let(:other_user) { create_user(email: "other@example.com") }

  describe "GET /api/mypage" do
    it "ログイン中ユーザーの達成だけを集計し、新しい順で返す" do
      oldest = create_completed_post(user: user, title: "古い達成", completed_at: 2.days.ago)
      newest = create_completed_post(user: user, title: "新しい達成", completed_at: 1.day.ago)
      other_post = create_completed_post(user: other_user, title: "他人の達成", completed_at: Time.current)

      3.times { |index| newest.completion_post_likes.create!(user: create_user(email: "like#{index}@example.com")) }
      2.times { |index| newest.comments.create!(user: create_user(email: "comment#{index}@example.com"), body: "コメント#{index}") }
      oldest.completion_post_likes.create!(user: other_user)
      other_post.completion_post_likes.create!(user: user)
      other_post.comments.create!(user: user, body: "含めない")

      get "/api/mypage", headers: { "X-User-Id" => user.id.to_s }, as: :json

      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body).fetch("data")

      expect(data).to include(
        "level" => 1,
        "next_level" => 2,
        "remaining_to_next_level" => 8,
        "progress_percent" => 20,
        "achievements_count" => 2,
        "likes_count" => 4,
        "comments_count" => 2
      )
      expect(data.fetch("all_achievements").map { |achievement| achievement.fetch("task_title") }).to eq([ "新しい達成", "古い達成" ])
      expect(data.fetch("all_achievements").map { |achievement| achievement.fetch("task_title") }).not_to include("他人の達成")
      expect(data.fetch("recent_achievements").first).to include(
        "task_title" => "新しい達成",
        "likes_count" => 3,
        "comments_count" => 2
      )
    end

    it "達成がない場合はLv.0の空状態用データを返す" do
      get "/api/mypage", headers: { "X-User-Id" => user.id.to_s }, as: :json

      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body).fetch("data")

      expect(data).to include(
        "level" => 0,
        "next_level" => 1,
        "remaining_to_next_level" => 10,
        "progress_percent" => 0,
        "achievements_count" => 0,
        "streak_days" => 0,
        "likes_count" => 0,
        "comments_count" => 0
      )
      expect(data.fetch("recent_achievements")).to be_empty
      expect(data.fetch("all_achievements")).to be_empty
    end
  end
end
