module AuthSessions
  class Cleanup
    GRACE_PERIOD = 24.hours
    BATCH_SIZE = 1_000

    def initialize(as_of: Time.current, grace_period: GRACE_PERIOD, batch_size: BATCH_SIZE, logger: Rails.logger)
      @as_of = as_of
      @grace_period = grace_period
      @batch_size = batch_size
      @logger = logger
    end

    def call
      started_at = Time.current
      cutoff = @as_of - @grace_period
      relation = AuthSession.cleanup_due(cutoff)
      target_count = relation.count
      deleted_count = 0

      @logger.info(
        "AuthSession cleanup started_at=#{started_at.iso8601} cutoff=#{cutoff.iso8601} target_count=#{target_count}"
      )

      relation.in_batches(of: @batch_size) do |batch|
        deleted_count += batch.delete_all
      end

      deleted_count
    rescue StandardError => error
      @logger.error(
        "AuthSession cleanup failed error_class=#{error.class} error_message=#{error.message.inspect}"
      )
      raise
    ensure
      finished_at = Time.current
      @logger.info(
        "AuthSession cleanup finished_at=#{finished_at.iso8601} deleted_count=#{deleted_count || 0}"
      )
    end
  end
end
