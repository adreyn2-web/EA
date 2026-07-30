# Des Moines Metro Food-Industry Business Leads

*Research date: 2026-07-30*

Live status for these leads is tracked in `projects/leads/data/leads.json`, not here — this
document is the point-in-time research writeup (methodology + findings as of the date above).
It doesn't get updated as leads move through contacted/pitched/won/lost; a future research pass
gets its own dated doc or an addendum section here, rather than edits to this one.

**Why**: top-of-funnel research for the freelance AI-automation/marketing anchor project
(`context/work.md`) — finding independent food-industry businesses in the Greater Des Moines
metro with real, evidence-backed signs they could use help (bad reviews, no/broken website,
dead social, chaotic marketing), pitched from Adreyn's restaurant-floor credibility.

## Methodology

Split the metro into three geographic lanes, each researched independently via live web
search/fetch (no memory-only claims): (1) Pleasant Hill + Altoona — top priority, where Adreyn
lives/works; (2) Johnston + Urbandale + Clive + Windsor Heights — Johnston weighted higher;
(3) Ankeny + West Des Moines + Des Moines proper.

Representative searches: `"<town> Iowa restaurants reviews"`, `"<town> restaurant Google
reviews 2 star / 3 star"`, `"<town> butcher shop / bakery / food truck"`, `site:facebook.com`
checks for last-post dates, `"<town> restaurant closing / struggling"` news searches,
`site:reddit.com/r/DesMoines` complaint threads, and direct Yelp/Tripadvisor/Google Maps
lookups per candidate. Most useful sources: Tripadvisor/Yelp search snippets for ratings and
quotable complaints, Axios Des Moines and local news aggregation for closure/transition
stories, and direct Instagram fetches (more reliable than Facebook, which mostly returned
HTTP 403 on direct fetch).

**Known limitations**:
- WebFetch got blocked (403) on direct Yelp/Facebook/Axios/Business Record page loads for most
  candidates — review quotes below came from Google's indexed search snippets, cross-checked
  against a second query where possible, not a raw page read. Treat "dead Facebook" claims as
  weaker/unconfirmed unless stated otherwise (Heisenberg's Instagram is the one directly
  fetched and confirmed exception).
- No independent butcher or grocer surfaced with a negative signal anywhere in the metro
  (Iowa Quality Meats, Johnston's Meat Market — both checked out clean or were blocked from
  review). West Des Moines and Des Moines-proper independents skewed toward "well-reviewed and
  thriving" in what search surfaced — a direct Google Maps sorted-by-rating pass, or an
  in-person walk of Valley Junction/Highland Park, is the likely next unlock there.
- Pleasant Hill/Altoona turned out to be a stronger dining market than expected overall, which
  is why 2 of that lane's 4 candidates are flagged unconfirmed rather than solid.

## Verified leads (9 confirmed, seeded into `projects/leads/data/leads.json`)

### Pleasant Hill / Altoona

**Charlotte's Kitchen** — restaurant, 109 8th St SE, Altoona, IA 50009
Yelp review (Jun 2025, "Diane C."): wrong order three times running, staff response to the
complaint was "our workers aren't robots" — reviewer said she wouldn't return. One of 3
locations (Johnston/Indianola/Altoona) of a small local group — still no visible marketing
function. Contact: charlotteskitchendsm.com. Source: yelp.com/biz/charlotte-s-kitchen-altoona.

**Brick & Ivy Rooftop** — restaurant/sports bar, 400 34th Ave SW, Altoona, IA
3.0★ on Yelp vs. 3.8–4.6★ for most local competitors. Specific complaints: pizza with "wet
dough in the middle" (server: "some people like it that way"), out of their signature Chicago
dog, a $20 lunch that "tasted like tomato paste," rooftop concept only open weekends. Contact:
brickandivyia.com, facebook.com/brickandivyrooftop. Source: yelp.com/biz/brick-and-ivy-altoona
(corroborated via Restaurantji).

### Johnston / Urbandale / Clive / Windsor Heights

**Cozy Cafe** — restaurant/diner, 8385 Birchwood Ct, Johnston, IA 50131
3.8/5 on Tripadvisor (103 reviews). Complaint: "the table wasn't clean when they sat down and
was sticky, as were the chairs... the place just looks like it needs a really good scrubbing."
Two competing lookalike domains for the same business suggest an unmanaged web presence.
Contact: (515) 270-8000, cozycafejohnston.com. Source: tripadvisor.com listing;
yelp.com/biz/cozy-cafe-johnston-4.

**Hungry Boyz** — sandwich shop, 3070 100th St, Urbandale, IA 50322
3.2/5 on Tripadvisor, #48 of 56 in Urbandale. Lunch wait-time complaints, staff "overwhelmed by
customer quantity." Closed Sunday, closes 2pm Saturday. Own website's menu section is
duplicated three times with a tagline contradicting the actual 15-sandwich menu. Contact:
(515) 254-9474, thehungryboyz.com (DoorDash/EatFuti links, no active Instagram found). Source:
tripadvisor.com/Restaurant_Review-g38474-d415393-Reviews-Hungry_Boyz-Urbandale_Iowa.html.

