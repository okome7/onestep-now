class AddApiQueryIndexes < ActiveRecord::Migration[8.1]
  def change
    add_index :completion_posts,
      [ :created_at, :id ],
      order: { created_at: :desc, id: :desc },
      name: "index_completion_posts_on_created_at_and_id_desc"

    add_index :completion_posts,
      [ :user_id, :status ],
      name: "index_completion_posts_on_user_id_and_status"

    add_index :completion_posts,
      "user_id, COALESCE(completed_at, created_at) DESC",
      where: "status = 'completed'",
      name: "index_completed_posts_on_user_and_achieved_at"
  end
end
