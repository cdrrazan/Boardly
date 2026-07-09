# frozen_string_literal: true

require_relative "slack"

module Boardly
  module Notify
    # Fans a Report out to every configured external channel. Records each
    # delivery in the audit trail, honors dry_run, and never lets one channel's
    # failure abort the run (or the other channels).
    class Notifier
      def initialize(channels, dry_run, audit)
        @channels = channels
        @dry_run = dry_run
        @audit = audit
      end

      def channel_count = @channels.length

      def broadcast(report)
        @channels.each do |ch|
          @audit.record(report.feature, "notify:#{ch.name}", ch.target, report.title)
          next if @dry_run

          begin
            ch.send(report)
          rescue StandardError => e
            puts "::warning::Notification via #{ch.name} failed: #{e.message}"
          end
        end
      end

      # Build a Notifier from config. Secrets (webhook URL, SMTP credentials) are
      # read from ENV vars named in the config — never from the config file.
      def self.build(cfg, env, dry_run, audit)
        channels = []
        n = cfg.notifications || {}

        if n.dig(:slack, :enabled)
          url = env[n.dig(:slack, :webhook_env)]
          if url.nil? || url.empty?
            puts %(::warning::Slack notifications enabled but env var "#{n.dig(:slack, :webhook_env)}" is empty; skipping Slack.)
          else
            channels << SlackChannel.new(url)
          end
        end

        if n.dig(:email, :enabled)
          require_relative "email"
          e = n[:email]
          channels << EmailChannel.new(
            host: e[:host], port: e[:port], secure: e[:secure],
            user: e[:user_env] && env[e[:user_env]], pass: e[:password_env] && env[e[:password_env]],
            from: e[:from], to: e[:to]
          )
        end

        new(channels, dry_run, audit)
      end
    end
  end
end
