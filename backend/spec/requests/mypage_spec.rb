require 'rails_helper'

RSpec.describe "Mypage", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  def create_user(email:)
    User.create!(
      name: email.split('@').first,
      email: email,
      password: "password1",
      password_confirmation: "password1"
    )
  end

  def create_completed_post(user:, title:, completed_at:)
    task = user.tasks.create!(title: title, status: :completed, completed_at: completed_at)
    task.create_completion_post!(
      user: user,
      status: :completed,
      content: title,
      completed_at: completed_at,
      created_at: completed_at
    )
  end

  let(:user) { create_user(email: "owner@example.com") }
  let(:other_user) { create_user(email: "other@example.com") }
  let(:fan) { create_user(email: "fan@example.com") }

  describe "GET /api/mypage" do
    it "ログイン中ユーザーの達成だけを集計して新しい順で返す" do
      travel_to Time.zone.local(2026, 7, 9, 12, 0, 0) do
        older_post = create_completed_post(user: user, title: "古い達成", completed_at: 2.days.ago)
        newest_post = create_completed_post(user: user, title: "新しい達成", completed_at: 1.hour.ago)
        create_completed_post(user: other_user, title: "他人の達成", completed_at: Time.current)

        older_post.completion_post_likes.create!(user: fan)
        newest_post.completion_post_likes.create!(user: fan)
        newest_post.completion_post_likes.create!(user: user)
        newest_post.comments.create!(user: fan, body: "おめでとう")
        newest_post.comments.create!(user: user, body: "自分コメント")

        get "/api/mypage", headers: { "X-User-Id" => user.id.to_s }, as: :json

        expect(response).to have_http_status(:ok)
        data = JSON.parse(response.body).fetch("data")

        expect(data).to include(
          "level" => 1,
          "next_level" => 2,
          "remaining_to_next_level" => 8,
          "progress_percent" => 20,
          "achievements_count" => 2,
          "streak_days" => 1,
          "likes_count" => 3,
          "comments_count" => 2
        )
        expect(data.fetch("all_achievements").map { |achievement| achievement["task_title"] }).to eq([
          "新しい達成",
          "古い達成"
        ])
        expect(data.fetch("recent_achievements").map { |achievement| achievement["task_title"] }).to eq([
          "新しい達成",
          "古い達成"
        ])
      end
    end

    it "レベルを10達成ごとに計算する" do
      travel_to Time.zone.local(2026, 7, 9, 12, 0, 0) do
        128.times do |index|
          create_completed_post(
            user: user,
            title: "達成#{index}",
            completed_at: index.minutes.ago
          )
        end

        get "/api/mypage", headers: { "X-User-Id" => user.id.to_s }, as: :json

        data = JSON.parse(response.body).fetch("data")
        expect(data).to include(
          "level" => 13,
          "next_level" => 14,
          "remaining_to_next_level" => 2,
          "progress_percent" => 80,
          "achievements_count" => 128
        )
      end
    end

    it "達成がない場合は空状態用のレベルを返す" do
      get "/api/mypage", headers: { "X-User-Id" => user.id.to_s }, as: :json

      data = JSON.parse(response.body).fetch("data")
      expect(data).to include(
        "level" => 0,
        "next_level" => 1,
        "remaining_to_next_level" => 10,
        "progress_percent" => 0,
        "achievements_count" => 0,
        "streak_days" => 0,
        "likes_count" => 0,
        "comments_count" => 0,
        "recent_achievements" => [],
        "all_achievements" => []
      )
    end
  end
end
