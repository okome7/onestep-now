require 'rails_helper'

RSpec.describe "Feed posts", type: :request do
  include ActiveSupport::Testing::TimeHelpers

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

  describe "GET /api/tasks/active" do
    it "現在のユーザーの進行中タスクと開始時刻を返す" do
      started_at = 75.seconds.ago
      task = user.tasks.create!(title: "復元するタスク", status: :active, started_at: started_at)
      task.create_completion_post!(user: user, status: :doing, content: task.title)
      other_user.tasks.create!(title: "他人のタスク", status: :active, started_at: 1.minute.ago)

      get "/api/tasks/active", headers: authenticated_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body).fetch("data")
      expect(data).to include(
        "id" => task.id,
        "title" => "復元するタスク",
        "status" => "active"
      )
      expect(Time.zone.parse(data.fetch("started_at"))).to be_within(1.second).of(started_at)
    end

    it "進行中タスクがなければnullを返す" do
      user.tasks.create!(title: "完了タスク", status: :completed, completed_at: Time.current)

      get "/api/tasks/active", headers: authenticated_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).fetch("data")).to be_nil
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
    it "初回説明未確認なら期限を開始せず未使用の閲覧権利を付与する" do
      task = user.tasks.create!(title: "初回説明を確認する", status: :active, started_at: 1.minute.ago)
      task.create_completion_post!(user: user, status: :doing, content: task.title)

      patch "/api/tasks/#{task.id}/complete",
        params: { defer_feed_access: false },
        headers: authenticated_headers(user),
        as: :json

      expect(response).to have_http_status(:ok)
      expect(user.reload.feed_access_pending).to be(true)
      expect(user.feed_access_expires_at).to be_nil
    end

    it "初回説明確認済みでも期限を開始せず未使用の閲覧権利を付与する" do
      fixed_time = Time.zone.local(2026, 9, 19, 12, 0, 0)

      travel_to fixed_time do
        user.update!(feed_intro_seen_at: 1.day.ago)
        task = user.tasks.create!(title: "説明確認済みのタスク", status: :active, started_at: 1.minute.ago)
        task.create_completion_post!(user: user, status: :doing, content: task.title)

        patch "/api/tasks/#{task.id}/complete",
          params: { defer_feed_access: true },
          headers: authenticated_headers(user),
          as: :json

        expect(response).to have_http_status(:ok)
        expect(user.reload.feed_access_pending).to be(true)
        expect(user.feed_access_expires_at).to be_nil
      end
    end

    it "未使用権利を時間経過や追加のタスク完了で蓄積せず1回分だけ保持する" do
      fixed_time = Time.zone.local(2026, 9, 19, 12, 0, 0)

      travel_to fixed_time do
        user.update!(feed_intro_seen_at: 1.day.ago)
        first_task = user.tasks.create!(title: "最初の権利", status: :active, started_at: 1.minute.ago)
        first_task.create_completion_post!(user: user, status: :doing, content: first_task.title)
        patch "/api/tasks/#{first_task.id}/complete", headers: authenticated_headers(user), as: :json

        travel 10.minutes
        expect(user.reload).to have_attributes(feed_access_pending: true, feed_access_expires_at: nil)

        second_task = user.tasks.create!(title: "次の権利", status: :active, started_at: Time.current)
        second_task.create_completion_post!(user: user, status: :doing, content: second_task.title)
        patch "/api/tasks/#{second_task.id}/complete", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        expect(user.reload).to have_attributes(feed_access_pending: true, feed_access_expires_at: nil)
      end
    end

    it "閲覧中または期限切れでも新しいタスク完了で未使用権利へ置き換える" do
      [ 2.minutes.from_now, 1.minute.ago ].each_with_index do |expiration, index|
        user.update!(feed_access_pending: false, feed_access_expires_at: expiration)
        task = user.tasks.create!(title: "置き換え#{index}", status: :active, started_at: 1.minute.ago)
        task.create_completion_post!(user: user, status: :doing, content: task.title)

        patch "/api/tasks/#{task.id}/complete", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        expect(user.reload).to have_attributes(feed_access_pending: true, feed_access_expires_at: nil)
      end
    end

    it "開始時の投稿をcompletedに更新し、新規投稿を作成しない" do
      fixed_time = Time.zone.local(2026, 9, 14, 12, 0, 0)

      travel_to fixed_time do
        user.update!(feed_intro_seen_at: 1.day.ago)
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
        expect(user.reload.feed_access_expires_at).to be_nil
        expect(user.feed_access_pending).to be(true)
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
    it "初回説明の開始待ち中は状態を変更せず背景表示用の投稿を返す" do
      fixed_time = Time.zone.local(2026, 9, 20, 12, 0, 0)

      travel_to fixed_time do
        user.update!(
          feed_intro_seen_at: nil,
          feed_access_pending: true,
          feed_access_expires_at: nil
        )
        create_completed_posts(user: other_user, count: 21)

        get "/api/feed", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        first_page = JSON.parse(response.body)
        expect(first_page).to include(
          "status" => "success",
          "access_allowed" => false,
          "feed_access_pending" => true,
          "remaining_seconds" => 0
        )
        expect(first_page.fetch("data").size).to eq(20)
        expect(first_page.fetch("pagination")).to include(
          "page" => 1,
          "per_page" => 20,
          "has_more" => true
        )

        get "/api/feed?page=2", headers: authenticated_headers(user), as: :json

        repeated_page = JSON.parse(response.body)
        expect(repeated_page.dig("pagination", "page")).to eq(1)
        expect(repeated_page.fetch("data").pluck("id")).to eq(first_page.fetch("data").pluck("id"))
        expect(user.reload).to have_attributes(
          feed_intro_seen_at: nil,
          feed_access_pending: true,
          feed_access_expires_at: nil
        )
      end
    end

    it "初回説明確認済みの開始待ち中は投稿を返さず状態を変更しない" do
      fixed_time = Time.zone.local(2026, 9, 20, 12, 0, 0)

      travel_to fixed_time do
        seen_at = fixed_time - 1.day
        user.update!(feed_intro_seen_at: seen_at, feed_access_pending: true, feed_access_expires_at: nil)
        create_completed_posts(user: other_user, count: 2)

        get "/api/feed", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)).to include(
          "access_allowed" => false,
          "feed_access_pending" => true,
          "remaining_seconds" => 0,
          "data" => []
        )
        expect(user.reload).to have_attributes(
          feed_intro_seen_at: seen_at,
          feed_access_pending: true,
          feed_access_expires_at: nil
        )
      end
    end

    it "自分の投稿も含め、操作可否を返す" do
      user.update!(feed_access_expires_at: 3.minutes.from_now)
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

      expect(body.fetch("remaining_seconds")).to be_between(1, 180)
      expect(body.fetch("feed_access_expires_at")).to be_present
      expect(own_payload).to include(
        "task_title" => "自分のタスク",
        "avatar_key" => user.avatar_key,
        "status" => "completed",
        "status_label" => "できた",
        "card_variant" => "completed",
        "level" => 3,
        "is_mine" => true,
        "can_like" => true,
        "can_comment" => true,
        "liked_by_me" => true,
        "commented_by_me" => false
      )
      expect(other_payload).to include(
        "avatar_key" => other_user.avatar_key,
        "is_mine" => false,
        "can_like" => true,
        "can_comment" => true,
        "liked_by_me" => true,
        "commented_by_me" => true,
        "level" => 5,
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
        "level" => 3,
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
      user.update!(feed_access_expires_at: 3.minutes.from_now)
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
      user.update!(feed_access_expires_at: 3.minutes.from_now)
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

  describe "POST /api/feed/access" do
    it "初回説明の確認と開始待ち解除と閲覧期限を同時に確定する" do
      fixed_time = Time.zone.local(2026, 9, 19, 12, 0, 0)

      travel_to fixed_time do
        user.update!(feed_intro_seen_at: nil, feed_access_pending: true, feed_access_expires_at: nil)

        post "/api/feed/access", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        expect(user.reload).to have_attributes(
          feed_intro_seen_at: fixed_time,
          feed_access_pending: false,
          feed_access_expires_at: fixed_time + 3.minutes
        )
        expect(JSON.parse(response.body)).to include(
          "remaining_seconds" => 180,
          "feed_intro_seen_at" => fixed_time.iso8601(3),
          "feed_access_expires_at" => (fixed_time + 3.minutes).iso8601(3)
        )
      end
    end

    it "初回説明確認済みなら確認日時を維持して開始時に初めて期限を確定する" do
      fixed_time = Time.zone.local(2026, 9, 19, 12, 0, 0)
      seen_at = fixed_time - 1.day

      travel_to fixed_time do
        user.update!(feed_intro_seen_at: seen_at, feed_access_pending: true, feed_access_expires_at: nil)

        post "/api/feed/access", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        expect(user.reload).to have_attributes(
          feed_intro_seen_at: seen_at,
          feed_access_pending: false,
          feed_access_expires_at: fixed_time + 3.minutes
        )
        expect(JSON.parse(response.body)).to include(
          "feed_intro_seen_at" => seen_at.iso8601(3),
          "feed_access_expires_at" => (fixed_time + 3.minutes).iso8601(3),
          "remaining_seconds" => 180
        )
      end
    end

    it "利用権利なしと期限切れ状態では開始を拒否する" do
      travel_to(Time.zone.local(2026, 9, 19, 12, 0, 0)) do
        [ nil, 1.minute.ago ].each do |expiration|
          user.update!(feed_access_pending: false, feed_access_expires_at: expiration)

          post "/api/feed/access", headers: authenticated_headers(user), as: :json

          expect(response).to have_http_status(:forbidden)
          expect(user.reload).to have_attributes(feed_access_pending: false, feed_access_expires_at: expiration)
        end
      end
    end

    it "開始待ちでなければ現在の閲覧時間を延長しない" do
      original_expiration = 1.minute.from_now
      user.update!(feed_access_pending: false, feed_access_expires_at: original_expiration)

      post "/api/feed/access", headers: authenticated_headers(user), as: :json

      expect(response).to have_http_status(:ok)
      expect(user.reload.feed_access_expires_at).to be_within(1.second).of(original_expiration)
    end

    it "時間経過後の再取得と開始API再実行でも最初の閲覧期限を引き継ぐ" do
      fixed_time = Time.zone.local(2026, 9, 15, 12, 0, 0)

      travel_to fixed_time do
        user.update!(feed_intro_seen_at: nil, feed_access_pending: true, feed_access_expires_at: nil)

        post "/api/feed/access", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        first_expiration = user.reload.feed_access_expires_at
        first_seen_at = user.feed_intro_seen_at
        expect(first_expiration).to eq(fixed_time + 3.minutes)
        expect(first_seen_at).to eq(fixed_time)

        travel 60.seconds

        get "/api/feed", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        feed_body = JSON.parse(response.body)
        expect(Time.zone.parse(feed_body.fetch("feed_access_expires_at"))).to eq(first_expiration)
        expect(feed_body.fetch("remaining_seconds")).to eq(120)

        post "/api/feed/access", headers: authenticated_headers(user), as: :json

        expect(response).to have_http_status(:ok)
        access_body = JSON.parse(response.body)
        expect(Time.zone.parse(access_body.fetch("feed_access_expires_at"))).to eq(first_expiration)
        expect(Time.zone.parse(access_body.fetch("feed_intro_seen_at"))).to eq(first_seen_at)
        expect(access_body.fetch("remaining_seconds")).to eq(120)
        expect(user.reload.feed_access_expires_at).to eq(first_expiration)
        expect(user.feed_intro_seen_at).to eq(first_seen_at)
      end
    end

    it "保存失敗時は確認状態・開始待ち・閲覧期限のいずれも変更しない" do
      fixed_time = Time.zone.local(2026, 9, 19, 12, 0, 0)

      travel_to fixed_time do
        original_expiration = nil
        user.update!(feed_intro_seen_at: nil, feed_access_pending: true, feed_access_expires_at: original_expiration)
        relation = User.where(id: user.id, feed_access_pending: true)
        allow(User).to receive(:where).and_call_original
        allow(User).to receive(:where)
          .with(id: user.id, feed_access_pending: true)
          .and_return(relation)
        allow(relation).to receive(:update_all).and_raise(ActiveRecord::StatementInvalid, "保存失敗")

        expect {
          post "/api/feed/access", headers: authenticated_headers(user), as: :json
        }.to raise_error(ActiveRecord::StatementInvalid, "保存失敗")

        expect(user.reload).to have_attributes(
          feed_intro_seen_at: nil,
          feed_access_pending: true,
          feed_access_expires_at: original_expiration
        )
      end
    end

    it "同一ユーザーへの並行リクエストでは最初に確定した期限を両方に返す" do
      user.update!(feed_intro_seen_at: nil, feed_access_pending: true, feed_access_expires_at: nil)
      sessions = 2.times.map do
        _auth_session, session_token, csrf_token = AuthSession.issue_for(user)
        session = ActionDispatch::Integration::Session.new(Rails.application)
        session.cookies[ApplicationController::SESSION_COOKIE] = session_token
        session.cookies[ApplicationController::CSRF_COOKIE] = csrf_token
        [ session, { "Origin" => "http://localhost:5173", "X-CSRF-Token" => csrf_token } ]
      end
      Rails.application.routes.recognize_path("/api/feed/access", method: :post)
      start_barrier = Concurrent::CyclicBarrier.new(2)

      responses = sessions.map do |session, headers|
        Thread.new do
          start_barrier.wait(5)
          session.post "/api/feed/access", headers: headers, as: :json
          [ session.response.status, JSON.parse(session.response.body) ]
        end
      end.map(&:value)

      expect(responses.map(&:first)).to all(eq(200))
      expirations = responses.map { |_status, body| body.fetch("feed_access_expires_at") }
      seen_times = responses.map { |_status, body| body.fetch("feed_intro_seen_at") }
      expect(expirations.uniq.one?).to be(true)
      expect(seen_times.uniq.one?).to be(true)
      expect(Time.zone.parse(expirations.first)).to be_within(2.seconds).of(3.minutes.from_now)
      expect(user.reload.feed_access_pending).to be(false)
      expect(user.feed_access_expires_at).to be_within(0.001.seconds).of(Time.zone.parse(expirations.first))
      expect(user.feed_intro_seen_at).to be_within(0.001.seconds).of(Time.zone.parse(seen_times.first))
    end
  end

  describe "GET /api/completion_posts/:id/comments" do
    before do
      user.update!(feed_access_pending: false, feed_access_expires_at: 3.minutes.from_now)
    end

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
    before do
      user.update!(feed_access_pending: false, feed_access_expires_at: 3.minutes.from_now)
    end

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
    before do
      user.update!(feed_access_pending: false, feed_access_expires_at: 3.minutes.from_now)
    end

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

  describe "フィード操作のアクセス制御" do
    around do |example|
      travel_to(Time.zone.local(2026, 9, 15, 12, 0, 0)) { example.run }
    end

    let(:completion_post) do
      task = other_user.tasks.create!(title: "アクセス制御対象の投稿")
      task.create_completion_post!(user: other_user, status: :completed)
    end

    shared_examples "フィード操作を拒否する" do
      it "いいね追加を拒否し、いいねを増やさない" do
        expect {
          post "/api/completion_posts/#{completion_post.id}/likes",
            headers: authenticated_headers(user),
            as: :json
        }.not_to change(CompletionPostLike, :count)

        expect(response).to have_http_status(:forbidden)
        expect(JSON.parse(response.body)).to include("status" => "error")
      end

      it "いいね解除を拒否し、既存のいいねを残す" do
        completion_post.completion_post_likes.create!(user: user)

        expect {
          delete "/api/completion_posts/#{completion_post.id}/likes",
            headers: authenticated_headers(user),
            as: :json
        }.not_to change(CompletionPostLike, :count)

        expect(response).to have_http_status(:forbidden)
        expect(completion_post.completion_post_likes.exists?(user: user)).to be(true)
      end

      it "コメント一覧取得を拒否し、コメント内容を返さない" do
        completion_post.comments.create!(user: other_user, body: "非公開にするコメント")

        get "/api/completion_posts/#{completion_post.id}/comments",
          headers: authenticated_headers(user),
          as: :json

        expect(response).to have_http_status(:forbidden)
        expect(JSON.parse(response.body)).to include("status" => "error")
        expect(response.body).not_to include("非公開にするコメント")
      end

      it "コメント投稿を拒否し、コメントを増やさない" do
        expect {
          post "/api/completion_posts/#{completion_post.id}/comments",
            params: { comment: { body: "保存しないコメント" } },
            headers: authenticated_headers(user),
            as: :json
        }.not_to change(Comment, :count)

        expect(response).to have_http_status(:forbidden)
        expect(JSON.parse(response.body)).to include("status" => "error")
      end
    end

    context "閲覧開始前の場合" do
      before do
        user.update!(feed_access_pending: true, feed_access_expires_at: 3.minutes.from_now)
      end

      include_examples "フィード操作を拒否する"
    end

    context "閲覧期限が存在しない場合" do
      before do
        user.update!(feed_access_pending: false, feed_access_expires_at: nil)
      end

      include_examples "フィード操作を拒否する"
    end

    context "閲覧期限切れの場合" do
      before do
        user.update!(feed_access_pending: false, feed_access_expires_at: 1.second.ago)
      end

      include_examples "フィード操作を拒否する"
    end

    context "閲覧期限内の場合" do
      before do
        user.update!(feed_access_pending: false, feed_access_expires_at: 3.minutes.from_now)
      end

      it "いいね追加と解除を利用できる" do
        post "/api/completion_posts/#{completion_post.id}/likes",
          headers: authenticated_headers(user),
          as: :json

        expect(response).to have_http_status(:created)
        expect(completion_post.completion_post_likes.exists?(user: user)).to be(true)

        delete "/api/completion_posts/#{completion_post.id}/likes",
          headers: authenticated_headers(user),
          as: :json

        expect(response).to have_http_status(:ok)
        expect(completion_post.completion_post_likes.exists?(user: user)).to be(false)
      end

      it "コメント一覧取得と投稿を利用できる" do
        completion_post.comments.create!(user: other_user, body: "期限内のコメント")

        get "/api/completion_posts/#{completion_post.id}/comments",
          headers: authenticated_headers(user),
          as: :json

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body).fetch("data").pluck("body")).to include("期限内のコメント")

        expect {
          post "/api/completion_posts/#{completion_post.id}/comments",
            params: { comment: { body: "期限内の投稿" } },
            headers: authenticated_headers(user),
            as: :json
        }.to change(Comment, :count).by(1)

        expect(response).to have_http_status(:created)
      end
    end
  end
end
