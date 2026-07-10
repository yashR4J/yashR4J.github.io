# SPEC.md — Redesign & Implementation Specification
## yashR4J.github.io — Personal Resume / Portfolio (Jekyll, GitHub Pages legacy build)

> **This document is the single source of truth.** Two implementation agents execute it in parallel:
> - **Agent A (Styling)** owns `_sass/**` and `css/main.scss` ONLY.
> - **Agent B (Markup/Content/SEO/JS)** owns `_layouts/**`, `_includes/**`, `index.html`, `_data/**`, `_config.yml`, `sitemap.xml`, `robots.txt`, `js/**`, `images/**`.
>
> Neither agent edits the other's files. The **class contract in Section D** is binding on both. No design decisions are delegated to implementers — if this spec is silent, choose the simplest option consistent with the tokens in Section C.

**Hard constraints (non-negotiable):**
- Pure Jekyll on the GitHub Pages **legacy** builder. No custom plugins, no npm/webpack, no TypeScript, no frameworks.
- Sass compiled by Jekyll: entry `css/main.scss` (with empty front matter), partials in `_sass/`.
- One-page site (`index.html` → `_layouts/resume.html`). Navigation is a sticky in-page anchor nav.
- All content data-driven from `_data/*.yml` and `_config.yml`.
- Vanilla JS only, in a single asset `js/site.js` plus one tiny inline FOUC-guard in `<head>`.

---

## A. Audit Summary

### Stack (as found)
- Jekyll + kramdown, Sass (`style: compressed`), served from `gh-pages` branch, GitHub Pages legacy build.
- Single layout `_layouts/resume.html`; includes: `head.html`, `icon-links.html`, `print-social-links.html`, `icons/*.html`.
- Sass: `css/main.scss` imports `normalize`, `mixins`, `variables`, `base`, `layout`, `resume`. **`_sass/_modern.scss` is dead code — never imported.**
- Data: `experience.yml`, `education.yml`, `projects.yml` (9 projects), `skills.yml` (7 groups), `recognitions.yml` (1), `associations.yml` (2), `interests.yml` (4, section disabled), `links.yml` (empty, disabled).
- Features: light/dark toggle via `data-theme` on `<html>` + `localStorage`; hover-card popovers for courses/clubs; project & skills grids; pill badges; print stylesheet; schema.org microdata sprinkled in markup.

### Issues found

**Visual**
1. No cohesive identity: default template bones (heavy 4px double section borders) fight a bolted-on card system (12px radii, drop shadows on everything).
2. A card for *everything*: every experience bullet is its own bordered pill box (`.summary-item`), every project highlight a pill, every course a tile — visual noise, no hierarchy.
3. Dark palette (`#0f0f23` navy) is unrelated to the light palette; accent `#3182ce` is generic template blue.
4. Two font-size systems collide (`$body-font-size: 13px` legacy vs hardcoded 16px), typographic scale is ad-hoc (`1.75rem` section titles, `3rem` name), letter-spacing values like `-.15rem` are extreme.
5. Centered header with floated title-bar (`float: left/right`, clearfix) looks dated and misaligns at mid widths.

**UX**
6. No navigation at all — a long one-pager with zero wayfinding.
7. Courses/clubs hidden behind unlabeled icon-button popovers positioned `absolute; right: 0` (clipped near viewport edge); on mobile they become fixed modals with no focus management, no Escape handling.
8. Hover states on non-interactive elements (bullets invert to accent-on-white and levitate) signal interactivity that doesn't exist.
9. "Contact me" is a lone 220px button; social links are icon-only with no labels/tooltips.

**Accessibility (WCAG 2.2 AA gaps)**
10. `<html>` has no `lang` attribute.
11. No skip link; no landmarks (`<main>`, `<nav>`); heading order breaks (h1 → h2 title-bar → h2 sections; club names are h5 under h4).
12. Popover buttons don't expose `aria-expanded`/`aria-controls`; popovers are not focus-trapped or Escape-dismissable; inline `onclick` handlers throughout.
13. Contrast failures: `--text-muted: #718096` on white = 4.0:1 (fails for body copy); light-mode `.contact-button` uses `sans_light` (300) at 1.375rem on `#3182ce`; dark-mode muted `#8b8b8b` on `#0f0f23` used for body copy.
14. Theme toggle communicates state only via icon swap — no `aria-pressed`, label never updates.
15. Zero `prefers-reduced-motion` support; universal `transition: all .3s ease` everywhere.
16. Avatar `alt="my photo"` (non-descriptive); focus styles only defined inside `.content-section` scope — header/nav/toggle links have none.

**Responsiveness**
17. Mobile fixes lean on `!important` stacks (theme toggle, logos). Legacy Primer float grid (`_layout.scss`) is unused dead weight with a fixed `width: 980px` `.container`.
18. Hover-card grid `minmax(250px, 1fr)` can overflow 320px viewports; `.contact-button.not-looking { width: 400px }` overflows small screens.

**Performance**
19. `images/dp.jpg` is **1.7 MB, 1582×2109**, rendered at 95px. (`images/avatar.jpg` is 400×400, 36 KB — use that.) `ib.png` 144 KB, `unsw.png` 100 KB for 22px logos.
20. Render-blocking Google Fonts `<link>` with no `preconnect`; 5 weights of Inter loaded, weight 300 used once.
21. ~170 lines of inline JS in `<head>` on every load, including dead functions (`toggleCourses`, `toggleClubs` are never called — markup uses the hover variants).
22. Images lack `width`/`height`/`loading="lazy"` (CLS + wasted bytes).
23. Dead CSS: `_modern.scss` (310 lines, never imported), `.courses-section`/`.clubs-section`/`.club-card` rulesets (~250 lines, markup never renders them), most of `_layout.scss`.

**Content**
24. `<title>` is "Yash Raj Online Resume"; `site.description` commented out → empty meta description; canonical resolves to a relative path because `site.url`/`baseurl` are unset; **no Open Graph, no Twitter card, no JSON-LD, no sitemap, no robots.txt**.
25. Header intro is one dense paragraph; experience bullets are strong on substance but visually undifferentiated; club "achievements" read as filler ("Developed problem-solving and analytical skills").
26. Footer is bare ("Made by Yash Raj."); Interests section written but disabled.

### Keep vs Replace

| Keep | Replace / Remove |
|---|---|
| Jekyll data-driven architecture, section on/off flags in `_config.yml` | All Sass except the file skeleton — full token-based rewrite |
| `data-theme` on `<html>` + localStorage theme mechanism (improve: respect `prefers-color-scheme` on first visit) | Hover-card popovers → inline expand/collapse disclosure |
| Inter as primary face (pair with JetBrains Mono) | Legacy Primer grid (`_layout.scss` grid classes), `_modern.scss`, `_variables.scss` legacy vars |
| Print support concept (`.no-print`/`.print-only`) | Inline `onclick` JS → single `js/site.js` with event listeners |
| All YAML data content (with additive optional fields) | `dp.jpg` as avatar → `avatar.jpg` |
| Company/club logo assets (small ones) | Microdata sprinkles → JSON-LD block (cleaner, one place) |
| schema.org intent | Bullet-pill boxes, per-highlight cards, floated title-bar |

---

## B. Design Direction

**Concept: "Engineering ledger."** A quiet, editorial, typography-first identity that reads like a beautifully set technical document — hairline rules, a disciplined type scale, generous whitespace, and monospace metadata (dates, section indices, tech tags) set in JetBrains Mono like annotations in the margin of a systems diagram. One deep-teal accent used sparingly for interactive elements and the timeline spine. Surfaces are flat and calm on warm off-white paper; elevation is reserved for the three featured project cards and the sticky nav. Dark mode is the same document under lamplight: near-black with a subtle green cast, the accent brightened for contrast — not a different brand.

**Rationale:** Yash's value is platform reliability, security hardening, and precision — the design should feel *engineered*, not decorated. Monospace micro-labels signal "terminal fluency" without cyberpunk cliché; the restrained accent and editorial rhythm signal seniority. This direction also degrades beautifully to print and is cheap to render (no gradients, no filters, no images above the fold except a 36 KB avatar).

---

## C. Design Tokens (EXACT values)

