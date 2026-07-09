# frozen_string_literal: true

require_relative "test_helper"

class NotifyTest < Minitest::Test
  include Builders

  def test_to_slack_mrkdwn
    out = Boardly::Notify.to_slack_mrkdwn("## Title\nSome **bold** and a [link](https://x.dev).")
    assert_match(/^\*Title\*/, out)
    assert_match(/\*bold\*/, out)
    assert_match(%r{<https://x\.dev\|link>}, out)
  end

  def test_broadcasts_to_all_channels_and_records_audit
    audit = Boardly::Audit.new(false)
    a = FakeChannel.new("slack")
    b = FakeChannel.new("email")
    notifier = Boardly::Notify::Notifier.new([a, b], false, audit)

    notifier.broadcast(Boardly::Notify::Report.new(feature: "digest", title: "Sprint digest", markdown: "body"))

    assert_equal 1, a.sent.length
    assert_equal 1, b.sent.length
    assert_equal 2, audit.count
  end

  def test_dry_run_records_but_does_not_send
    audit = Boardly::Audit.new(true)
    ch = FakeChannel.new("slack")
    Boardly::Notify::Notifier.new([ch], true, audit).broadcast(Boardly::Notify::Report.new(feature: "standup", title: "S", markdown: "b"))
    assert_equal 0, ch.sent.length
    assert_equal 1, audit.count
  end

  def test_failing_channel_does_not_abort_siblings
    audit = Boardly::Audit.new(false)
    boom = Object.new
    def boom.name = "boom"
    def boom.target = "x"
    def boom.send(_r) = raise("down")
    ok = FakeChannel.new("ok")

    Boardly::Notify::Notifier.new([boom, ok], false, audit).broadcast(Boardly::Notify::Report.new(feature: "digest", title: "t", markdown: "b"))

    assert_equal 1, ok.sent.length
  end

  def test_build_creates_slack_only_when_env_present
    cfg = make_config(notifications: { slack: { enabled: true, webhook_env: "HOOK" } })
    assert_equal 0, Boardly::Notify::Notifier.build(cfg, {}, false, Boardly::Audit.new(false)).channel_count
    assert_equal 1, Boardly::Notify::Notifier.build(cfg, { "HOOK" => "https://hooks.slack" }, false, Boardly::Audit.new(false)).channel_count
  end
end
