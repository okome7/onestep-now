class FeedUpdatesChannel < ApplicationCable::Channel
  def subscribed
    if current_user.feed_access_expires_at.present? && current_user.feed_access_expires_at.future?
      stream_from FeedUpdatesBroadcaster::STREAM_NAME
    else
      reject
    end
  end
end
