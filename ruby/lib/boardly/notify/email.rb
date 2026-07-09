# frozen_string_literal: true

require "mail"

module Boardly
  module Notify
    # Sends reports as email over SMTP (via the `mail` gem).
    class EmailChannel
      def initialize(config)
        @config = config
        delivery = {
          address: config[:host], port: config[:port],
          enable_starttls_auto: !config[:secure],
          tls: config[:secure]
        }
        if config[:user]
          delivery[:user_name] = config[:user]
          delivery[:password] = config[:pass]
          delivery[:authentication] = :login
        end
        @delivery = delivery
      end

      def name = "email"
      def target = @config[:to].join(", ")

      def send(report)
        cfg = @config
        delivery = @delivery
        mail = Mail.new do
          from    cfg[:from]
          to      cfg[:to]
          subject report.title
          body    report.markdown
          delivery_method :smtp, delivery
        end
        mail.deliver!
      end
    end
  end
end
