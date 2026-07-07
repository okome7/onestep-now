class CreateCompletionPostsCommentsLikes < ActiveRecord::Migration[8.1]
  def change
    create_table :completion_posts do |t|
      t.references :user, null: false, foreign_key: true
      t.references :task, null: false, foreign_key: true, index: { unique: true }
      t.string :status, null: false, default: "doing"
      t.text :content
      t.datetime :completed_at

      t.timestamps
    end

    add_check_constraint :completion_posts,
      "status IN ('doing', 'completed')",
      name: "check_completion_posts_status"

    create_table :comments do |t|
      t.references :user, null: false, foreign_key: true
      t.references :completion_post, null: false, foreign_key: true
      t.text :body, null: false
      t.string :post_status_when_commented, null: false

      t.timestamps
    end

    add_check_constraint :comments,
      "post_status_when_commented IN ('doing', 'completed')",
      name: "check_comments_post_status_when_commented"

    create_table :completion_post_likes do |t|
      t.references :user, null: false, foreign_key: true
      t.references :completion_post, null: false, foreign_key: true

      t.timestamps
    end

    add_index :completion_post_likes,
      [ :user_id, :completion_post_id ],
      unique: true,
      name: "index_completion_post_likes_on_user_and_post"

    add_column :users, :feed_access_expires_at, :datetime
  end
end
