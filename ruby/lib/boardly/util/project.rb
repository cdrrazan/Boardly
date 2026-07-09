# frozen_string_literal: true

module Boardly
  module Util
    # Accessors that map configured field NAMES to values on an item, plus small
    # field lookups. Mirrors the TS `util/project.ts`.
    module Project
      module_function

      def find_field(graph, name)
        return nil if name.nil?

        lower = name.to_s.downcase
        graph.fields.find { |f| f.name.to_s.downcase == lower }
      end

      def require_field(graph, name, purpose)
        field = find_field(graph, name)
        return field if field

        available = graph.fields.map(&:name).join(", ")
        raise Boardly::ConfigError, %(Field "#{name}" (needed for #{purpose}) not found on project. Available fields: #{available})
      end

      def value_for(item, field_name)
        lower = field_name.to_s.downcase
        item.field_values.find { |v| v.field_name.to_s.downcase == lower }
      end

      def status_of(item, cfg) = value_for(item, cfg.fields[:status])&.single_select&.name

      def status_updated_at(item, cfg) = value_for(item, cfg.fields[:status])&.updated_at

      def priority_of(item, cfg) = value_for(item, cfg.fields[:priority])&.single_select&.name

      def iteration_of(item, cfg) = value_for(item, cfg.fields[:iteration])&.iteration

      def estimate_of(item, cfg)
        return nil unless cfg.fields[:estimate]

        value_for(item, cfg.fields[:estimate])&.number
      end

      def done?(item, cfg)
        status = status_of(item, cfg)
        return false unless status

        cfg.done_statuses.any? { |d| d.downcase == status.downcase }
      end

      def option_id(field, name)
        lower = name.to_s.downcase
        opt = (field.options || []).find { |o| o[:name].to_s.downcase == lower }
        opt && opt[:id]
      end
    end
  end
end
