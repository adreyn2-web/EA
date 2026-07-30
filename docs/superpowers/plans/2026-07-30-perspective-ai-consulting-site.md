# Perspective AI Consulting Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a single-page static portfolio site for "Perspective AI Consulting" (Adreyn's freelance AI-automation/marketing consulting brand) at `perspectiveautomation.com`, hosted free on GitHub Pages from a new standalone public repo.

**Architecture:** Plain HTML/CSS, zero build step, zero JS framework — one `index.html` with five sections (Hero, Why Me, Services, Contact, Footer) and one `styles.css`. Deployed via GitHub Pages from a new public repo (`adreyn2-web/perspective-ai-consulting-site`), with a `CNAME` file pointing the apex custom domain at it.

**Tech Stack:** HTML5, CSS3 (no preprocessor), no JavaScript unless the visual design in Task 4 genuinely needs it. `git` + `gh` CLI (already authenticated as `adreyn2-web`, confirmed `repo` scope) for repo creation/push.

## Global Constraints

- Brand name displayed on the site: **"Perspective AI Consulting"** (exact string).
- Contact email: **`adreynf@perspectiveautomation.com`** (exact string) — mailto link only, no contact form, no backend.
- No fabricated testimonials, client logos, or case studies anywhere on the site — there are no clients yet.
- No content anywhere on the site may name, quote, or otherwise identify any specific business from `references/research/des-moines-food-business-leads.md` or `projects/leads/data/leads.json`. Service copy stays generic/composite.
- Repo location: new standalone directory at `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/` — a separate git repo, NOT nested inside or committed to the `Compass` repo.
- GitHub repo: public (required for free GitHub Pages), account `adreyn2-web`, suggested name `perspective-ai-consulting-site`.
- Deploy target: GitHub Pages, source = `main` branch, root (`/`).
- Custom domain: `perspectiveautomation.com` (apex), via a `CNAME` file at repo root containing exactly `perspectiveautomation.com`.

---

### Task 1: Scaffold the repo and base HTML/CSS skeleton

**Files:**
- Create: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/index.html`
- Create: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/styles.css`
- Create: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/.gitignore`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `index.html` with five empty section containers with fixed IDs — `#hero`, `#why-me`, `#services`, `#contact`, `#footer` — that Tasks 2-3 fill in, and a `<link rel="stylesheet" href="styles.css">` in `<head>`. `styles.css` exists (can be near-empty — Task 4 fills it in) so the link doesn't 404.

- [ ] **Step 1: Create the project directory and git repo**

```bash
mkdir -p /Users/adreynfausett/Desktop/perspective-ai-consulting-site
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
git init
```

- [ ] **Step 2: Write `.gitignore`**

```
.DS_Store
```

- [ ] **Step 3: Write the base `index.html` skeleton**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Perspective AI Consulting — AI Automation for Restaurants &amp; Food Businesses</title>
  <meta name="description" content="AI automation and marketing help for restaurants and food businesses in the Greater Des Moines metro — from someone who's actually worked the floor.">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <section id="hero"></section>
  <section id="why-me"></section>
  <section id="services"></section>
  <section id="contact"></section>
  <footer id="footer"></footer>
</body>
</html>
```

- [ ] **Step 4: Write a placeholder `styles.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; }
```

- [ ] **Step 5: Verify the skeleton**

Run:
```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const required = ['<section id=\"hero\">', '<section id=\"why-me\">', '<section id=\"services\">', '<section id=\"contact\">', '<footer id=\"footer\">', 'styles.css', 'Perspective AI Consulting'];
const missing = required.filter(s => !html.includes(s));
if (missing.length) { console.error('FAIL — missing:', missing); process.exit(1); }
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 6: Commit**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
git add index.html styles.css .gitignore
git commit -m "Scaffold site skeleton"
```

---

### Task 2: Hero and Why Me content

**Files:**
- Modify: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/index.html` (fill `#hero` and `#why-me`)

