class LevelProgress
  def initialize(completed_count)
    @completed_count = completed_count
  end

  def level
    return 0 if completed_count.zero?

    (completed_count / User::COMPLETIONS_PER_LEVEL).floor + 1
  end

  def next_level
    level + 1
  end

  def remaining_to_next_level
    remaining = User::COMPLETIONS_PER_LEVEL - completed_in_current_level
    remaining.zero? ? User::COMPLETIONS_PER_LEVEL : remaining
  end

  def progress_percent
    completed_in_current_level * 100 / User::COMPLETIONS_PER_LEVEL
  end

  private

  attr_reader :completed_count

  def completed_in_current_level
    completed_count % User::COMPLETIONS_PER_LEVEL
  end
end
