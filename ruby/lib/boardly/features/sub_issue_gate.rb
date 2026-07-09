# frozen_string_literal: true

require "time"
require_relative "../util/project"

module Boardly
  module Features
    # Sub-issue Done-gating + parent roll-up.
    module SubIssueGate
      GATE_MARKER = "<!-- boardly:sub-issue-gate -->"
      module_function

      def run(ctx)
        cfg = ctx.cfg
        graph = ctx.graph
        feature = cfg.features[:sub_issue_gate]
        guard = feature[:guard_statuses].map(&:downcase)
        status_field = Util::Project.require_field(graph, cfg.fields[:status], "sub-issue gate")

        progress_field = cfg.fields[:progress] ? Util::Project.find_field(graph, cfg.fields[:progress]) : nil
        if cfg.fields[:progress] && progress_field.nil?
          puts %(::warning::sub-issue-gate: progress field "#{cfg.fields[:progress]}" not found; skipping roll-up.)
        end

        revert_option_id = nil
        if feature[:action] == "revert"
          raise Boardly::ConfigError, 'sub-issue-gate: action "revert" requires "revertStatus".' unless feature[:revert_status]

          revert_option_id = Util::Project.option_id(status_field, feature[:revert_status])
          raise Boardly::ConfigError, %(sub-issue-gate: revertStatus "#{feature[:revert_status]}" is not a valid Status option.) unless revert_option_id
        end

        graph.items.each do |item|
          content = item.content
          next unless content && content.type == "Issue" && content.sub_issues

          si = content.sub_issues
          if progress_field && si.total.positive?
            ctx.audit.record("sub-issue-gate", "rollup-progress", "##{content.number}", "#{si.completed}/#{si.total} (#{si.percent_completed}%)")
            ctx.client.set_number(graph.id, item.id, progress_field.id, si.percent_completed) unless ctx.dry_run
          end

          status = Util::Project.status_of(item, cfg)
          guarded = status && guard.include?(status.downcase)
          next if !guarded || si.total.zero? || si.completed >= si.total

          label = "##{content.number} #{content.title}"
          detail = %(#{si.completed}/#{si.total} sub-issues complete while in "#{status}")

          if feature[:action] == "revert" && revert_option_id
            ctx.audit.record("sub-issue-gate", "revert-status", label, %(#{detail} → "#{feature[:revert_status]}"))
            unless ctx.dry_run
              ctx.client.set_single_select(graph.id, item.id, status_field.id, revert_option_id)
              ctx.client.comment(content.repo_owner, content.repo_name, content.number,
                                 %(#{GATE_MARKER}\nMoved back to **#{feature[:revert_status]}**: #{si.completed}/#{si.total} sub-issues are still open, so this can't be **#{status}** yet.))
            end
            next
          end

          since = Util::Project.status_updated_at(item, cfg) || item.updated_at
          existing = ctx.client.list_comments(content.repo_owner, content.repo_name, content.number)
          already = existing.any? { |c| c[:body].include?(GATE_MARKER) && Time.iso8601(c[:created_at]) >= Time.iso8601(since) }
          next if already

          ctx.audit.record("sub-issue-gate", "comment", label, detail)
          next if ctx.dry_run

          ctx.client.comment(content.repo_owner, content.repo_name, content.number,
                             %(#{GATE_MARKER}\n⚠️ This item is in **#{status}** but only #{si.completed}/#{si.total} sub-issues are complete. Close the remaining sub-issues before marking it done.))
        end
      end
    end
  end
end