**Interfaces:**
- Consumes: `#hero` and `#why-me` empty section containers from Task 1.
- Produces: `#hero` containing an `<h1>` with the exact brand name, a positioning subhead, and a location line; `#why-me` containing an `<h2>` and a body paragraph. Task 3 does not depend on the internals of this content, only that these sections exist (already true from Task 1).

- [ ] **Step 1: Write a content check (will fail — content not written yet)**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const required = [
  'Perspective AI Consulting',
  'AI automation and marketing help for restaurants and food businesses',
  'actually worked the floor',
  'Greater Des Moines',
  'Why work with me',
];
const missing = required.filter(s => !html.includes(s));
if (missing.length) { console.error('FAIL — missing:', missing); process.exit(1); }
console.log('PASS');
"
```
Expected: `FAIL` (content not written yet)

- [ ] **Step 2: Fill in `#hero` and `#why-me`**

Replace `<section id="hero"></section>` with:

```html
  <section id="hero">
    <h1>Perspective AI Consulting</h1>
    <p class="tagline">AI automation and marketing help for restaurants and food businesses — from someone who's actually worked the floor.</p>
    <p class="location">Serving the Greater Des Moines, Iowa metro.</p>
    <a class="cta" href="#contact">Get in Touch</a>
  </section>
```

Replace `<section id="why-me"></section>` with:

```html
  <section id="why-me">
    <h2>Why work with me</h2>
    <p>I've spent years on restaurant floors — taking orders, running food, handling the moment a ticket goes out wrong and a guest is standing right in front of you. I know what a bad night actually costs a small food business, because I've lived it from the inside. Now I build AI-powered automation and marketing systems for exactly these problems: the website nobody's updated, the reviews nobody's answering, the social account that's gone quiet. I'm not an agency guessing at your business — I'm someone who's worked yours.</p>
  </section>
```

- [ ] **Step 3: Re-run the content check**

Run the same command from Step 1.
Expected: `PASS`

- [ ] **Step 4: Commit**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
git add index.html
git commit -m "Add hero and why-me content"
```

---

### Task 3: Services, Contact, Footer content — plus the no-named-businesses guard

**Files:**
- Modify: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/index.html` (fill `#services`, `#contact`, `#footer`)

**Interfaces:**
- Consumes: `#services`, `#contact`, `#footer` empty section containers from Task 1.
- Produces: `#services` containing four `<article class="service-card">` blocks (title + description) — Task 4's CSS targets `.service-card` for the card layout, so this exact class name must be used. `#contact` containing a `mailto:` link with the exact address. `#footer` containing the brand name and location.

- [ ] **Step 1: Write a content + guard check (will fail — content not written yet)**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const required = [
  'Website &amp; Online Ordering',
  'Review &amp; Reputation Management',
  'Social Media Revival &amp; Management',
  'Workflow &amp; Automation Consulting',
  'mailto:adreynf@perspectiveautomation.com',
  'service-card',
  'Perspective AI Consulting',
];
const missing = required.filter(s => !html.includes(s));
if (missing.length) { console.error('FAIL — missing:', missing); process.exit(1); }

// Guard: none of the real leads-research business names may appear anywhere on the public site.
const bannedNames = [
  \"Charlotte's Kitchen\", 'Brick & Ivy', 'Pit Stop BBQ', 'Cozy Cafe', 'Hungry Boyz',
  \"Lara's Bakery\", 'La Bonita', 'Heisenberg', \"Curbin' Cuisine\", 'Ankeny Cafe',
];
const leaked = bannedNames.filter(n => html.includes(n));
if (leaked.length) { console.error('FAIL — leaked lead business names:', leaked); process.exit(1); }

console.log('PASS');
"
```
Expected: `FAIL` (content not written yet)

- [ ] **Step 2: Fill in `#services`**

Replace `<section id="services"></section>` with:

