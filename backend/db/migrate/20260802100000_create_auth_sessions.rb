class CreateAuthSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :auth_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.string :csrf_token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :revoked_at
      t.timestamps

      t.index :token_digest, unique: true
      t.index [ :user_id, :expires_at ]
    end
  end
end