**Lara's Bakery and Market** — Mexican bakery & grocery, 1800 NW 86th St Ste 19/20, Clive, IA
50325 (est. 2004)
Wild rating spread: 2.4/5 on Restaurant Guru (303 reviews) vs. 4.3 on Google vs. 4.0 on Yelp
(14 reviews, 3 one-star). March 2025 review: "It's ok... baked goods were just ok." No online
ordering; hours hidden behind a click-through link; a site testimonial shows an apparently
glitched future date. Contact: (515) 276-5589, larasbakeryandmarket.com. Source:
restaurantguru.com/Laras-Bakery-Des-Moines; yelp.com/biz/laras-bakery-clive.

**La Bonita Mexican Grill & Cantina** — restaurant, 6611 University Ave Ste 100, Windsor
Heights, IA 50324 (recent rebrand from Mojito's Mexican Grill, same address)
Under the prior "Mojito's" name: a detailed 1-star review of a pickup order left waiting an
hour with nothing correct, no host stand to manage pickup/dine-in collisions. New ownership has
thin reviews (96% recommend on only 24 Facebook reviews) and two competing domains for the same
restaurant. Contact: (515) 255-9411, labonitaiowa.com, @labonitamexicangrill. Source: aggregated
search citing the old Tripadvisor/Yelp review for Mojito's; labonitaiowa.com.

**Heisenberg Mediterranean Food Truck** — food truck, operates around 7211 Apple Valley Dr,
Windsor Heights, IA 50324 — *strongest single signal in this batch*
Confirmed via direct Instagram fetch: @heisenberg.mediterranean last posted November 1, 2021
(4+ years dormant), 61 followers, ~12 posts total, yet still listed with current weekly hours
on StreetFoodFinder/Yelp/Restaurantji with sparse but positive reviews (Yelp 5.0/5 on 1 review;
Restaurantji 26 reviews). No website or Facebook found. Contact: (515) 525-7119, Instagram
@heisenberg.mediterranean (inactive). Source: direct Instagram fetch; streetfoodfinder.com/
Heisenberg; yelp.com/biz/heisenberg-mediterranean-food-windsor-heights.

### Ankeny / West Des Moines / Des Moines

**Curbin' Cuisine** — fast-casual + catering, 1325 SW Oralabor Rd Ste 200, Ankeny, IA 50023
Axios Des Moines (Dec 3, 2025): owners Jarrod and Misty Fontanini have put the restaurant up
for sale to slow down for family reasons. Established, active (92 Yelp reviews), currently in
an ownership-transition window. Contact: (515) 635-0090, facebook.com/CurbinCuisine, Grubhub/
Seamless. Source: axios.com/local/des-moines/2025/12/03/curbin-cuisine-restaurant-owners-seek-
buyer; yelp.com/biz/curbin-cuisine-ankeny-2.

**Ankeny Cafe** — breakfast diner, 310 S Ankeny Blvd, Ankeny, IA 50023
Only 23 Yelp reviews; #23 of 126 in Ankeny on Tripadvisor (4.1/5). Specific negative review:
30+ min wait, biscuits and gravy "bland and less than impressive," eggs "below average,"
reviewer "not likely to return." Closed Sunday. Contact: (515) 964-9897, Facebook page exists
(posting activity unconfirmed), no dedicated website found. Source: tripadvisor.com/
Restaurant_Review-g29360-d415233-Reviews-Ankeny_Cafe-Ankeny_Iowa.html; yelp.com/biz/ankeny-
cafe-ankeny-2.

## Unconfirmed — worth checking in person, not yet seeded as solid leads

**Pit Stop BBQ** (food truck, Pleasant Hill 50327) — only a Yelp listing + phone number turned
up ((515) 771-7216); couldn't confirm a dedicated website or Facebook distinct from an
unrelated same-named truck in Massachusetts. Reads like thin web presence but unverified.

**Unknown new occupant of the old Claxon's Smokehouse building** (3131 8th St SW, Altoona) —
Claxon's, a 30-year Altoona institution, closed October 2023 on owner retirement; building sold
with plans for a new restaurant. Search couldn't confirm what's there now or whether it's open
— worth a drive-by. Not seeded into the tracker since there's no confirmed business name to
attach a lead to yet.

## Noted but out of scope

**The Ducktail Lounge** (Clive) — a car crashed into the building July 26, 2026 (~$100k
damage), an obvious "help us relaunch" angle — but it's a cocktail/cigar lounge, not
restaurant/butcher/grocer/bakery/food-truck, so it's excluded per the defined scope. Flagging
in case the category boundary is worth relaxing later.

## Next action

Start with **Heisenberg Mediterranean Food Truck** — the strongest, most directly verified
signal (4+ years dormant social, still actively operating) and the easiest, cheapest possible
first win to prove value fast: revive the account and stand up a one-page site, then use it as
a concrete before/after case for the next pitch. Reach out this week.
