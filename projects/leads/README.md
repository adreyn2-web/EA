# Leads

Freelance client prospecting tracker — the top-of-funnel piece of the AI-automation/marketing
anchor project (`context/work.md`). Distinct from `projects/client-work/`, which is fulfillment
for an already-known contact; this is for finding and tracking candidate businesses before any
relationship exists.

## Scope

Small food-industry businesses (restaurants, butchers, food retail/grocers, bakeries,
food trucks) in the Des Moines, Iowa metro area — weighted toward Pleasant Hill (50327),
Johnston, and Altoona given Adreyn's home/work locations — that show real, evidence-backed
signs of struggling (bad/declining reviews, no or broken website, stale/dead social accounts,
visibly chaotic or absent marketing) and could plausibly use automation, content, or marketing
help pitched from restaurant-floor credibility.

## Data

`data/leads.json` (gitignored) — flat array, one object per lead:

```json
{
  "id": "lead_3f9a21bc",
  "business_name": "...",
  "category": "restaurant | butcher | food-retail/grocer | bakery | food-truck | other",
  "location": "...",
  "signals": ["no website found", "..."],
  "outreach_angle": "...",
  "contact": { "phone": null, "website": null, "social": null, "email": null },
  "status": "found | contacted | pitched | won | lost",
  "source": "...",
  "date_added": "YYYY-MM-DD",
  "updated_at": "YYYY-MM-DD",
  "notes": ""
}
```

`status` is the one real fixed progression (drives the dashboard's grouping). Everything else
is free text — this is a single-user, agent-assisted file, not a shared system, so there's no
enum validation beyond that.

## How leads get found

Currently manual/agent-driven: a live web-search research pass (WebSearch/WebFetch), run
on request — not a recurring automated scan. No scraper exists or is planned against this
data; there's no infrastructure for that and it's a ToS gray area against sites like Yelp/Google.
If a recurring scan ever gets built, that's the point to add a `config/target.json` for the
search parameters — building it now would have no reader.

Each research pass's methodology and findings get written up in
`references/research/<topic>.md` per the `research-routine` skill's convention; the same
findings get seeded into `data/leads.json` as the operational, evolving copy. The markdown
doc is a point-in-time writeup — it doesn't get edited as leads move through the pipeline.

## Dashboard

Surfaced under the **Leads** tab: add a lead manually, see leads grouped by status
(found → contacted → pitched → won/lost), advance status, add notes, or remove a lead.
