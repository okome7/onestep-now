class AddCleanupIndexesToAuthSessions < ActiveRecord::Migration[8.1]
  def change
    add_index :auth_sessions, :expires_at
    add_index :auth_sessions, :revoked_at
  end
end
