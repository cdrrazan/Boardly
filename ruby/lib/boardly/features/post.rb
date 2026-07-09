# frozen_string_literal: true

require_relative "../notify/slack"

module Boardly
  module Features
    # Post a report to GitHub (a comment on a fixed issue or a fresh issue) and
    # then broadcast it to any configured external channels (Slack/email).
    module Post
      module_function

      def report(ctx, target, feature, fallback_title, body)
        owner = ctx.run_repo[:owner]
        repo = ctx.run_repo[:repo]

        if !target[:issue].nil?
          ctx.audit.record(feature, "comment", "#{owner}/#{repo}##{target[:issue]}", fallback_title)
          ctx.client.comment(owner, repo, target[:issue], body) unless ctx.dry_run
        else
          title = target[:create_issue_title] || fallback_title
          ctx.audit.record(feature, "create-issue", "#{owner}/#{repo}", title)
          ctx.client.create_issue(owner, repo, title, body, target[:labels]) unless ctx.dry_run
        end

        ctx.notifier.broadcast(Notify::Report.new(feature: feature, title: fallback_title, markdown: body))
      end
    end
  end
end
