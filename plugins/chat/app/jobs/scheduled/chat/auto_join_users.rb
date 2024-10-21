# frozen_string_literal: true

module Jobs
  module Chat
    class AutoJoinUsers < ::Jobs::Scheduled
      every 1.hour

      def execute(args = {})
        return if !SiteSetting.chat_enabled

        ::Chat::AutoJoinChannels.call
        ::Chat::AutoLeaveChannels.call(event: args[:event]&.to_sym || :hourly_job)
      end
    end
  end
end
