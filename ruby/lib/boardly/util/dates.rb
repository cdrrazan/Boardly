# frozen_string_literal: true

require "time"
require "date"

module Boardly
  module Util
    # Small, dependency-free date/time helpers (mirrors the TS `dates.ts`).
    module Dates
      MS_PER_DAY = 24 * 60 * 60
      module_function

      def parse(value) = value.is_a?(Time) ? value : Time.iso8601(value.to_s)

      # Fractional days from `from` to `to` (negative if `to` precedes `from`).
      def days_between(from, to) = (parse(to) - parse(from)) / MS_PER_DAY.to_f

      def hours_between(from, to) = (parse(to) - parse(from)) / 3600.0

      # End time (exclusive) of an iteration given its start date and duration in days.
      def iteration_end(start_date, duration_days)
        start = Time.iso8601("#{start_date}T00:00:00Z")
        start + (duration_days * MS_PER_DAY)
      end

      def iteration_has_ended?(start_date, duration_days, now)
        now >= iteration_end(start_date, duration_days)
      end
    end
  end
end
