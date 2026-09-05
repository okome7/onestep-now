require "rails_helper"

RSpec.describe LevelProgress do
  describe "level progress" do
    it "returns the initial state before the first completion" do
      progress = described_class.new(0)

      expect(progress.level).to eq(0)
      expect(progress.next_level).to eq(1)
      expect(progress.remaining_to_next_level).to eq(User::COMPLETIONS_PER_LEVEL)
      expect(progress.progress_percent).to eq(0)
    end

    it "returns progress within a level" do
      progress = described_class.new(2)

      expect(progress.level).to eq(1)
      expect(progress.next_level).to eq(2)
      expect(progress.remaining_to_next_level).to eq(3)
      expect(progress.progress_percent).to eq(40)
    end

    it "resets progress at a level boundary" do
      progress = described_class.new(User::COMPLETIONS_PER_LEVEL)

      expect(progress.level).to eq(2)
      expect(progress.next_level).to eq(3)
      expect(progress.remaining_to_next_level).to eq(User::COMPLETIONS_PER_LEVEL)
      expect(progress.progress_percent).to eq(0)
    end
  end
end
