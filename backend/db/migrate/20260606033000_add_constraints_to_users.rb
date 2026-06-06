class AddConstraintsToUsers < ActiveRecord::Migration[8.1]
  def up
    execute <<~SQL.squish
      UPDATE users
      SET email = LOWER(TRIM(email))
      WHERE email IS NOT NULL
    SQL

    change_column_null :users, :name, false
    change_column_null :users, :email, false
    change_column_null :users, :password_digest, false
    add_index :users, "LOWER(email)", unique: true, name: "index_users_on_lower_email"
  end

  def down
    remove_index :users, name: "index_users_on_lower_email"
    change_column_null :users, :password_digest, true
    change_column_null :users, :email, true
    change_column_null :users, :name, true
  end
end