Agent A declares these **exactly** as written, in `_sass/_tokens.scss`, on the selectors shown. Agent B may reference them from inline-critical CSS only if needed (it shouldn't be).

```scss
/* ============ Sass-level (media queries can't use CSS vars) ============ */
$bp-sm: 480px;   // large phones
$bp-md: 768px;   // tablets / nav collapse point
$bp-lg: 1024px;  // desktop
$bp-xl: 1200px;  // wide

/* ============ Base tokens (theme-independent) ============ */
:root {
  /* --- Typography --- */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;

  /* Fluid type scale (min @ 320px viewport → max @ 1200px) */
  --fs-display: clamp(2.5rem, 1.9rem + 3vw, 4rem);        /* hero name */
  --fs-h2: clamp(1.5rem, 1.35rem + 0.75vw, 2rem);          /* section titles */
  --fs-h3: clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem);     /* item titles */
  --fs-lg: clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem);      /* lead / summary text */
  --fs-base: 1rem;
  --fs-sm: 0.875rem;
  --fs-xs: 0.8125rem;                                       /* badges, meta */
  --fs-2xs: 0.75rem;                                        /* mono eyebrows */

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
  --fw-black: 800;      /* hero name only */

  --lh-display: 1.05;
  --lh-heading: 1.25;
  --lh-body: 1.65;
  --lh-tight: 1.4;

  --ls-display: -0.025em;
  --ls-heading: -0.015em;
  --ls-mono: 0.08em;    /* uppercase mono labels */
  --ls-normal: 0;

  /* --- Spacing (4px base) --- */
  --space-1: 0.25rem;   /*  4px */
  --space-2: 0.5rem;    /*  8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.5rem;    /* 24px */
  --space-6: 2rem;      /* 32px */
  --space-7: 3rem;      /* 48px */
  --space-8: 4rem;      /* 64px */
  --space-9: 6rem;      /* 96px */

  /* --- Layout --- */
  --container-max: 66rem;    /* 1056px — grids, nav */
  --prose-max: 46rem;        /* 736px — running text */
  --nav-height: 4rem;        /* 64px desktop */
  --nav-height-mobile: 3.5rem;

  /* --- Radii --- */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 999px;

  /* --- Borders --- */
  --border-w: 1px;
  --rule: 1px solid var(--border);          /* hairline section rules */
  --rule-strong: 1px solid var(--border-strong);

  /* --- Z-index scale --- */
  --z-base: 0;
  --z-raised: 10;
  --z-mobile-menu: 90;
  --z-nav: 100;
  --z-skip: 200;

  /* --- Motion --- */
  --dur-fast: 120ms;
  --dur-base: 200ms;
  --dur-slow: 400ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  /* --- Focus --- */
  --focus-ring: 2px solid var(--accent);
  --focus-offset: 2px;
}
```

```scss
/* ============ Light theme (DEFAULT — must stand fully on its own) ============ */
:root, [data-theme="light"] {
  color-scheme: light;

  --bg: #FAFAF7;             /* warm paper */
  --surface: #FFFFFF;        /* cards, nav */
  --surface-2: #F1F2EE;      /* subtle wells: badges, code-ish chips */
  --text-1: #1A1D1C;         /* primary text     — 15.6:1 on --bg */
  --text-2: #454B49;         /* secondary text   —  8.2:1 on --bg */
  --text-3: #5B6663;         /* muted meta       —  5.2:1 on --bg */
  --border: #E2E5DF;
  --border-strong: #C6CCC4;

  --accent: #0F766E;         /* deep teal — 5.4:1 on #FFF, 4.9:1 on --bg */
  --accent-hover: #0B5D57;
  --accent-subtle: #E4F1EF;  /* tint fill (timeline dots, active nav pill) */
  --on-accent: #FFFFFF;      /* text on accent fills — 5.4:1 */

  --success: #15803D;
  --warning: #A16207;
  --danger:  #B42318;

  --shadow-sm: 0 1px 2px rgba(16, 20, 19, 0.05);
  --shadow-md: 0 2px 8px rgba(16, 20, 19, 0.07), 0 1px 2px rgba(16, 20, 19, 0.04);
  --shadow-lg: 0 12px 32px rgba(16, 20, 19, 0.10), 0 2px 8px rgba(16, 20, 19, 0.05);

  --nav-bg: rgba(250, 250, 247, 0.92);   /* sticky nav; pairs with backdrop-filter */
}

/* ============ Dark theme ============ */
[data-theme="dark"] {
  color-scheme: dark;

  --bg: #0E1211;             /* near-black, subtle green cast */
  --surface: #161B1A;
  --surface-2: #1D2422;
  --text-1: #ECEFED;         /* 15.9:1 on --bg */
  --text-2: #B4BCB8;         /*  9.1:1 on --bg */
  --text-3: #8B9490;         /*  5.6:1 on --bg */
  --border: #262D2B;
  --border-strong: #3A423F;

  --accent: #2DD4BF;         /* teal-400 — 10.7:1 on --bg */
  --accent-hover: #5EEAD4;
  --accent-subtle: #12312D;
  --on-accent: #04211D;      /* dark text on bright accent fills — 9.8:1 */

  --success: #4ADE80;
  --warning: #FBBF24;
  --danger:  #F87171;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);

  --nav-bg: rgba(14, 18, 17, 0.90);
}
```

**Token usage rules (binding):**
- Body copy uses `--text-2`; never `--text-3` for sentences (meta lines/dates only).
- `--accent` is for: links, buttons, timeline spine/dots, active nav state, focus rings, the honours badge. Nothing else. No accent-colored headings.
- All hover/active transitions use `--dur-base --ease-out`, on **specific properties** (`color`, `background-color`, `border-color`, `box-shadow`, `transform`) — never `transition: all`.
- `--shadow-lg` appears only on: featured project cards (hover), mobile menu panel. `--shadow-sm` on sticky nav when scrolled.

**Fonts (Agent B loads, Agent A consumes):** Google Fonts, single stylesheet request:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```
Justification for the pairing: Inter stays (already the site's voice, excellent hinting); JetBrains Mono is added strictly for micro-labels/badges/dates — it carries the "engineering ledger" identity at tiny sizes where Inter reads generic. System fallbacks per `--font-sans`/`--font-mono` above.

---

## D. Component Specs — THE CLASS CONTRACT (binding on both agents)

Naming: BEM-ish, `block__element` with `--modifier`; state classes `is-*` are toggled by JS only. **Every class below must exist in Agent B's markup exactly as written, and Agent A must style every class below — no additions, no renames.** Global utilities: `.visually-hidden`, `.no-print`, `.print-only`, `.reveal` (see Section G).

### D1. Skip link — `.skip-link`
```html
<a class="skip-link" href="#main">Skip to main content</a>
```
First child of `<body>`. Visually hidden off-canvas (`position: absolute; top: -100%`), on `:focus-visible` slides into view fixed at `top: var(--space-3); left: var(--space-3)`, `z-index: var(--z-skip)`, `background: var(--accent); color: var(--on-accent)`, padding `--space-2 --space-4`, radius `--radius-sm`, `font: var(--fw-semibold) var(--fs-sm) var(--font-sans)`. No transition on position (must appear instantly).

### D2. Sticky nav — `.site-nav`
```html
<header class="site-nav" id="site-nav">
  <div class="site-nav__inner">
    <a class="site-nav__brand" href="#top" aria-label="Yash Raj — back to top">YR<span class="site-nav__brand-dot">.</span></a>
    <nav class="site-nav__menu" id="nav-menu" aria-label="Section navigation">
      <ul class="site-nav__list">
        <li class="site-nav__item"><a class="site-nav__link" href="#about">About</a></li>
        <li class="site-nav__item"><a class="site-nav__link" href="#experience">Experience</a></li>
        <li class="site-nav__item"><a class="site-nav__link" href="#projects">Projects</a></li>
        <li class="site-nav__item"><a class="site-nav__link" href="#skills">Skills</a></li>
        <li class="site-nav__item"><a class="site-nav__link" href="#education">Education</a></li>
        <li class="site-nav__item"><a class="site-nav__link" href="#contact">Contact</a></li>
      </ul>
    </nav>
    <div class="site-nav__actions">
      <button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false" aria-label="Switch to dark theme">…svg…</button>
      <button class="site-nav__toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu">
        <span class="site-nav__toggle-bar"></span><span class="site-nav__toggle-bar"></span><span class="site-nav__toggle-bar"></span>
      </button>
    </div>
  </div>
</header>
```
- `.site-nav`: `position: sticky; top: 0; z-index: var(--z-nav); height: var(--nav-height)` (`--nav-height-mobile` below `$bp-md`); `background: var(--nav-bg); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: var(--rule)`. When JS adds `.is-scrolled` (scrollY > 8): add `box-shadow: var(--shadow-sm)`.
- `.site-nav__inner`: `max-width: var(--container-max); margin-inline: auto; padding-inline: var(--space-4); height: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--space-4)`.
- `.site-nav__brand`: `font: var(--fw-bold) 1.125rem/1 var(--font-mono); color: var(--text-1); text-decoration: none; letter-spacing: var(--ls-mono)`. `.site-nav__brand-dot { color: var(--accent); }` Hover: `color: var(--accent)`.
- `.site-nav__list`: `display: flex; gap: var(--space-1); list-style: none; margin: 0; padding: 0`.
- `.site-nav__link`: `display: inline-flex; align-items: center; min-height: 2.5rem; padding: 0 var(--space-3); border-radius: var(--radius-full); font: var(--fw-medium) var(--fs-sm)/1 var(--font-sans); color: var(--text-2); text-decoration: none`. Hover: `color: var(--text-1); background: var(--surface-2)`. **Active section** (JS sets class + `aria-current="true"`): `.site-nav__link.is-active { color: var(--accent); background: var(--accent-subtle); font-weight: var(--fw-semibold); }` `:focus-visible`: focus ring tokens.
- `.site-nav__actions`: `display: flex; align-items: center; gap: var(--space-2)`.
- `.site-nav__toggle`: hidden ≥ `$bp-md` (`display: none`). Below: `display: inline-flex; flex-direction: column; justify-content: center; gap: 5px; width: 2.75rem; height: 2.75rem; align-items: center; background: none; border: var(--rule); border-radius: var(--radius-sm); cursor: pointer`. Each `.site-nav__toggle-bar`: `width: 18px; height: 2px; background: var(--text-1); border-radius: 1px; transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)`. When `.site-nav.is-open`: bar 1 `transform: translateY(7px) rotate(45deg)`, bar 2 `opacity: 0`, bar 3 `transform: translateY(-7px) rotate(-45deg)`.
- **Mobile menu** (below `$bp-md`): `.site-nav__menu { position: fixed; inset: var(--nav-height-mobile) 0 auto 0; z-index: var(--z-mobile-menu); background: var(--surface); border-bottom: var(--rule); box-shadow: var(--shadow-lg); padding: var(--space-3) var(--space-4) var(--space-5); transform: translateY(-8px); opacity: 0; visibility: hidden; transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out), visibility 0s var(--dur-base); }` When `.site-nav.is-open .site-nav__menu`: `transform: none; opacity: 1; visibility: visible; transition-delay: 0s`. Inside menu: `.site-nav__list { flex-direction: column; gap: var(--space-1); }` and `.site-nav__link { width: 100%; min-height: 2.75rem; border-radius: var(--radius-sm); font-size: var(--fs-base); }`

### D3. Theme toggle — `.theme-toggle`
```html
<button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false" aria-label="Switch to dark theme">
  <svg class="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true" …></svg>
  <svg class="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true" …></svg>
