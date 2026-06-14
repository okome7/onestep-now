require 'rails_helper'

RSpec.describe Task, type: :model do
  def build_user(email: "task_user@example.com")
    User.new(
      name: "Task User",
      email: email,
      password: "password1",
      password_confirmation: "password1"
    )
  end

  it "defaults status to pending" do
    task = described_class.new(title: "Start", user: build_user)

    expect(task.status).to eq("pending")
  end

  it "requires title" do
    task = described_class.new(title: " ", user: build_user)

    expect(task).not_to be_valid
    expect(task.errors[:title]).to be_present
  end

  it "allows defined statuses" do
    task = described_class.new(title: "Start", status: :active, user: build_user)

    expect(task).to be_valid
  end

  it "rejects undefined statuses" do
    expect {
      described_class.new(title: "Start", status: "paused", user: build_user)
    }.to raise_error(ArgumentError)
  end

  it "allows only one active task per user" do
    user = build_user
    user.save!
    described_class.create!(title: "First task", status: :active, user: user)

    task = described_class.new(title: "Second task", status: :active, user: user)

    expect(task).not_to be_valid
    expect(task.errors[:status]).to include("allows only one active task per user")
  end

  it "allows multiple non-active tasks per user" do
    user = build_user
    user.save!
    described_class.create!(title: "First task", status: :pending, user: user)

    task = described_class.new(title: "Second task", status: :pending, user: user)

    expect(task).to be_valid
  end
end
