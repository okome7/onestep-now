class AddFeedAccessPendingToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :feed_access_pending, :boolean, default: false, null: false
  end
end