</button>
```
`width/height: 2.5rem; display: inline-flex; align-items: center; justify-content: center; border: var(--rule); border-radius: var(--radius-full); background: transparent; color: var(--text-2); cursor: pointer`. Hover: `border-color: var(--border-strong); color: var(--text-1); background: var(--surface-2)`. Focus-visible: ring. Icons `width/height: 18px; fill: currentColor`. Visibility: `[data-theme="light"] … --sun { display: none }`, `--moon { display: block }`; inverted under `[data-theme="dark"]` (moon hidden, sun shown). Behavior in G4.

### D4. Hero — `.hero`
```html
<section class="hero" id="top">
  <div class="hero__inner">
    <img class="hero__avatar" src="images/avatar.jpg" alt="Portrait of Yash Raj" width="400" height="400">
    <p class="hero__eyebrow">Software Engineer · WiseTech Global</p>
    <h1 class="hero__name">Yash Raj</h1>
    <p class="hero__tagline">…(copy in F1)…</p>
    <p class="hero__value">…(copy in F1)…</p>
    <ul class="hero__meta">
      <li class="hero__meta-item">…</li>  <!-- ×3, see F1 -->
    </ul>
    <div class="hero__actions">
      <a class="btn btn--primary" href="mailto:yash.raj2@outlook.com">Get in touch</a>
      <a class="btn btn--secondary" href="#projects">See my work</a>
    </div>
    <ul class="social-links hero__social"> … (D15) … </ul>
  </div>
</section>
```
- `.hero`: `padding: var(--space-9) 0 var(--space-8)` (desktop), `var(--space-7) 0 var(--space-6)` below `$bp-md`. Background `var(--bg)` — flat, no image, no gradient.
- `.hero__inner`: `max-width: var(--container-max); margin-inline: auto; padding-inline: var(--space-4); text-align: left`. **Left-aligned, not centered** — editorial.
- `.hero__avatar`: `width: 72px; height: 72px; border-radius: var(--radius-full); object-fit: cover; border: 2px solid var(--border-strong); margin-bottom: var(--space-5); display: block`.
- `.hero__eyebrow`: `font: var(--fw-medium) var(--fs-2xs)/1 var(--font-mono); letter-spacing: var(--ls-mono); text-transform: uppercase; color: var(--accent); margin: 0 0 var(--space-3)`.
- `.hero__name`: `font: var(--fw-black) var(--fs-display)/var(--lh-display) var(--font-sans); letter-spacing: var(--ls-display); color: var(--text-1); margin: 0 0 var(--space-4)`.
- `.hero__tagline`: `font-size: var(--fs-lg); line-height: var(--lh-body); color: var(--text-2); max-width: var(--prose-max); margin: 0 0 var(--space-3)`.
- `.hero__value`: `font-size: var(--fs-base); color: var(--text-3); max-width: var(--prose-max); margin: 0 0 var(--space-5)`.
- `.hero__meta`: `list-style: none; display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); padding: 0; margin: 0 0 var(--space-6)`. `.hero__meta-item`: `font: var(--fw-regular) var(--fs-xs)/var(--lh-tight) var(--font-mono); color: var(--text-3); display: inline-flex; align-items: center; gap: var(--space-2)`. Each item is prefixed in CSS with `&::before { content: ""; width: 6px; height: 6px; border-radius: var(--radius-full); background: var(--accent); flex-shrink: 0; }`
- `.hero__actions`: `display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-5)`.
- `.hero__social`: margin-top 0 (spacing handled by actions).

### D5. Section wrapper — `.section`
Every content section uses:
```html
<section class="section" id="{anchor}" aria-labelledby="{anchor}-title">
  <div class="section__inner">
    <header class="section__header">
      <p class="section__eyebrow" aria-hidden="true">01</p>
      <h2 class="section__title" id="{anchor}-title">Experience</h2>
      <p class="section__intro">…microcopy…</p>
    </header>
    <div class="section__body"> … </div>
  </div>
</section>
```
- `.section`: `padding: var(--space-8) 0; scroll-margin-top: calc(var(--nav-height) + var(--space-4))`. Sections are separated by `border-top: var(--rule)` on `.section` (except the first, `.section:first-of-type` — but hero is not a `.section`, so apply border-top to all `.section`).
- `.section__inner`: `max-width: var(--container-max); margin-inline: auto; padding-inline: var(--space-4)`.
- `.section__header`: `margin-bottom: var(--space-6); max-width: var(--prose-max)`.
- `.section__eyebrow`: mono index — `font: var(--fw-medium) var(--fs-2xs)/1 var(--font-mono); letter-spacing: var(--ls-mono); color: var(--accent); margin: 0 0 var(--space-2)`. Content is a two-digit index ("01"…"08") written literally in markup, in document order.
- `.section__title`: `font: var(--fw-bold) var(--fs-h2)/var(--lh-heading) var(--font-sans); letter-spacing: var(--ls-heading); color: var(--text-1); margin: 0`.
- `.section__intro`: `font-size: var(--fs-base); color: var(--text-3); margin: var(--space-3) 0 0`.

### D6. Professional summary — `.summary`
```html
<div class="summary">
  <p class="summary__lead">…paragraph (F2)…</p>
  <p class="summary__more">…second paragraph (F2)…</p>
</div>
```
`.summary { max-width: var(--prose-max); }` `.summary__lead { font-size: var(--fs-lg); line-height: var(--lh-body); color: var(--text-1); margin: 0 0 var(--space-4); }` `.summary__more { font-size: var(--fs-base); line-height: var(--lh-body); color: var(--text-2); margin: 0; }` `<strong>` inside renders `font-weight: var(--fw-semibold); color: var(--text-1)`.

### D7. Experience timeline — `.timeline`
```html
<ol class="timeline">
  <li class="timeline__item">
    <div class="timeline__marker" aria-hidden="true"></div>
    <article class="timeline__content">
      <header class="timeline__header">
        <img class="timeline__logo" src="…" alt="" width="40" height="40" loading="lazy">
        <div class="timeline__heading">
          <h3 class="timeline__role">Software Engineer</h3>
          <p class="timeline__company">WiseTech Global</p>
        </div>
        <p class="timeline__meta"><span class="timeline__duration">Feb 2023 — Present</span></p>
      </header>
      <ul class="timeline__points">
        <li class="timeline__point">…markdownified bullet…</li>
      </ul>
    </article>
  </li>
