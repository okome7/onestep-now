class CreatePasswordResetCodes < ActiveRecord::Migration[8.1]
  def change
    create_table :password_reset_codes do |t|
      t.references :user, null: true, foreign_key: true
      t.string :email, null: false
      t.string :code_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :used_at

      t.timestamps
    end

    add_index :password_reset_codes, :email
    add_index :password_reset_codes, :expires_at
  end
end
