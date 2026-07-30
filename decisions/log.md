# Decision Log

Append-only. When a meaningful decision is made, log it here.

Format: [YYYY-MM-DD] DECISION: ... | REASONING: ... | CONTEXT: ...

---

[2026-07-30] DECISION: Started `projects/leads/` as a persistent tracker for Des Moines-metro food-industry freelance prospects, seeded via a one-time web-research pass — no recurring automated scanning yet. | REASONING: The anchor project (`context/work.md`) is monetizing AI-automation/marketing skills for other businesses; a durable found → contacted → pitched → won/lost pipeline is needed instead of a one-off list that goes stale, so outreach progress can actually be tracked over time. | CONTEXT: Research findings + methodology live in `references/research/des-moines-food-business-leads.md`; live tracker data in `projects/leads/data/leads.json`, surfaced via a new "Leads" tab in the dashboard (`dashboard/server.js`, `dashboard/public/index.html`). Recurring/automated re-scanning is a possible future add-on, intentionally out of scope for now.