</ol>
```
- `.timeline`: `list-style: none; margin: 0; padding: 0; position: relative`. Spine: `&::before { content: ""; position: absolute; left: 19px; top: 8px; bottom: 8px; width: 2px; background: var(--border); }` (left aligns to marker center).
- `.timeline__item`: `position: relative; display: grid; grid-template-columns: 40px 1fr; gap: var(--space-4); padding-bottom: var(--space-7)`. Last item `padding-bottom: 0`.
- `.timeline__marker`: `width: 12px; height: 12px; border-radius: var(--radius-full); background: var(--bg); border: 2px solid var(--accent); margin: 6px auto 0 auto; position: relative; z-index: var(--z-raised); box-shadow: 0 0 0 4px var(--bg)`. First item's marker gets a filled center via `.timeline__item:first-child .timeline__marker { background: var(--accent); }` (current role).
- `.timeline__content`: no card, no border — flat. `min-width: 0`.
- `.timeline__header`: `display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3)`. Below `$bp-sm`: `grid-template-columns: auto 1fr;` and `.timeline__meta` moves to a new row spanning column 2 (`grid-column: 2`).
- `.timeline__logo`: `width: 40px; height: 40px; object-fit: contain; border-radius: var(--radius-sm); background: var(--surface); border: var(--rule); padding: 4px`.
- `.timeline__role`: `font: var(--fw-semibold) var(--fs-h3)/var(--lh-heading) var(--font-sans); letter-spacing: var(--ls-heading); color: var(--text-1); margin: 0`.
- `.timeline__company`: `font-size: var(--fs-sm); color: var(--text-2); margin: 2px 0 0`.
- `.timeline__meta` / `.timeline__duration`: `font: var(--fw-regular) var(--fs-xs)/var(--lh-tight) var(--font-mono); color: var(--text-3); margin: 0; white-space: nowrap`. If a `location` field exists it is appended inside `.timeline__meta` as `<span class="timeline__location">· Sydney</span>` same styling.
- `.timeline__points`: `list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); max-width: var(--prose-max)`.
- `.timeline__point`: **plain text, no box.** `position: relative; padding-left: var(--space-4); font-size: var(--fs-sm); line-height: var(--lh-body); color: var(--text-2)`. Marker: `&::before { content: ""; position: absolute; left: 0; top: 0.6em; width: 6px; height: 2px; background: var(--accent); }` Bold spans (`<strong>` from markdownify): `font-weight: var(--fw-semibold); color: var(--text-1)`. **No hover effect** — these are not interactive. Any `<p>` emitted by markdownify inside `.timeline__point` gets `margin: 0; display: inline`.

### D8. Project cards — `.projects`
Two tiers. Featured (first 3 / `featured: true`):
```html
<div class="projects__featured">
  <article class="project-card">
    <div class="project-card__body">
      <p class="project-card__meta"><span class="project-card__year">2024</span><span class="project-card__role">Author, Researcher</span></p>
      <h3 class="project-card__title"><a class="project-card__link" href="…">Project name</a></h3>
      <ul class="project-card__highlights">
        <li class="project-card__highlight">…</li>
      </ul>
      <ul class="badge-list project-card__tech">
        <li class="badge">Go</li>
      </ul>
    </div>
  </article>
</div>
```
- `.projects__featured`: `display: grid; grid-template-columns: 1fr; gap: var(--space-4);` ≥ `$bp-md`: `grid-template-columns: repeat(3, 1fr)`. (3 featured cards side by side; if 2, they fill 2 columns naturally — acceptable.)
- `.project-card`: `background: var(--surface); border: var(--rule); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); display: flex; height: 100%; transition: box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)`. Hover (when it contains a link): `box-shadow: var(--shadow-lg); border-color: var(--border-strong); transform: translateY(-2px)`. Under `prefers-reduced-motion: reduce`: no transform.
- `.project-card__body`: `padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); width: 100%`.
- `.project-card__meta`: `display: flex; gap: var(--space-3); font: var(--fw-medium) var(--fs-2xs)/1 var(--font-mono); letter-spacing: var(--ls-mono); text-transform: uppercase; color: var(--text-3); margin: 0`. `.project-card__year { color: var(--accent); }`
- `.project-card__title`: `font: var(--fw-semibold) var(--fs-h3)/var(--lh-heading) var(--font-sans); margin: 0`.
- `.project-card__link`: `color: var(--text-1); text-decoration: none`. Card-wide click target: `&::after { content: ""; position: absolute; inset: 0; }` with `.project-card { position: relative; }`. Hover: `color: var(--accent)`. Focus-visible on the link: ring drawn on the card via `.project-card:has(.project-card__link:focus-visible) { outline: var(--focus-ring); outline-offset: var(--focus-offset); }` **plus** a plain `outline` on the link itself as fallback for non-`:has` engines.
- `.project-card__highlights`: `list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); flex-grow: 1`.
- `.project-card__highlight`: same pattern as `.timeline__point` (accent dash marker, `--fs-sm`, `--text-2`, no box, no hover).
- `.project-card__tech`: `margin-top: auto` (pins badges to card bottom).

Secondary tier — compact rows for the remaining projects:
```html
<ul class="projects__list">
  <li class="project-row">
    <div class="project-row__main">
      <h3 class="project-row__title"><a class="project-row__link" href="…">COVID-19 Tracker</a></h3>
      <p class="project-row__desc">…first highlight…</p>
    </div>
    <p class="project-row__meta"><span class="project-row__tech">React · Material UI</span><span class="project-row__year">2022</span></p>
  </li>
</ul>
```
- `.projects__list`: `list-style: none; margin: var(--space-6) 0 0; padding: 0; border-top: var(--rule)`.
- `.project-row`: `display: grid; grid-template-columns: 1fr auto; gap: var(--space-2) var(--space-5); align-items: baseline; padding: var(--space-4) 0; border-bottom: var(--rule)`. Below `$bp-sm`: single column, meta under main. Hover: `background: var(--surface)` extended full-bleed via `box-shadow: 0 0 0 var(--space-3) var(--surface); border-radius: var(--radius-xs)` — subtle; acceptable to omit background hover entirely under reduced motion is NOT required (color-only is fine always).
- `.project-row__title`: `font: var(--fw-semibold) var(--fs-base)/var(--lh-tight) var(--font-sans); margin: 0`.
- `.project-row__link`: standard link styling (D14), `color: var(--text-1)`; hover `color: var(--accent)`.
- `.project-row__desc`: `font-size: var(--fs-sm); color: var(--text-3); margin: var(--space-1) 0 0; max-width: var(--prose-max)`.
- `.project-row__meta`: `display: flex; gap: var(--space-4); font: var(--fw-regular) var(--fs-2xs)/var(--lh-tight) var(--font-mono); color: var(--text-3); margin: 0; white-space: nowrap`.

### D9. Skills — `.skills`
```html
<div class="skills">
  <div class="skill-group">
    <h3 class="skill-group__title">Programming Languages</h3>
    <ul class="badge-list">
      <li class="badge">C#</li>
    </ul>
  </div>
</div>
```
- `.skills`: `display: grid; grid-template-columns: 1fr; gap: var(--space-5) var(--space-6);` ≥ `$bp-sm`: 2 columns; ≥ `$bp-lg`: `grid-template-columns: repeat(3, 1fr)`. **No cards** — groups are flat with a hairline top rule: `.skill-group { border-top: var(--rule-strong); padding-top: var(--space-3); }`
- `.skill-group__title`: `font: var(--fw-semibold) var(--fs-sm)/var(--lh-tight) var(--font-sans); color: var(--text-1); margin: 0 0 var(--space-3)`.

### D10. Badge / tag — `.badge`
```html
<ul class="badge-list"><li class="badge">Terraform</li><li class="badge badge--accent">First Class Honours</li></ul>
```
- `.badge-list`: `display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; margin: 0; padding: 0`.
- `.badge`: `display: inline-flex; align-items: center; padding: 4px 10px; border-radius: var(--radius-full); border: var(--rule); background: var(--surface-2); color: var(--text-2); font: var(--fw-medium) var(--fs-2xs)/1.2 var(--font-mono); white-space: nowrap`. **No hover state** (not interactive). Long badges (awards): `.badge--wrap { white-space: normal; text-align: left; line-height: var(--lh-tight); }`
- `.badge--accent`: `background: var(--accent-subtle); border-color: transparent; color: var(--accent); font-weight: var(--fw-semibold)`. In dark theme this resolves via tokens (subtle dark-teal fill, bright teal text — 7.9:1).

### D11. Education — `.education`
```html
<div class="education">
  <article class="education__item">
    <header class="education__header">
      <img class="education__logo" src="…" alt="" width="40" height="40" loading="lazy">
      <div class="education__heading">
        <h3 class="education__degree">Bachelor of Software Engineering (Honours)</h3>
        <p class="education__school">University of New South Wales</p>
      </div>
      <p class="education__meta">2020 — 2024</p>
    </header>
    <ul class="badge-list education__badges">
      <li class="badge badge--accent">First Class Honours</li>
      <li class="badge badge--wrap">Dean's Honours List (2020–2024)</li>
    </ul>
    <button class="education__toggle" type="button" aria-expanded="false" aria-controls="edu-detail-1">
      <span class="education__toggle-label">Courses &amp; societies</span>
      <span class="education__toggle-count">33 courses · 2 societies</span>
      <svg class="education__toggle-icon" aria-hidden="true" …chevron…></svg>
    </button>
    <div class="education__detail" id="edu-detail-1" hidden>
      <div class="education__detail-inner">
        <h4 class="education__detail-title">Selected coursework</h4>
        <ul class="course-list">
          <li class="course-list__item">COMP2521 Data Structures and Algorithms</li>
        </ul>
        <h4 class="education__detail-title">Clubs &amp; societies</h4>
        <div class="club-list">
          <div class="club">
            <div class="club__header">
              <img class="club__logo" src="…" alt="" width="24" height="24" loading="lazy">
              <h5 class="club__name">UNSW CSESoc</h5>
              <p class="club__meta">Careers Subcommittee · 2021–2022</p>
            </div>
            <p class="club__desc">…description…</p>
          </div>
        </div>
      </div>
    </div>
  </article>
