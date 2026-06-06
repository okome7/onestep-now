class AddConstraintsToTasks < ActiveRecord::Migration[8.1]
  VALID_STATUSES = %w[pending active completed].freeze

  def up
    execute <<~SQL.squish
      UPDATE tasks
      SET title = 'Untitled task'
      WHERE title IS NULL OR BTRIM(title) = ''
    SQL

    execute <<~SQL.squish
      UPDATE tasks
      SET status = 'pending'
      WHERE status IS NULL OR status NOT IN ('pending', 'active', 'completed')
    SQL

    execute <<~SQL.squish
      WITH ranked_active_tasks AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) AS active_rank
        FROM tasks
        WHERE status = 'active'
      )
      UPDATE tasks
      SET status = 'pending'
      FROM ranked_active_tasks
      WHERE tasks.id = ranked_active_tasks.id
        AND ranked_active_tasks.active_rank > 1
    SQL

    change_column_default :tasks, :status, from: nil, to: "pending"
    change_column_null :tasks, :title, false
    change_column_null :tasks, :status, false

    add_check_constraint :tasks,
      "status IN (#{VALID_STATUSES.map { |status| quote(status) }.join(', ')})",
      name: "check_tasks_status"

    add_index :tasks,
      :user_id,
      unique: true,
      where: "status = 'active'",
      name: "index_tasks_on_user_id_active_status"
  end

  def down
    remove_index :tasks, name: "index_tasks_on_user_id_active_status"
    remove_check_constraint :tasks, name: "check_tasks_status"
    change_column_null :tasks, :status, true
    change_column_null :tasks, :title, true
    change_column_default :tasks, :status, from: "pending", to: nil
  end
end
