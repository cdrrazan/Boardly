# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

module Boardly
  module Notify
    Report = Struct.new(:feature, :title, :markdown, keyword_init: true)

    # Convert the subset of GitHub-flavored Markdown we emit into Slack "mrkdwn":
    # headings -> bold, **bold** -> *bold*, [text](url) -> <url|text>.
    def self.to_slack_mrkdwn(md)
      md.gsub(/^#{'#'}{1,6}\s+(.*)$/) { "*#{Regexp.last_match(1)}*" }
        .gsub(/\*\*(.+?)\*\*/) { "*#{Regexp.last_match(1)}*" }
        .gsub(/\[([^\]]+)\]\(([^)]+)\)/) { "<#{Regexp.last_match(2)}|#{Regexp.last_match(1)}>" }
    end

    # Posts reports to a Slack channel via an Incoming Webhook URL.
    class SlackChannel
      def initialize(webhook_url)
        @webhook_url = webhook_url
      end

      def name = "slack"
      def target = "Slack webhook"

      def send(report)
        uri = URI(@webhook_url)
        req = Net::HTTP::Post.new(uri)
        req["Content-Type"] = "application/json"
        req.body = JSON.generate({ text: Boardly::Notify.to_slack_mrkdwn(report.markdown) })
        resp = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https") { |http| http.request(req) }
        raise "Slack webhook returned #{resp.code}" unless resp.is_a?(Net::HTTPSuccess)
      end
    end
  end
end
