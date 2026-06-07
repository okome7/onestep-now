class AddAvatarKeyToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :avatar_key, :string, null: false, default: "avatar-1"
  end
end
