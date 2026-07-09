# 13 · Send digests & alerts to Slack and email

**Feature:** Slack & email notifications · **Who it's for:** teams who live in Slack or inbox, not the GitHub issues tab.

## The problem

Your sprint digest and daily standup land as GitHub issue comments — but the team actually reads Slack, and your lead wants the digest by email. You want the same reports delivered where people already are.

## The setup

Add a `notifications` block. Secrets are referenced by **env-var name** and supplied from encrypted secrets via the workflow — never inline them here.

```yaml
# project-automation.yml
notifications:
  slack:
    enabled: true
    webhookEnv: SLACK_WEBHOOK_URL
  email:
    enabled: true
    host: smtp.example.com
    port: 587
    secure: false            # true for port 465
    userEnv: SMTP_USER
    passwordEnv: SMTP_PASS
    from: "Boardly <bot@example.com>"
    to: ["team@example.com", "lead@example.com"]
```

```yaml
# workflow — map secrets into the environment
- uses: cdrrazan/Boardly@v1
  with:
    token: ${{ secrets.PROJECT_AUTOMATION_TOKEN }}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
    SMTP_USER: ${{ secrets.SMTP_USER }}
    SMTP_PASS: ${{ secrets.SMTP_PASS }}
```

Create the Slack webhook at **Slack → Apps → Incoming Webhooks**, and store its URL as the `SLACK_WEBHOOK_URL` repo secret.

## What happens

Whenever Boardly posts a **sprint digest**, a **daily standup**, or a **stale-card alert** to GitHub, it *also* broadcasts the same report to every enabled channel:

- **Slack** — the report is converted to Slack mrkdwn and posted to the channel behind the webhook.
- **Email** — the report is sent to every address in `to`, with the report title as the subject.

## Good to know

- Both channels are **optional and independent** — enable either, both, or neither.
- A channel failure is logged as a warning and **never aborts the run** or the other channel.
- Nothing is sent under **`dry-run`** — the intended sends are just recorded in the audit trail.
- GitHub comments still happen as before; Slack/email are *additional* delivery, not a replacement.
- Nudge alerts are summarized for chat (they don't carry GitHub @mentions, which only resolve on GitHub) — the assignee logins are included as text.
