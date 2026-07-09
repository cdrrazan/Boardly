# frozen_string_literal: true

require_relative "../util/project"

module Boardly
  module Features
    # Priority auto-sort: reorder items so higher-priority cards float to the top.
    # Note: manual order only shows on board views whose sort is set to "manual".
    module PrioritySort
      module_function

      def run(ctx)
        cfg = ctx.cfg
        graph = ctx.graph
        feature = cfg.features[:priority_sort]
        return unless feature

        Util::Project.require_field(graph, cfg.fields[:priority], "priority sort")
        order = feature[:order].map(&:downcase)

        rank = lambda do |item|
          p = Util::Project.priority_of(item, cfg)&.downcase
          idx = p ? order.index(p) : nil
          idx.nil? ? order.length : idx # unknown / unset -> bottom
        end

        current = graph.items
        # Stable sort by rank; ties keep current relative order.
        desired = current.each_with_index.sort_by { |item, index| [rank.call(item), index] }.map(&:first)

        if current.map(&:id) == desired.map(&:id)
          puts "priority-sort: items already ordered by priority."
          return
        end

        ctx.audit.record("priority-sort", "reorder", graph.title, "reordered #{desired.length} items by priority")
        return if ctx.dry_run

        after_id = nil
        desired.each do |item|
          ctx.client.set_position(graph.id, item.id, after_id)
          after_id = item.id
        end
      end
    end
  end
end
