ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Tests create the records they need explicitly. Loading every fixture also
    # requires PostgreSQL privileges to disable foreign-key triggers.
  end
end