```html
  <section id="services">
    <h2>What I do</h2>
    <div class="services-grid">
      <article class="service-card">
        <h3>Website &amp; Online Ordering</h3>
        <p>If your site is outdated, missing, or doesn't take orders, you're losing business to whoever shows up first in a search. I'll build or fix what you have so it actually works for you.</p>
      </article>
      <article class="service-card">
        <h3>Review &amp; Reputation Management</h3>
        <p>A bad review answered well can save a customer. Answered poorly — or not at all — it costs you the next ten who read it. I set up a simple system for responding fast and right.</p>
      </article>
      <article class="service-card">
        <h3>Social Media Revival &amp; Management</h3>
        <p>A dead account is worse than no account — it tells people you've stopped caring. I'll get yours active again and keep it that way.</p>
      </article>
      <article class="service-card">
        <h3>Workflow &amp; Automation Consulting</h3>
        <p>The back-end stuff — scheduling, inventory, ordering, reporting — eats time you don't have. I build automation that gives it back.</p>
      </article>
    </div>
  </section>
```

- [ ] **Step 3: Fill in `#contact`**

Replace `<section id="contact"></section>` with:

```html
  <section id="contact">
    <h2>Get in Touch</h2>
    <p>Tell me what's not working and I'll tell you honestly whether I can help.</p>
    <a class="cta" href="mailto:adreynf@perspectiveautomation.com?subject=Let%27s%20talk">Email Me</a>
  </section>
```

- [ ] **Step 4: Fill in `#footer`**

Replace `<footer id="footer"></footer>` with:

```html
  <footer id="footer">
    <p>Perspective AI Consulting — Greater Des Moines, IA</p>
  </footer>
```

- [ ] **Step 5: Re-run the content + guard check**

Run the same command from Step 1.
Expected: `PASS`

- [ ] **Step 6: Commit**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
git add index.html
git commit -m "Add services, contact, and footer content"
```

---

### Task 4: Visual design pass

**Files:**
- Modify: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/styles.css`
- Read first: use the `frontend-design` skill (`.claude/skills/frontend-design/` in the Compass repo) for aesthetic direction before writing CSS — direction brief from the spec: "professional but approachable, not corporate," avoiding generic blue-gradient-robot AI-consultant visual clichés.

**Interfaces:**
- Consumes: the class names/IDs produced by Tasks 1-3 (`#hero`, `.tagline`, `.location`, `.cta`, `#why-me`, `#services`, `.services-grid`, `.service-card`, `#contact`, `#footer`).
- Produces: a fully styled, responsive page. No new HTML structure — if the visual design genuinely requires an added wrapper/class, add it here and note it, but prefer working with what Tasks 1-3 already produced.

- [ ] **Step 1: Invoke the `frontend-design` skill for direction**

Read `.claude/skills/frontend-design/SKILL.md` in the Compass repo and apply its guidance (typography choice, color approach, layout conventions) to this specific brief — a solo consultant's credibility site, not a SaaS product page.

- [ ] **Step 2: Write the full `styles.css`**

