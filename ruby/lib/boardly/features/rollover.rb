# frozen_string_literal: true

require_relative "../util/project"

module Boardly
  module Features
    # Sprint rollover: when an iteration ends, move every item still in it and not
    # "done" into the next (current) iteration.
    module Rollover
      module_function

      def run(ctx)
        cfg = ctx.cfg
        graph = ctx.graph
        field = Util::Project.require_field(graph, cfg.fields[:iteration], "rollover")

        completed = field.completed_iterations || []
        upcoming = field.iterations || []
        if completed.empty?
          puts "rollover: no completed iterations — nothing to roll over."
          return
        end
        if upcoming.empty?
          puts "::warning::rollover: an iteration has completed but there is no next iteration to roll into. Add one to the project."
          return
        end

        from = completed.first
        to = upcoming.first
        only = cfg.features[:rollover][:only_statuses].map(&:downcase)

        graph.items.each do |item|
          it = Util::Project.iteration_of(item, cfg)
          next unless it && it.iteration_id == from.id
          next if Util::Project.done?(item, cfg)

          status = Util::Project.status_of(item, cfg)
          next if !only.empty? && !(status && only.include?(status.downcase))

          label = item.content ? "##{item.content.number} #{item.content.title}" : item.id
          ctx.audit.record("rollover", "move-iteration", label, "#{from.title} → #{to.title}#{status ? " (status: #{status})" : ""}")
          ctx.client.set_iteration(graph.id, item.id, field.id, to.id) unless ctx.dry_run
        end
      end
    end
  end
end
