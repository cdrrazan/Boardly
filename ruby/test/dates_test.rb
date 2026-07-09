# frozen_string_literal: true

require_relative "test_helper"
require "boardly/util/dates"

class DatesTest < Minitest::Test
  D = Boardly::Util::Dates

  def test_days_between
    assert_in_delta 3.0, D.days_between("2026-07-01T00:00:00Z", "2026-07-04T00:00:00Z"), 0.0001
  end

  def test_hours_between
    assert_in_delta 6.5, D.hours_between("2026-07-01T00:00:00Z", "2026-07-01T06:30:00Z"), 0.0001
  end

  def test_iteration_has_ended
    assert D.iteration_has_ended?("2026-06-01", 14, Time.iso8601("2026-06-16T00:00:00Z"))
    refute D.iteration_has_ended?("2026-06-01", 14, Time.iso8601("2026-06-10T00:00:00Z"))
  end
end
