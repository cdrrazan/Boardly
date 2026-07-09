# frozen_string_literal: true

require_relative "test_helper"

class ConfigTest < Minitest::Test
  def test_applies_defaults
    cfg = Boardly::Config.new(project: { owner: "acme", number: 3 }, features: {})
    assert_equal "org", cfg.project[:type]
    assert_equal "Status", cfg.fields[:status]
    assert_equal ["Done"], cfg.done_statuses
    assert_equal false, cfg.features[:rollover][:enabled]
  end

  def test_rejects_missing_project_number
    err = assert_raises(Boardly::ConfigError) { Boardly::Config.new(project: { owner: "acme" }, features: {}) }
    assert_match(/project.number/, err.message)
  end

  def test_rejects_post_to_without_issue_or_title
    err = assert_raises(Boardly::ConfigError) do
      Boardly::Config.new(project: { owner: "acme", number: 1 }, features: { digest: { enabled: true, post_to: {} } })
    end
    assert_match(/postTo: requires/, err.message)
  end

  def test_notifications_slack_defaults
    cfg = Boardly::Config.new(project: { owner: "acme", number: 1 }, features: {}, notifications: { slack: { enabled: true } })
    assert_equal "SLACK_WEBHOOK_URL", cfg.notifications[:slack][:webhook_env]
  end
end
