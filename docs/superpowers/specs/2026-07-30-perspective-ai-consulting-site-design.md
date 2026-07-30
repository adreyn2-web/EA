# Perspective AI Consulting — Portfolio Site Design

## Context

Adreyn is building a freelance AI-automation/marketing consulting business
("Perspective AI Consulting," matching his existing `adreynf@perspectiveautomation.com`
email) targeting small, independent Des Moines-metro food businesses (see
`projects/leads/`). Before pitching anyone, he needs his own web presence — right now he has
none beyond a personal Facebook account, which undercuts credibility for someone pitching web
presence to other businesses. This is a single-page portfolio/brand site: no clients or case
studies yet, so it has to be honest about that while still making a real case for hiring him.

## Approach

Single-page static site (chosen over a multi-page site or a bare services-only brochure — see
prior discussion). Rationale: he's landing clients through direct outreach and in-person
credibility, not inbound search traffic, so a multi-page SEO-oriented structure buys nothing
right now; and the whole point of the positioning is his restaurant-floor credibility, which
needs real page space, ruling out a bare brochure.

## Content sections (in order)

1. **Hero** — "Perspective AI Consulting" + one-line positioning ("AI automation and
   marketing help for restaurants and food businesses — from someone who's actually worked the
   floor") + Greater Des Moines, IA location line.
2. **Why me** — honest credibility, no fabrication: years of restaurant service work (two
   current jobs), firsthand view of what actually breaks (order mix-ups, slow tickets, no
   online presence, dead social accounts), framed as the discipline behind building
   AI-automation tooling. Explicitly no fake testimonials or client logos — there are none yet.
3. **Services** — four cards, each a short (1-2 sentence) description tied to a *generic*
   problem, not a named business:
   - Website / Online Ordering Setup
   - Review & Reputation Management
   - Social Media Revival & Management
   - Workflow & Automation Consulting
4. **Contact** — single "Get in touch" `mailto:adreynf@perspectiveautomation.com` link. No
   phone number (none provided) — easy to add later if wanted.
5. **Footer** — brand name, Greater Des Moines, IA.

**Constraint carried from design discussion**: `references/research/des-moines-food-business-
leads.md` and `projects/leads/data/leads.json` name real local businesses and their specific
flaws (bad reviews, dead social, etc.). None of that content, or anything that could be traced
back to a specific named business, appears anywhere on this public site — several of those
businesses are leads he may pitch later, and publicly airing their flaws would torch that
relationship before it starts. Services section problem framing must stay generic/composite.

## Technical design

- **New standalone repo**, separate from the private `Compass` repo, on the `adreyn2-web`
  GitHub account. Public (required for free GitHub Pages on a non-Pro account). Suggested name:
  `perspective-ai-consulting-site`.
- **Stack**: plain HTML/CSS/vanilla JS, no framework, no build step — matches the existing
  Compass dashboard's stack and is the simplest thing that works on GitHub Pages with zero
  tooling.
- **Structure**: `index.html`, one stylesheet (e.g. `styles.css`), minimal/no JS (a single
  scrolling page with mailto links needs little to no interactivity — add only if the visual
  design calls for something like a mobile nav toggle).
- **Hosting**: GitHub Pages, deployed from `main` branch root (Settings → Pages → Deploy from
  a branch → `main` / `/`).
- **Custom domain**: a `CNAME` file at the repo root containing `perspectiveautomation.com`
  (apex domain as primary, `www` redirecting to it). Adreyn owns the domain already (matches
  his existing email) but its registrar/DNS panel isn't something this session has access to —
  he'll need to add the DNS records himself. The implementation plan must include the exact
  records to add (GitHub Pages' standard apex A-records pointing at GitHub's IPs, plus a `www`
  CNAME record), written out clearly enough to paste into whatever registrar he uses.
- **Visual design**: deferred to the `frontend-design` skill at implementation time, to avoid
  defaulting to generic "AI consultant" blue-gradient-robot visual clichés. Direction brief:
  professional but approachable, not corporate.

## Testing / verification

- Open `index.html` locally in a browser before pushing, check all sections render and the
  mailto link opens a compose window with the right address.
- Check mobile viewport (this is a portfolio link he'll likely share from his phone) — no
  horizontal scroll, readable type size, cards stack sensibly on narrow screens.
- After GitHub Pages deploy: confirm the `github.io` URL serves the site correctly first (before
  DNS is even touched), then after Adreyn adds the DNS records, confirm the custom domain
  resolves and serves over HTTPS (GitHub Pages auto-provisions a cert once DNS is correctly
  pointed, but this can take up to 24h — should be checked, not assumed).
- Skim for typos/broken links as a final pass — this is public and represents him to
  prospective clients.

## Out of scope (explicitly deferred, per Adreyn — "we'll work on everything else later")

- LinkedIn profile/content.
- A documented case study (e.g. Heisenberg food truck) — the site is structured so a "Recent
  Work" section could be added later without a redesign, but nothing gets added now since there
  isn't one yet.
- A real contact form (would need a third-party service like Formspree since GitHub Pages has
  no backend) — mailto/tel links only for now.
- Any content pulled from or referencing `projects/leads/` or the food-business research doc.