Implement, at minimum: a deliberate type scale and font pairing (not the browser default system stack alone — pick something with intention per the frontend-design skill), a color palette that isn't generic blue/purple AI-gradient, a `.services-grid` that lays out 4 `.service-card` elements in a 2x2 grid on desktop and stacks to 1 column under ~600px width, comfortable line-length/padding on `#why-me`'s body paragraph (don't let it stretch full-width on large screens), and visible hover/focus states on `.cta` links.

- [ ] **Step 3: Verify no horizontal overflow at mobile width**

Run:
```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
python3 -m http.server 8123 &
sleep 1
```
Then open `http://localhost:8123` in a browser, use dev tools to set viewport width to 375px, and confirm: no horizontal scrollbar, all text readable without zooming, `.services-grid` has collapsed to one column, the `.cta` buttons are easily tappable (not tiny).

Stop the server when done:
```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
git add styles.css
git commit -m "Apply visual design"
```

---

### Task 5: Favicon and social preview meta tags

**Files:**
- Create: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/favicon.svg`
- Modify: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/index.html` (add favicon link + Open Graph tags to `<head>`)

**Interfaces:**
- Consumes: nothing new.
- Produces: a favicon that shows in browser tabs, and Open Graph tags so the link looks right when shared (e.g. texted to a prospect, or pasted somewhere).

- [ ] **Step 1: Create a simple SVG favicon**

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#1a1a1a"/><text x="50" y="68" font-size="60" text-anchor="middle" fill="#fff" font-family="system-ui, sans-serif">P</text></svg>
```
Save as `favicon.svg`. (If Task 4's chosen palette has a more fitting background color than `#1a1a1a`, use that instead — keep it consistent with the site's actual palette.)

- [ ] **Step 2: Add favicon and Open Graph tags to `<head>`**

Add inside `<head>`, after the existing `<meta name="description" ...>` line:

```html
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <meta property="og:title" content="Perspective AI Consulting">
  <meta property="og:description" content="AI automation and marketing help for restaurants and food businesses in the Greater Des Moines metro.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://perspectiveautomation.com">
```

- [ ] **Step 3: Verify**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const required = ['favicon.svg', 'og:title', 'og:description', 'og:url'];
const missing = required.filter(s => !html.includes(s));
if (missing.length) { console.error('FAIL — missing:', missing); process.exit(1); }
if (!fs.existsSync('favicon.svg')) { console.error('FAIL — favicon.svg not created'); process.exit(1); }
console.log('PASS');
"
```
Expected: `PASS`

- [ ] **Step 4: Commit**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
git add favicon.svg index.html
git commit -m "Add favicon and social preview meta tags"
```

---

### Task 6: Create the GitHub repo, add CNAME, push, enable Pages

**Files:**
- Create: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/CNAME`
- Create: `/Users/adreynfausett/Desktop/perspective-ai-consulting-site/README.md`

**Interfaces:**
- Consumes: the finished site from Tasks 1-5.
- Produces: a live GitHub Pages deployment reachable at `https://adreyn2-web.github.io/perspective-ai-consulting-site/` and (after Task 7's manual DNS step) `https://perspectiveautomation.com`.

- [ ] **Step 1: Write the `CNAME` file**

File contents (exactly, no trailing content beyond the domain and a newline):
```
perspectiveautomation.com
```

- [ ] **Step 2: Write a minimal `README.md`**

```markdown
# Perspective AI Consulting

Portfolio site for Perspective AI Consulting, deployed via GitHub Pages at
[perspectiveautomation.com](https://perspectiveautomation.com).

Plain HTML/CSS, no build step. Edit `index.html` / `styles.css` directly and push to `main` to deploy.
```

- [ ] **Step 3: Commit the deploy files**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
git add CNAME README.md
git commit -m "Add CNAME and README for GitHub Pages deploy"
```

- [ ] **Step 4: Confirm `gh` auth before creating a public repo (stop and confirm with Adreyn first — this step makes the repo and its content public)**

```bash
gh auth status
```
Expected: logged in as `adreyn2-web` with `repo` scope (already confirmed during planning). Since this creates a new **public** repo visible to anyone, pause here and get an explicit go-ahead before running Step 5 — this is the one genuinely hard-to-reverse action in this whole plan.

- [ ] **Step 5: Create the GitHub repo and push**

```bash
cd /Users/adreynfausett/Desktop/perspective-ai-consulting-site
gh repo create perspective-ai-consulting-site --public --source=. --remote=origin --push
```

- [ ] **Step 6: Enable GitHub Pages from the `main` branch root**

```bash
gh api repos/adreyn2-web/perspective-ai-consulting-site/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```
If that returns an error because Pages is already auto-detected (GitHub sometimes enables it automatically once a repo has an `index.html` on `main`), verify instead with:
```bash
gh api repos/adreyn2-web/perspective-ai-consulting-site/pages
```
Expected: JSON showing `"status"` progressing to `"built"` within a minute or two, and a `"html_url"` of `https://adreyn2-web.github.io/perspective-ai-consulting-site/`.

- [ ] **Step 7: Verify the `github.io` URL serves the site**

```bash
sleep 60
curl -s -o /dev/null -w "%{http_code}\n" https://adreyn2-web.github.io/perspective-ai-consulting-site/
```
Expected: `200`. (GitHub Pages builds can take a minute or two after enabling — if this returns `404`, wait another minute and retry rather than assuming failure.)

---

### Task 7: Point the custom domain and do final verification

**Files:** none (DNS configuration happens outside this repo, at Adreyn's domain registrar — this task is mostly instructions to hand him plus a verification step once he's done it).

**Interfaces:**
- Consumes: the live GitHub Pages deployment from Task 6.
- Produces: `https://perspectiveautomation.com` resolving to the site over HTTPS.

- [ ] **Step 1: Give Adreyn the exact DNS records to add**

Tell him to add these at whichever registrar/DNS provider manages `perspectiveautomation.com` (this cannot be done from this session — no access to his registrar):

For the apex domain (`perspectiveautomation.com`), four `A` records all pointing at GitHub Pages' IPs:
```
A    @    185.199.108.153
A    @    185.199.109.153
A    @    185.199.110.153
A    @    185.199.111.153
```
For `www` (so `www.perspectiveautomation.com` redirects to the apex):
```
CNAME    www    adreyn2-web.github.io.
```

- [ ] **Step 2: Set the custom domain in the repo's Pages settings**

```bash
gh api repos/adreyn2-web/perspective-ai-consulting-site/pages -X PUT -f "cname=perspectiveautomation.com"
```
(The `CNAME` file already committed in Task 6 does this too, via the standard GitHub Pages convention — this API call is a belt-and-suspenders confirmation that the setting is registered.)

- [ ] **Step 3: Verify DNS + HTTPS once Adreyn confirms the records are added**

DNS propagation can take anywhere from a few minutes to ~24 hours. Once Adreyn says he's added the records:

```bash
dig +short perspectiveautomation.com
```
Expected: the four GitHub Pages IPs listed in Step 1.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://perspectiveautomation.com
```
Expected: `200`. If this fails right after DNS looks correct, GitHub's automatic HTTPS certificate provisioning can lag behind DNS propagation by up to another 24h — re-check later rather than treating it as broken.

- [ ] **Step 4: Final content skim**

Open `https://perspectiveautomation.com` (or the `github.io` URL if DNS hasn't propagated yet) and read the whole page top to bottom for typos, broken formatting, or anything that reads oddly — this is public and represents Adreyn to prospective clients.

---

## Self-Review Notes

- **Spec coverage**: Hero ✓ (Task 2), Why Me ✓ (Task 2), Services ✓ (Task 3), Contact ✓ (Task 3), Footer ✓ (Task 3), no-fabricated-testimonials constraint ✓ (Task 2/3 copy contains none, nothing to guard-check since there's no mechanism that could introduce one), no-named-leads-businesses constraint ✓ (Task 3 guard check), visual design deferred to frontend-design skill ✓ (Task 4), standalone repo/GitHub Pages/custom domain ✓ (Tasks 6-7).
- **Placeholder scan**: no TBD/TODO; all copy is final, real content, not lorem ipsum.
- **Type/name consistency**: `.service-card` class name introduced in Task 3, consumed by Task 4's CSS — consistent. `#hero`/`#why-me`/`#services`/`#contact`/`#footer` IDs introduced in Task 1, filled in Tasks 2-3, styled in Task 4 — consistent throughout.
- **Hard-to-reverse action flagged**: Task 6 Step 4 explicitly calls out the public-repo-creation step as the one place to pause and confirm before proceeding, rather than burying it.
