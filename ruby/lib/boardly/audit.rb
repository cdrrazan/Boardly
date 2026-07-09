# frozen_string_literal: true

module Boardly
  Entry = Struct.new(:feature, :action, :target, :detail, :applied, keyword_init: true)

  # Collects every action a run takes (or would take, under dry-run) and flushes
  # it to the Actions job summary plus the run log — the "audit trail".
  class Audit
    def initialize(dry_run)
      @dry_run = dry_run
      @entries = []
    end

    # Record one action *before* performing the mutation, so the trail is
    # identical whether or not dry-run suppresses the change.
    def record(feature, action, target, detail)
      @entries << Entry.new(feature: feature, action: action, target: target, detail: detail, applied: !@dry_run)
      prefix = @dry_run ? "[dry-run] would " : ""
      puts "#{prefix}#{feature} · #{action} · #{target} — #{detail}"
    end

    def count = @entries.length

    # Render the accumulated actions as a Markdown table into the job summary.
    def flush(project_title)
      summary = ENV["GITHUB_STEP_SUMMARY"]
      return if summary.nil? || summary.empty?

      out = +"## Boardly\n\n"
      if @entries.empty?
        out << "No actions taken on **#{project_title}**.\n"
      else
        note = @dry_run ? " _(dry-run — nothing was changed)_" : ""
        out << "#{@entries.length} action(s) on **#{project_title}**#{note}\n\n"
        out << "| Feature | Action | Target | Detail | Applied |\n|---|---|---|---|---|\n"
        @entries.each do |e|
          out << "| #{e.feature} | #{e.action} | #{escape(e.target)} | #{escape(e.detail)} | #{e.applied ? "yes" : "dry-run"} |\n"
        end
      end
      File.write(summary, out, mode: "a")
    end

    private

    def escape(text) = text.to_s.gsub("|", "\\|").gsub("\n", " ")
  end
end
