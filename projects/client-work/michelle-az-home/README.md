# Michelle's AZ Home Search

First proof-of-concept client project — helping Jay's girlfriend Michelle find a place in Arizona
to buy between January and March 2027. Also Adreyn's first "built something for someone else"
piece to point to later when turning this AI-for-others skillset into paid work.

**Status:** Intake form live at `/michelle-home-search`, awaiting her response.

## What's here

- `public/index.html` — the intake form itself. Custom-built (not a Google Form), COMPASS-branded,
  no login required. Captures location/timing, budget & financing, home type/size, must-haves /
  dealbreakers, an "already found something?" section (links to listings she's seen + up to 5
  reference photos she can upload directly), and four photo-reaction sections (exterior style,
  kitchen finish, living-space vibe, outdoor style) to capture taste she can't easily put into
  words.
- `server/intake-router.js` — Express router mounted into `dashboard/server.js`, ahead of the
  dashboard's auth gate. Serves the form and handles `POST /submit`, which appends to
  `data/submissions.json`, saves any uploaded reference photos under `data/uploads/<id>/`, and
  emails Adreyn a heads-up via `gws gmail +send`. Uploaded photos are resized/re-encoded
  client-side before they're sent (keeps payloads small regardless of original phone-photo size,
  and strips EXIF/GPS metadata as a side effect), and validated again server-side (fixed
  image-type allowlist, per-photo size cap, capped count) since this endpoint is intentionally
  unauthenticated.
- `data/submissions.json`, `data/uploads/` — gitignored.

## Known constraints (from Adreyn, not yet confirmed by Michelle)

- ZIP codes: **85266** (North Scottsdale — Whisper Rock/Terravita/Boulders area, natural desert
  terrain, golf communities, median home value ~$1M) and **85254** (North Phoenix/Scottsdale
  border, "magic zip code" — mixed stock of classic slump-block ranch homes and newer luxury
  modern estates, median home value ~$770K). Baked directly into the form as known, not asked —
  she can add other areas in an optional field instead of re-entering these.
- Timeline: January–March 2027
- Furnished: yes
- Landscaping: as low-maintenance as possible — she wants nothing to do with yard upkeep

## Photo curation

The exterior-style and outdoor-style photo-reaction sections are deliberately sourced to match
what's actually common in 85266/85254 — desert contemporary, Spanish/golf-community luxury,
mountain-backdrop desert estates — rather than generic "Arizona house" stock. Kitchen and
living-space photos stayed general on purpose: Unsplash is stock photography, not real listings,
so there's no meaningfully more "local" version of a kitchen photo to source — geographic
specificity mainly shows up in exterior architecture and outdoor/landscaping style, which is where
the re-curation is concentrated.

Given the median home values above, budget is still the biggest open question — these are
affluent areas, and her actual price range (still unknown) will do more to narrow real options
than any photo preference will.

## Next (phase 2, not built yet)

Once she responds: use the answers (especially budget, home type, and photo reactions) to
actually search and curate real listings in her ZIP codes and put a shortlist in front of her.
Not scoped or started — depends entirely on what her intake reveals.