</div>
```
- `.education`: `display: flex; flex-direction: column; gap: var(--space-6)`.
- `.education__item`: flat, `border-top: var(--rule-strong); padding-top: var(--space-5)`. First item no border (`&:first-child { border-top: 0; padding-top: 0; }`).
- `.education__header`: same grid pattern as `.timeline__header` (`auto 1fr auto`, meta wraps below `$bp-sm`).
- `.education__logo`: same treatment as `.timeline__logo`.
- `.education__degree`: same as `.timeline__role`. `.education__school`: same as `.timeline__company`. `.education__meta`: same as `.timeline__meta`.
- `.education__badges`: `margin: var(--space-3) 0 var(--space-4)`.
- `.education__toggle`: `display: inline-flex; align-items: center; gap: var(--space-3); min-height: 2.75rem; padding: 0 var(--space-4); border: var(--rule); border-radius: var(--radius-sm); background: var(--surface); color: var(--text-1); font: var(--fw-medium) var(--fs-sm)/1 var(--font-sans); cursor: pointer; transition: border-color var(--dur-base) var(--ease-out), background-color var(--dur-base) var(--ease-out)`. Hover: `border-color: var(--accent); background: var(--accent-subtle)`. `[aria-expanded="true"]`: `border-color: var(--accent); color: var(--accent);` and `.education__toggle-icon { transform: rotate(180deg); }` Focus-visible: ring.
- `.education__toggle-count`: `font: var(--fw-regular) var(--fs-2xs)/1 var(--font-mono); color: var(--text-3)`.
- `.education__toggle-icon`: `width: 14px; height: 14px; transition: transform var(--dur-base) var(--ease-out)`.
- `.education__detail`: expand/collapse via grid rows (no layout jump, no max-height hack): default `display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--dur-slow) var(--ease-out)`. JS removes/adds `hidden` and toggles `.is-open` → `grid-template-rows: 1fr`. `[hidden] { display: none; }` remains authoritative for a11y when closed after transition (see G5). `.education__detail-inner { overflow: hidden; padding-top: var(--space-4); }`
- `.education__detail-title`: `font: var(--fw-semibold) var(--fs-2xs)/1 var(--font-mono); letter-spacing: var(--ls-mono); text-transform: uppercase; color: var(--text-3); margin: var(--space-4) 0 var(--space-3)`. First one `margin-top: 0`.
- `.course-list`: `list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr; gap: var(--space-1) var(--space-4);` ≥ `$bp-sm`: 2 columns; ≥ `$bp-lg`: 3 columns.
- `.course-list__item`: `font: var(--fw-regular) var(--fs-xs)/var(--lh-tight) var(--font-mono); color: var(--text-2); padding: var(--space-1) 0`. The leading course code (e.g. "COMP2521") is wrapped by Agent B in `<span class="course-list__code">` → `color: var(--accent); font-weight: var(--fw-medium); margin-right: var(--space-1)`.
- `.club-list`: `display: flex; flex-direction: column; gap: var(--space-4)`.
- `.club`: flat. `.club__header { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }` `.club__logo { width: 24px; height: 24px; border-radius: var(--radius-xs); object-fit: contain; }` `.club__name { font: var(--fw-semibold) var(--fs-sm)/var(--lh-tight) var(--font-sans); color: var(--text-1); margin: 0; }` `.club__meta { font: var(--fw-regular) var(--fs-2xs)/1 var(--font-mono); color: var(--text-3); margin: 0; }` `.club__desc { font-size: var(--fs-sm); color: var(--text-2); margin: var(--space-1) 0 0; max-width: var(--prose-max); }` Club `achievements` from YAML are **not rendered** (filler copy — see F5).

### D12. Recognition & Community item — `.entry` (shared component)
Used by both Recognition and Community (associations) sections.
```html
<article class="entry">
  <img class="entry__logo" src="…" alt="" width="40" height="40" loading="lazy">
  <div class="entry__body">
    <h3 class="entry__title">International Baccalaureate DUX</h3>
    <p class="entry__meta">Glenunga International High School · 2019</p>
    <p class="entry__copy">Awarded to the top-scoring student in the cohort.</p>
  </div>
</article>
```
- `.entry`: `display: grid; grid-template-columns: 40px 1fr; gap: var(--space-4); padding: var(--space-4) 0`. Entries in a list get `border-top: var(--rule)` from the second onward (`.entry + .entry`).
- `.entry__logo`: same as `.timeline__logo`.
- `.entry__title`: `font: var(--fw-semibold) var(--fs-base)/var(--lh-tight) var(--font-sans); color: var(--text-1); margin: 0`. If it wraps a link, link inherits color, hover `var(--accent)`.
- `.entry__meta`: `font: var(--fw-regular) var(--fs-2xs)/var(--lh-tight) var(--font-mono); color: var(--text-3); margin: var(--space-1) 0 0`.
- `.entry__copy`: `font-size: var(--fs-sm); line-height: var(--lh-body); color: var(--text-2); margin: var(--space-2) 0 0; max-width: var(--prose-max)`.

### D13. Buttons — `.btn`
```html
<a class="btn btn--primary" href="…">Get in touch</a>
<a class="btn btn--secondary" href="…">See my work</a>
<a class="btn btn--ghost" href="…">View on GitHub</a>
```
- `.btn` (base): `display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 2.75rem; padding: 0 var(--space-5); border-radius: var(--radius-sm); font: var(--fw-semibold) var(--fs-sm)/1 var(--font-sans); text-decoration: none; cursor: pointer; border: var(--border-w) solid transparent; transition: background-color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)`. `:focus-visible`: ring + offset. `:active`: `transform: translateY(1px)` (skip under reduced motion).
- `.btn--primary`: `background: var(--accent); color: var(--on-accent)`. Hover: `background: var(--accent-hover)`. (Dark theme: bright teal fill, near-black text — via tokens, no overrides.)
- `.btn--secondary`: `background: transparent; color: var(--text-1); border-color: var(--border-strong)`. Hover: `border-color: var(--accent); color: var(--accent)`.
- `.btn--ghost`: `background: transparent; color: var(--accent); border-color: transparent; padding: 0 var(--space-3)`. Hover: `background: var(--accent-subtle)`.
- `.btn--sm`: `min-height: 2.25rem; padding: 0 var(--space-3); font-size: var(--fs-xs)`. Used for project card actions if any.

### D14. Links (global)
Content-area `a` (within `.section__body`, `.summary`, `.entry`, footer): `color: var(--accent); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--accent) 45%, transparent)`. Hover: `color: var(--accent-hover); text-decoration-color: currentColor`. Provide fallback for `color-mix`: declare `text-decoration-color: var(--accent)` first, then the `color-mix` line. All links `:focus-visible { outline: var(--focus-ring); outline-offset: var(--focus-offset); border-radius: 2px; }` Component links (`.site-nav__link`, `.project-card__link`, `.project-row__link`, `.btn`, `.social-links__link`) opt out of underline per their specs.

### D15. Social links — `.social-links`
```html
<ul class="social-links">
  <li class="social-links__item">
    <a class="social-links__link" href="https://github.com/yashR4J" aria-label="GitHub profile">
      <svg class="social-links__icon" aria-hidden="true" …></svg>
      <span class="social-links__label">GitHub</span>
    </a>
  </li>
  <!-- LinkedIn, Instagram, Email, Print -->
</ul>
```
- `.social-links`: `display: flex; flex-wrap: wrap; gap: var(--space-2); list-style: none; margin: 0; padding: 0`.
- `.social-links__link`: `display: inline-flex; align-items: center; gap: var(--space-2); min-height: 2.25rem; padding: 0 var(--space-3); border: var(--rule); border-radius: var(--radius-full); color: var(--text-2); font: var(--fw-medium) var(--fs-xs)/1 var(--font-sans); text-decoration: none; transition: color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out), background-color var(--dur-base) var(--ease-out)`. Hover: `color: var(--accent); border-color: var(--accent); background: var(--accent-subtle)`. Focus-visible: ring.
- `.social-links__icon`: `width: 16px; height: 16px; fill: currentColor`.
- `.social-links__label`: visible text (icons are no longer label-free).

### D16. Contact CTA — `.contact-cta`
```html
<div class="contact-cta">
  <h3 class="contact-cta__title">…(F8)…</h3>
  <p class="contact-cta__text">…(F8)…</p>
  <div class="contact-cta__actions">
    <a class="btn btn--primary" href="mailto:yash.raj2@outlook.com">Email me</a>
    <a class="btn btn--secondary" href="https://www.linkedin.com/in/yash-raj-54372a187/">Connect on LinkedIn</a>
  </div>
  <p class="contact-cta__note">…(F8)…</p>
