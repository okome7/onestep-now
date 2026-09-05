# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_05_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "auth_sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "csrf_token_digest", null: false
    t.datetime "expires_at", null: false
    t.datetime "revoked_at"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["expires_at"], name: "index_auth_sessions_on_expires_at"
    t.index ["revoked_at"], name: "index_auth_sessions_on_revoked_at"
    t.index ["token_digest"], name: "index_auth_sessions_on_token_digest", unique: true
    t.index ["user_id", "expires_at"], name: "index_auth_sessions_on_user_id_and_expires_at"
    t.index ["user_id"], name: "index_auth_sessions_on_user_id"
  end

  create_table "comments", force: :cascade do |t|
    t.text "body", null: false
    t.bigint "completion_post_id", null: false
    t.datetime "created_at", null: false
    t.string "post_status_when_commented", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["completion_post_id"], name: "index_comments_on_completion_post_id"
    t.index ["user_id"], name: "index_comments_on_user_id"
    t.check_constraint "post_status_when_commented::text = ANY (ARRAY['doing'::character varying, 'completed'::character varying]::text[])", name: "check_comments_post_status_when_commented"
  end

  create_table "completion_post_likes", force: :cascade do |t|
    t.bigint "completion_post_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["completion_post_id"], name: "index_completion_post_likes_on_completion_post_id"
    t.index ["user_id", "completion_post_id"], name: "index_completion_post_likes_on_user_and_post", unique: true
    t.index ["user_id"], name: "index_completion_post_likes_on_user_id"
  end

  create_table "completion_posts", force: :cascade do |t|
    t.datetime "completed_at"
    t.text "content"
    t.datetime "created_at", null: false
    t.string "status", default: "doing", null: false
    t.bigint "task_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index "user_id, COALESCE(completed_at, created_at) DESC", name: "index_completed_posts_on_user_and_achieved_at", where: "((status)::text = 'completed'::text)"
    t.index ["created_at", "id"], name: "index_completion_posts_on_created_at_and_id_desc", order: :desc
    t.index ["task_id"], name: "index_completion_posts_on_task_id", unique: true
    t.index ["user_id", "status"], name: "index_completion_posts_on_user_id_and_status"
    t.index ["user_id"], name: "index_completion_posts_on_user_id"
    t.check_constraint "status::text = ANY (ARRAY['doing'::character varying, 'completed'::character varying]::text[])", name: "check_completion_posts_status"
  end

  create_table "password_reset_codes", force: :cascade do |t|
    t.string "code_digest", null: false
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "expires_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "used_at"
    t.bigint "user_id"
    t.index ["email"], name: "index_password_reset_codes_on_email"
    t.index ["expires_at"], name: "index_password_reset_codes_on_expires_at"
    t.index ["user_id"], name: "index_password_reset_codes_on_user_id"
  end

  create_table "solid_cable_messages", force: :cascade do |t|
    t.binary "channel", null: false
    t.bigint "channel_hash", null: false
    t.datetime "created_at", null: false
    t.binary "payload", null: false
    t.index ["channel"], name: "index_solid_cable_messages_on_channel"
    t.index ["channel_hash"], name: "index_solid_cable_messages_on_channel_hash"
    t.index ["created_at"], name: "index_solid_cable_messages_on_created_at"
  end

  create_table "tasks", force: :cascade do |t|
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "started_at"
    t.string "status", default: "pending", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_tasks_on_user_id"
    t.index ["user_id"], name: "index_tasks_on_user_id_active_status", unique: true, where: "((status)::text = 'active'::text)"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'active'::character varying, 'completed'::character varying]::text[])", name: "check_tasks_status"
  end

  create_table "users", force: :cascade do |t|
    t.string "avatar_key", default: "avatar-1", null: false
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "feed_access_expires_at"
    t.boolean "feed_access_pending", default: false, null: false
    t.string "name", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email", unique: true
  end

  add_foreign_key "auth_sessions", "users"
  add_foreign_key "comments", "completion_posts"
  add_foreign_key "comments", "users"
  add_foreign_key "completion_post_likes", "completion_posts"
  add_foreign_key "completion_post_likes", "users"
  add_foreign_key "completion_posts", "tasks"
  add_foreign_key "completion_posts", "users"
  add_foreign_key "password_reset_codes", "users"
  add_foreign_key "tasks", "users"
end