</div>
```
- `.contact-cta`: the one deliberately "designed" block — `background: var(--surface); border: var(--rule); border-radius: var(--radius-lg); padding: var(--space-7) var(--space-6); text-align: center; box-shadow: var(--shadow-md)`. Below `$bp-sm`: `padding: var(--space-6) var(--space-4)`.
- `.contact-cta__title`: `font: var(--fw-bold) var(--fs-h2)/var(--lh-heading) var(--font-sans); letter-spacing: var(--ls-heading); color: var(--text-1); margin: 0 0 var(--space-3)`.
- `.contact-cta__text`: `font-size: var(--fs-base); color: var(--text-2); max-width: 34rem; margin: 0 auto var(--space-5)`.
- `.contact-cta__actions`: `display: flex; flex-wrap: wrap; gap: var(--space-3); justify-content: center; margin-bottom: var(--space-4)`.
- `.contact-cta__note`: `font: var(--fw-regular) var(--fs-2xs)/var(--lh-tight) var(--font-mono); color: var(--text-3); margin: 0`.

### D17. Footer — `.site-footer`
```html
<footer class="site-footer">
  <div class="site-footer__inner">
    <p class="site-footer__text">© 2026 Yash Raj · Built with Jekyll, no frameworks.</p>
    <ul class="site-footer__links">
      <li><a class="site-footer__link" href="https://github.com/yashR4J">GitHub</a></li>
      <li><a class="site-footer__link" href="https://www.linkedin.com/in/yash-raj-54372a187/">LinkedIn</a></li>
      <li><a class="site-footer__link" href="#top">Back to top ↑</a></li>
    </ul>
  </div>
</footer>
```
- `.site-footer`: `border-top: var(--rule); padding: var(--space-6) 0; margin-top: var(--space-8)`.
- `.site-footer__inner`: container pattern; `display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-5); align-items: center; justify-content: space-between`.
- `.site-footer__text`: `font: var(--fw-regular) var(--fs-xs)/var(--lh-tight) var(--font-mono); color: var(--text-3); margin: 0`.
- `.site-footer__links`: `display: flex; gap: var(--space-4); list-style: none; margin: 0; padding: 0`. `.site-footer__link`: `font-size: var(--fs-xs); color: var(--text-3); text-decoration: none`. Hover: `color: var(--accent)`. Copyright year is written by Agent B using Liquid: `{{ site.time | date: "%Y" }}`.

### D18. Utilities (Agent A defines; Agent B may use)
- `.visually-hidden`: standard clip pattern (position absolute, 1px, clip-path inset(50%), etc.).
- `.no-print { @media print { display: none !important; } }` — `.print-only { display: none; @media print { display: block !important; } }`
- `.reveal`: see G2. `html { scroll-behavior: smooth; }` gated behind `@media (prefers-reduced-motion: no-preference)`.

---

## E. Section-by-Section Layout & Markup Plan

Agent B decomposes `_layouts/resume.html` into includes: `_includes/nav.html`, `hero.html`, `section-about.html`, `section-experience.html`, `section-projects.html`, `section-skills.html`, `section-education.html`, `section-recognition.html`, `section-community.html`, `section-beyond.html`, `section-contact.html`, `footer.html`, plus rewritten `head.html` (meta/fonts/CSS/FOUC-guard only — all behavioral JS moves to `js/site.js`, loaded before `</body>` with `defer`). Keep `icons/*.html` includes; keep `print-social-links.html`. `<html lang="en">`. `<body>` structure: skip-link → `.site-nav` → `<main id="main">` (hero + all sections) → `.site-footer`. Delete the `theme-{{ site.resume_theme }}` body class and `resume_theme` config key.

Section order, anchors, eyebrow indices, and data sources:

| # | Anchor | Title | Eyebrow | Data source | Config flag |
|---|---|---|---|---|---|
| — | `#top` | Hero | — | `_config.yml` | always |
| 01 | `#about` | About | `01` | `_config.yml` (`resume_header_intro` replaced — see F2) | always |
| 02 | `#experience` | Experience | `02` | `_data/experience.yml` | `resume_section_experience` |
| 03 | `#projects` | Projects | `03` | `_data/projects.yml` | `resume_section_projects` |
| 04 | `#skills` | Skills | `04` | `_data/skills.yml` | `resume_section_skills` |
| 05 | `#education` | Education | `05` | `_data/education.yml` | `resume_section_education` |
| 06 | `#recognition` | Recognition | `06` | `_data/recognitions.yml` | `resume_section_recognition` |
| 07 | `#community` | Community | `07` | `_data/associations.yml` | `resume_section_associations` |
| 08 | `#beyond` | Beyond Work | `08` | `_data/interests.yml` | `resume_section_interests` (**enable it**) |
| 09 | `#contact` | Contact | `09` | `_config.yml` | always |

(If a flagged section is disabled, subsequent eyebrow numbers may simply stay as authored — do not renumber dynamically.)

**Hero** (`hero.html`): D4 structure. Avatar = `images/avatar.jpg` (NOT `dp.jpg`). Meta items (F1). Social links from `site.resume_social_links` — render GitHub, LinkedIn, Instagram + an Email pill (mailto) + Print pill (`onclick` forbidden; JS binds `#print-link` in `site.js`; give the print anchor `id="print-link"` and `href="#"` with `class="social-links__link no-print"`).

**About**: D5 wrapper + D6 summary. Copy from F2 lives in `_config.yml` as `resume_summary_lead` and `resume_summary_more` (new keys; delete `resume_header_intro`).

**Experience**: D7 timeline, one `.timeline__item` per YAML entry, bullets via `{{ item | markdownify }}` per point. Normalize durations in YAML to short form ("Feb 2023 — Present") per F4. New optional YAML fields (documented, values only where known): `location` (string, e.g. `Sydney, Australia` for WiseTech — supported: WiseTech Global is Sydney-based and phone is +61), `url` (company link; if present `.timeline__company` wraps an anchor).

**Projects**: D8. New optional YAML field `featured: true` — Agent B sets it on: *Enabling Passive Measurement of Microsoft Teams Performance…*, *Multi-Format Security Testing Fuzzer…*, *Finance Event Intelligence Platform*. Featured cards render up to 3 highlights + tech badges. Remaining 6 projects render as `.project-row`s: desc = first highlight (as-is from YAML), meta tech = first 2–3 tech items joined with `·`, year = `duration`. Existing `image` field is dropped from markup (no project data uses it). Project titles shortened for display per F5 via new optional field `short_name` (fallback to `project`).

**Skills**: D9. Reorder groups in `skills.yml` to lead with strengths (order in F6). No other data change.

**Education**: D11. One expandable detail region per degree (button + hidden region — replaces hover cards entirely). `honours`/`honours_label` → `.badge--accent`; `awards` → `.badge--wrap`. Course codes wrapped in `<span class="course-list__code">` by splitting on first space in Liquid (`{{ course | split: " " | first }}` / remainder via `remove_first`). Clubs render name/meta/description only (no `achievements` — leave data in YAML, do not render).

**Recognition**: D12 `.entry` list from `recognitions.yml` (currently 1 item — fine, renders as a single entry).

**Community** (renamed from "Associations"): D12 `.entry` list from `associations.yml`; summaries tightened per F7 (edit YAML).

**Beyond Work**: enable `resume_section_interests: true`. Render as one `.badge-list` of individual interests — Agent B splits the comma-joined YAML descriptions into separate list entries per F7 (restructure `interests.yml` to one item per line: `- description: Piano` etc.).

**Contact**: D16 block, copy F8. Then footer D17.

**Print**: keep `print-social-links.html` include inside a `.print-only` block before the footer. Agent A writes the print stylesheet: hide `.site-nav`, `.theme-toggle`, `.skip-link`, `.hero__actions`, `.contact-cta__actions`, `.education__toggle`; force `.education__detail` visible (`display: block !important`); black-on-white, no shadows; base 12px; single-column grids.

**`_config.yml` changes (Agent B):**
```yaml
title: "Yash Raj · Software Engineer"
description: "Yash Raj is a software engineer at WiseTech Global in Sydney, building reliable C#/.NET platform services, cloud automation, and distributed systems."
url: "https://yashr4j.github.io"
baseurl: ""
resume_location: "Sydney, Australia"   # inferred: UNSW + WiseTech Global (Sydney HQ) + +61 phone
resume_summary_lead: >-               # F2 paragraph 1
resume_summary_more: >-               # F2 paragraph 2
resume_section_interests: true
# removed: resume_theme, resume_header_intro, display_header_contact_info, resume_header_contact_info
```
Keep: `resume_name`, `resume_title`, `resume_contact_email`, `resume_contact_telephone`, section flags, `resume_social_links`, `resume_print_social_links`. `resume_looking_for_work` stays but now only controls whether the Contact CTA shows the availability note (F8).

---

## F. Content Rewrite (exact copy — real facts only)

### F1. Hero
- **Eyebrow:** `Software Engineer · WiseTech Global`
- **Name (h1):** `Yash Raj`
- **Tagline (subheadline):** `I build the platform layer — C#/.NET services, cloud automation, and distributed systems that keep critical workflows running.`
- **Value proposition (1 line):** `Currently hardening secure remote access and database recovery on WiseTech's CargoWise Cloud.`
- **Meta items (3):**
  1. `CargoWise Cloud · WiseTech Global`
  2. `Sydney, Australia` <!-- inferred from UNSW (Sydney) + WiseTech Global (Sydney HQ) + +61 phone; if wrong, replace with correct city -->
  3. `BE Software Engineering (Hons 1) · BCom Finance, UNSW`
- **Buttons:** `Get in touch` (primary → mailto), `See my work` (secondary → #projects)

### F2. Professional summary (About)
Paragraph 1 (`resume_summary_lead`):
> I'm a platform-focused engineer working in **C#/.NET**, with a grounding in cloud infrastructure, distributed systems, automation, and performance optimisation. On WiseTech Global's **CargoWise Cloud** team, I help harden critical access and recovery workflows — building scalable backend services, improving system and data reliability, and creating self-service tooling that reduces operational effort.

Paragraph 2 (`resume_summary_more`):
> Before that: a dual degree in Software Engineering (First Class Honours) and Finance at UNSW, a stint teaching data structures to 150+ students, and a habit of mentoring — including 30+ associate developers through WiseTech's Earn & Learn program. I care about systems that behave predictably under pressure, and I'm growing toward deeper platform reliability ownership.

### F3. Section labels & intro microcopy
| Section | Title | Intro (`.section__intro`) |
|---|---|---|
| 01 | About | *(none — the summary is the content)* |
| 02 | Experience | `Platform engineering at scale — plus a habit of teaching what I know.` |
| 03 | Projects | `Selected work: passive network measurement, security fuzzing, and event-driven cloud services.` |
| 04 | Skills | `The tools I reach for, grouped by how I use them.` |
| 05 | Education | `A dual degree pairing software engineering with finance, at UNSW.` |
| 06 | Recognition | *(none)* |
| 07 | Community | `Student societies where I gave time back.` |
| 08 | Beyond Work | *(none)* |
| 09 | Contact | *(none — the CTA block carries the copy)* |

### F4. Experience data normalization (edit `_data/experience.yml`, facts unchanged)
- Durations → `Feb 2023 — Present`, `Feb 2023 — Dec 2023`, `Jan 2023 — Jan 2024`, `Jun 2020 — Dec 2022` (drop `&mdash;` entities; use literal em dash).
- Add `location: "Sydney, Australia"` to WiseTech, UNSW, and Sunswift entries <!-- PLACEHOLDER: confirm Mayfair Education location before adding one -->.
- Bullets: keep existing text verbatim (they contain real specifics: WCA gateway, parameter signing, ephemeral AD credentials, Kibana, AlwaysOn AGs, DBBR, log shipping, IIS, Earn & Learn 30+, COMP2521 150+ students). No invented metrics.

### F5. Projects display names (new `short_name` field; `project` field unchanged)
| YAML `project` | `short_name` |
|---|---|
| Enabling Passive Measurement of Microsoft Teams Performance on Campus Networks | `GoTeamsFlow — Passive Teams Performance Measurement` |
| Multi-Format Security Testing Fuzzer with Crash Analysis | `Multi-Format Security Fuzzer` |
| Finance Event Intelligence Platform | `Finance Event Intelligence Platform` |
| E‑Invoice Management Web Application | `E-Invoice Management Platform` |
| Automated Speaker Verification — DNNs & Transfer Learning | `Automated Speaker Verification` |
| COVID‑19 Tracker | `COVID-19 Tracker` |
| Dungeon RPG Game | `Dungeon RPG Game` |
| Online Discussion Forum — Webserver Backend | `Discussion Forum Backend` |
| Robots to the Rescue — Design Project | `Robots to the Rescue` |

### F6. Skills group order (reorder `skills.yml`; items unchanged)
1. Programming Languages · 2. Cloud & DevOps · 3. Databases & Data · 4. Systems & Networking · 5. Tools & Practices · 6. Frameworks & Libraries · 7. AI / ML

### F7. Community & Beyond Work (edit YAML)
- CSESoc summary → `Designed and ran career events connecting UNSW computing students with industry — as part of the principal student society for CSE at UNSW.`
- FINSOC summary → `Wrote weekly market wraps, case-study articles, and equity research for one of Australia's largest student finance societies.`
- `interests.yml` → one badge per line: `Human rights & world affairs`, `Environmental stewardship`, `International markets & stock trading`, `Blockchain in finance`, `Piano`, `Guitar`, `Jiu-jitsu`, `Boxing`, `Weight-lifting`, `Bouldering`, `Table tennis`.

### F8. Contact CTA
- **Title:** `Let's build something reliable.`
- **Text:** `Whether it's platform engineering, distributed systems, or a good systems-design conversation — my inbox is open.`
- **Note (mono, only when `resume_looking_for_work == "yes"`):** `Based in Sydney · Open to interesting problems` <!-- PLACEHOLDER: Sydney inferred as above; adjust availability wording if not open to opportunities -->
- **Footer text:** `© {{ site.time | date: "%Y" }} Yash Raj · Built with Jekyll, no frameworks.`

---

## G. Interaction & Motion Spec (`js/site.js`, vanilla, dependency-free, `defer`)

Global rule: **every** animation/transition is gated. CSS: wrap transforms/reveals in `@media (prefers-reduced-motion: no-preference)`. JS: check `matchMedia('(prefers-reduced-motion: reduce)')` once; if reduced, skip reveal observer entirely (content stays fully visible) and use `behavior: "auto"` for any programmatic scroll. **No content is ever hidden pending JS** — reveals only *add* motion; with JS off the page is complete.

### G1. Scroll-spy (active nav highlighting)
- `IntersectionObserver` over the 9 section elements (`section[id]`), options `{ rootMargin: "-30% 0px -60% 0px", threshold: 0 }`.
- On intersect: remove `.is-active` + `aria-current` from all `.site-nav__link`, add `.is-active` and `aria-current="true"` to the link whose `href` matches the intersecting section id (nav only links 6 of the 9 — sections without a nav link simply clear the highlight to the nearest previous linked section: maintain a map section→navLink where recognition/community/beyond map to nothing; in that case keep the last active link unchanged).
- On page load with a hash, set the initial active link synchronously.

### G2. Scroll entrance reveals
- Markup: Agent B adds `class="reveal"` to `.section__header`, `.timeline__item`, `.project-card`, `.project-row`, `.skill-group`, `.education__item`, `.entry`, `.contact-cta`. Nothing else.
- CSS (Agent A), inside `prefers-reduced-motion: no-preference` **and** scoped under `html.js` (JS adds the `js` class to `<html>` as its first statement): `.reveal { opacity: 0; transform: translateY(12px); transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out); } .reveal.is-visible { opacity: 1; transform: none; }` Without JS (`html:not(.js)`) or with reduced motion, `.reveal` has no effect → zero content gating, zero CLS (transform/opacity only).
- JS: IO `{ threshold: 0.1, rootMargin: "0px 0px -5% 0px" }`; on intersect add `.is-visible`, `unobserve` (one-shot). Elements already in viewport at load get `.is-visible` immediately on first observe callback.

### G3. Sticky nav behaviors
- Scroll listener (passive, rAF-throttled): toggle `.is-scrolled` on `.site-nav` at `scrollY > 8`.
- Mobile menu: `#nav-toggle` click toggles `.is-open` on `.site-nav`, syncs `aria-expanded`, swaps `aria-label` Open/Close menu. Close on: any `.site-nav__link` click, `Escape` (return focus to toggle), click outside the header, or resize past `$bp-md`. No scroll-locking (menu is a short dropdown, not fullscreen).
- Anchor clicks rely on CSS `scroll-behavior: smooth` (reduced-motion-gated) + `scroll-margin-top` on sections — no JS scrolling code.

### G4. Theme toggle
- Inline FOUC-guard stays in `<head>` (tiny, synchronous): `const t = localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); document.documentElement.setAttribute("data-theme", t);` — **change from current behavior:** first visit honors OS preference.
- `site.js`: click toggles `data-theme` light↔dark, persists to localStorage, updates `aria-pressed` (`true` when dark) and `aria-label` (`Switch to light theme` / `Switch to dark theme`). Icon swap is pure CSS off `[data-theme]` (D3) — no inline styles.
- Also update `<meta name="theme-color">`: two static meta tags with `media="(prefers-color-scheme: …)"` (`#FAFAF7` / `#0E1211`) — acceptable approximation; no JS needed.
- No transition on theme switch except the existing `background-color/color var(--dur-base)` on `body` — do not animate every element (remove the current per-element `transition: all`).

### G5. Education expand/collapse
- Click on `.education__toggle`: if closed → remove `hidden` from the region, force reflow, add `.is-open` (grid-rows 0fr→1fr animates), set `aria-expanded="true"`. If open → remove `.is-open`, set `aria-expanded="false"`, and on `transitionend` (or immediately under reduced motion) re-add `hidden`.
- Region is plain in-flow content — no focus trap needed; no layout shift outside the animating region (grid-rows technique). Print CSS forces regions visible.
- With JS disabled the regions stay `hidden`: acceptable degradation (course lists are supplementary), and print still shows them.

### G6. Hover/press states
Exactly as specified per component in D. Non-interactive elements (badges, bullets, skill groups) have **no** hover states. `:active` press = `translateY(1px)` on buttons only, gated by reduced motion.

### G7. Print link
`#print-link` click → `event.preventDefault(); window.print();` bound in `site.js` (no inline handlers anywhere in the final markup).

**Total JS budget: one file, target < 4 KB minified-equivalent, zero dependencies, zero globals besides an IIFE.**

---

## H. SEO / Meta Plan (Agent B, in `head.html` unless noted)

```html
<title>Yash Raj · Software Engineer — C#/.NET, Cloud & Distributed Systems</title>
<meta name="description" content="Yash Raj is a software engineer at WiseTech Global in Sydney, building reliable C#/.NET platform services, cloud automation, and distributed systems.">
<link rel="canonical" href="{{ site.url }}{{ site.baseurl }}/">

<meta property="og:type" content="profile">
<meta property="og:title" content="Yash Raj · Software Engineer">
<meta property="og:description" content="C#/.NET platform engineering, cloud infrastructure, and distributed systems at WiseTech Global (CargoWise Cloud).">
<meta property="og:url" content="{{ site.url }}{{ site.baseurl }}/">
<meta property="og:site_name" content="Yash Raj">
<meta property="og:image" content="{{ site.url }}/images/avatar.jpg">
<!-- PLACEHOLDER: replace og:image with a purpose-made 1200×630 images/og.png when available -->

<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Yash Raj · Software Engineer">
<meta name="twitter:description" content="C#/.NET platform engineering, cloud infrastructure, and distributed systems at WiseTech Global.">
<meta name="twitter:image" content="{{ site.url }}/images/avatar.jpg">

<meta name="theme-color" content="#FAFAF7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1211" media="(prefers-color-scheme: dark)">

<link rel="icon" type="image/png" href="{{ site.baseurl }}/favicon.png">
<link rel="apple-touch-icon" href="{{ site.baseurl }}/images/avatar.jpg">
<!-- PLACEHOLDER: proper 180×180 apple-touch-icon.png would be better; avatar.jpg is the honest stand-in -->
```

JSON-LD (replaces all inline microdata; single `<script type="application/ld+json">` in head):
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Yash Raj",
  "jobTitle": "Software Engineer",
  "worksFor": { "@type": "Organization", "name": "WiseTech Global" },
  "alumniOf": { "@type": "CollegeOrUniversity", "name": "University of New South Wales" },
  "email": "mailto:yash.raj2@outlook.com",
  "telephone": "+61403016557",
  "url": "https://yashr4j.github.io/",
  "image": "https://yashr4j.github.io/images/avatar.jpg",
  "address": { "@type": "PostalAddress", "addressLocality": "Sydney", "addressCountry": "AU" },
  "sameAs": [
    "https://github.com/yashR4J",
    "https://www.linkedin.com/in/yash-raj-54372a187/",
    "https://www.instagram.com/__yash.r4j/"
  ]
}
```
Build the `sameAs` array from `site.resume_social_links` in Liquid so config stays the source of truth.

**`sitemap.xml`** (new file, front matter `---\n---` so Liquid runs):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{{ site.url }}{{ site.baseurl }}/</loc>
    <lastmod>{{ site.time | date_to_xmlschema }}</lastmod>
    <changefreq>monthly</changefreq>
  </url>
</urlset>
```

**`robots.txt`** (new file, static):
```
User-agent: *
Allow: /
Sitemap: https://yashr4j.github.io/sitemap.xml
```

Perf-adjacent (Agent B): fonts per Section C (preconnect ×2 + one CSS request); all `<img>` get explicit `width`/`height` and `loading="lazy"` (except hero avatar: `loading="eager"` + `fetchpriority="high"`); decorative logos get `alt=""`; **stop referencing `dp.jpg` anywhere** (leave the file or delete it — B's call; deletion preferred).

---

## I. Accessibility Checklist (WCAG 2.2 AA — implementers must satisfy every line)

1. `<html lang="en">`.
2. Landmarks: one `<header>` (nav), one `<main id="main">`, one `<footer>`; `<nav aria-label="Section navigation">`.
3. Skip link is the first focusable element and works (targets `#main`, which needs `tabindex="-1"` only if focus fails in testing — prefer plain anchor target).
4. Heading hierarchy: exactly one `h1` (hero name); every section title `h2`; item titles `h3`; detail subheads `h4`; club names `h5` under an `h4` — no skips.
5. All text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24px/19px-bold text and UI components) in **both** themes — the token palette in C satisfies this; do not introduce off-token colors.
6. Visible `:focus-visible` indicator on every interactive element (`--focus-ring` + offset); focus never obscured by the sticky nav (`scroll-margin-top` on all `[id]` targets — WCAG 2.2 "Focus Not Obscured").
7. Target size ≥ 24×24 CSS px for all controls (nav links 40px, toggles 40–44px, buttons 44px — spec'd in D).
8. Disclosure pattern: `.education__toggle` is a real `<button>` with `aria-expanded` + `aria-controls`; region uses `hidden`. Mobile menu toggle likewise. Theme toggle has `aria-pressed` + dynamic `aria-label`.
9. No inline `onclick`/`onmouseover` anywhere; all behavior in `js/site.js`; full functionality available with keyboard alone; `Escape` closes the mobile menu and returns focus to its trigger.
10. `prefers-reduced-motion: reduce` disables: smooth scroll, reveals, transforms, chevron rotation animation, button press transform. Color/opacity fades may remain.
11. Images: meaningful (`hero__avatar`) get descriptive alt; logos are decorative → `alt=""` + `loading="lazy"` + explicit dimensions (also prevents CLS).
12. Content never gated on JS or hover: education details degrade to hidden-but-printable; hover cards are gone; nothing appears only on hover.
13. Links have discernible text (social pills include visible labels; icon-only is banned).
14. `aria-current="true"` mirrors the visual active-nav state.
15. Zoom to 400%/reflow at 320px: no horizontal scroll (fluid type, wrapping grids, `min-width: 0` on grid children).
16. Print output readable: black on white, URLs of social profiles listed via `print-social-links.html`.

---

## J. File-Ownership Split (STRICT — no shared files)

### Agent A — Styling. Owns exactly:
- `_sass/**` — delete `_modern.scss`, `_layout.scss`, `_variables.scss`, `_resume.scss`, `_mixins.scss` and rebuild as:
  - `_sass/_tokens.scss` (Section C verbatim)
  - `_sass/_reset.scss` (replace normalize v3 with a modern minimal reset; keep the file `_normalize.scss` deleted)
  - `_sass/_base.scss` (html/body, typography defaults, links D14, utilities D18, selection color `background: var(--accent); color: var(--on-accent)`)
  - `_sass/_nav.scss`, `_hero.scss`, `_section.scss`, `_summary.scss`, `_timeline.scss`, `_projects.scss`, `_skills.scss`, `_education.scss`, `_entry.scss`, `_badges.scss`, `_buttons.scss`, `_social.scss`, `_contact.scss`, `_footer.scss`, `_reveal.scss`, `_print.scss`
- `css/main.scss` — keep the empty front matter block; update the import list to the partials above.
- Rules: style **only** classes in Section D + base elements. Never reference an id for styling. Do not touch any file outside `_sass/` and `css/`.

### Agent B — Markup / Content / SEO / JS. Owns exactly:
- `_layouts/resume.html` (rebuild per E)
- `_includes/**` (rewrite `head.html`; new `nav.html`, `hero.html`, `section-*.html`, `footer.html`; keep `icons/*`, `print-social-links.html`; delete `icon-links.html` if superseded by hero/footer social markup)
- `index.html` (unchanged shell: front matter → layout)
- `_data/**` (edits per E/F: durations, `location`, `featured`, `short_name`, skills order, associations summaries, interests restructure — facts never altered)
- `_config.yml` (per E)
- New: `sitemap.xml`, `robots.txt`, `js/site.js`
- `images/**` and `favicon.png` (use `avatar.jpg` for hero; delete `dp.jpg` and unused `screenshot.png` reference-check first)
- Rules: use **only** classes from Section D (+ utilities). Never create a class not in this spec. Do not touch `_sass/**` or `css/**`. All JS in `js/site.js` except the ≤3-line FOUC guard in `head.html`.

### Edge files — single owner each:
| File | Owner | Action |
|---|---|---|
| `README.md` | Agent B | Optional: update description; low priority |
| `Gemfile`, `Gemfile.lock`, `Dockerfile`, `.travis.yml`, `.dockerignore`, `.gitignore`, `LICENSE` | **Nobody** | Do not touch |
| `_assets/**` (design sources) | **Nobody** | Do not touch |
| `favicon.png` | Agent B | Keep as-is (32×32) |
| `SPEC.md` (this file) | **Nobody** | Read-only contract |

**Definition of done (both agents):** `bundle exec jekyll build` succeeds with no Liquid/Sass errors; every class in Section D appears in both the compiled CSS and the rendered HTML; the page renders complete and readable with JS disabled; light mode is the default; print preview is clean.
