# Erell Institute — erell.ngo

Website for the **Erell Institute**, a 501(c)(3) nonprofit dedicated to education through research in behavioral ecology. Built as a [Ghost CMS](https://ghost.org) custom theme.

---

## Tech Stack

| Tool | Purpose |
| ---- | ------- |
| [Ghost 6.x](https://ghost.org) | Headless CMS + server |
| Handlebars (`.hbs`) | Theme templating |
| [SCSS](https://sass-lang.com) | Styling — compiled to `assets/css/screen.css` |
| [Pure CSS](https://purecss.io) | Responsive grid (`pure-g`, `pure-u-*`) |
| [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) | Display font (Google Fonts) |
| [Iconoir](https://iconoir.com) | Icon set (CDN) |

---

## Local Development

### Requirements

- **Node 22.18+** (Ghost 6 requirement — use `nvm use 22`)
- A local Ghost 6 instance (see below)

### First-time setup

**1. Install Ghost locally** (once):

```bash
mkdir ~/src/ghost-local && cd ~/src/ghost-local
npm install -g ghost-cli
ghost install local --port 2369
```

**2. Symlink this theme into Ghost:**

```bash
ln -s /path/to/erell-ngo ~/src/ghost-local/content/themes/erell-ghost-theme
```

**3. Copy routes config:**

```bash
cp routes.yaml ~/src/ghost-local/content/settings/routes.yaml
```

**4. Activate the theme** in Ghost Admin → Settings → Design.

### Starting Ghost

`ghost-cli restart` has a known bug on Node 22 (ESM/inquirer conflict). Use:

```bash
# Kill any existing instance
kill $(lsof -ti:2369)

# Start Ghost (runs on port 2369; 2368 is used by the local preview server)
cd ~/src/ghost-local && node current/index.js
```

Ghost Admin is at `http://localhost:2369/ghost`.

### Compiling CSS

```bash
npm run build:css
```

SCSS source is in `assets/css/src/`. The compiled `assets/css/screen.css` is checked in.

### Local preview server (no Ghost needed)

```bash
npm run dev
```

Serves static theme files at `http://localhost:2368` for layout/CSS work. Pages won't have Ghost data — use this for styling only.

---

## Project Structure

```
erell-ngo/                       # Ghost theme root
├── default.hbs                  # Base layout (nav, footer, ghost_head/foot)
├── index.hbs                    # Homepage (static, bespoke layout)
├── page.hbs                     # Generic page template (wraps Ghost content)
├── page-support.hbs             # Support page + PayPal widget
├── page-newsletter-archive.hbs  # Dynamic newsletter post list
├── page-lizard-camp.hbs         # Lizard Camp (bespoke year cards)
├── page-meet-the-team.hbs       # Meet the Team (photo grid)
├── page-photos.hbs              # Photo gallery (lightbox)
├── post.hbs                     # Blog post / newsletter post template
├── error.hbs                    # 404 + error page
├── routes.yaml                  # Custom URL → Ghost page/collection mapping
├── assets/
│   ├── css/
│   │   ├── screen.css           # Compiled CSS (commit this)
│   │   └── src/
│   │       ├── _theme.scss      # Color + typography variables
│   │       ├── main.scss        # Imports all partials
│   │       ├── koenig.scss      # Ghost editor card styles
│   │       └── *.scss           # Component styles
│   ├── js/
│   │   ├── main.js              # Scroll animations, lightbox
│   │   └── navigation.js        # Mobile menu
│   └── images/                  # Static images (photos, logos, banners)
├── scripts/
│   ├── migrate-content.js       # One-time: push HTML into Ghost pages + create posts
│   └── fix-lexical.js           # One-time: convert mobiledoc pages to lexical format
└── package.json
```

---

## Routing

Custom URLs are defined in `routes.yaml` (must also be copied to `~/src/ghost-local/content/settings/routes.yaml` locally):

```yaml
routes:
  /:              → index.hbs (homepage)
  /about/:        → Ghost page "about" via page.hbs
  /research/social-systems/:  → Ghost page "social-systems" via page.hbs
  # … etc. for all nested pages
```

Ghost serves pages at `/{slug}/` by default. The routes file is only needed for:
- The homepage (moved posts collection to `/blog/`)
- Nested URLs like `/research/social-systems/` where the page slug alone doesn't match the desired path

**Important:** After editing `routes.yaml` in this repo, copy it to `~/src/ghost-local/content/settings/routes.yaml` and restart Ghost.

---

## Content Management

All editable page content lives in **Ghost Admin** (`http://localhost:2369/ghost`):

| Ghost item | URL | Template |
| ---------- | --- | -------- |
| Page: `about` | `/about/` | `page.hbs` |
| Page: `contact` | `/contact/` | `page.hbs` |
| Page: `support` | `/support/` | `page-support.hbs` |
| Page: `education` | `/education/` | `page.hbs` |
| Page: `netp` | `/education/netp/` | `page.hbs` |
| Page: `research` | `/research/` | `page.hbs` |
| Page: `social-systems` | `/research/social-systems/` | `page.hbs` |
| Page: `movement-ecology` | `/research/movement-ecology/` | `page.hbs` |
| Page: `italian-wall-lizards` | `/research/italian-wall-lizards/` | `page.hbs` |
| Page: `publications` | `/research/publications/` | `page.hbs` |
| Page: `newsletter-archive` | `/about/newsletter-archive/` | `page-newsletter-archive.hbs` |
| Posts tagged `newsletter` | listed at `/about/newsletter-archive/` | `post.hbs` |
| Posts tagged `news` | surfaced on homepage | `post.hbs` |

Pages with bespoke layouts (`photos`, `lizard-camp`, `meet-the-team`) have their content hardcoded in template files — edit the `.hbs` directly.

---

## Color Palette

Defined in `assets/css/src/_theme.scss`:

```scss
$primary:      #F7F3EE;   // warm parchment — page background
$secondary:    #EDE8E0;   // warm cream — card backgrounds
$surface:      #DDD4C4;   // muted tan — dividers, borders
$green-dark:   #3D5A3E;   // deep forest green — headings, CTA buttons
$green-mid:    #5C7A5D;   // sage — accents, hover
$green-light:  #8FA882;   // light sage — tags, highlights
$earth-brown:  #7A5C3C;   // bark brown — accent links
$earth-warm:   #C4956A;   // sandy amber — CTA hover
$font-dark:    #1C1710;   // warm near-black — primary text
$font-mid:     #3D3022;   // warm brown — body text
$font-light:   #6B5E4A;   // muted — captions, meta
```

---

## Adding Content

### New newsletter issue

In Ghost Admin, create a new **Post** and add the tag `newsletter`. It will automatically appear in the `/about/newsletter-archive/` listing.

### New news item

In Ghost Admin, create a new **Post** and add the tag `news`. It will surface on the homepage news section.

### New Lizard Camp year

Edit `page-lizard-camp.hbs` — add a `.camp-year-card` block following the alternating pattern, and add the photo to `assets/images/`.

### New team member

Edit `page-meet-the-team.hbs` — add a card to the team grid and add the headshot to `assets/images/`.

### New publication

Edit the publications content in Ghost Admin (Page: `publications`). PDF files live in `assets/pdf/` and are linked directly.

---

## Theme Validation

```bash
npx gscan .
```

---

## Ghost-specific Gotchas

- **Node 22.18+** required. Ghost 6.46 will refuse to start on older Node.
- **`ghost restart` is broken** on Node 22 due to an ESM/inquirer bug in ghost-cli. Kill the process and run `node current/index.js` directly.
- **Port 2369** — Ghost runs here because 2368 is taken by the local preview server.
- **Template context** — all page templates must wrap content in `{{#post}}...{{/post}}` for `{{title}}` and `{{content}}` to resolve correctly in Ghost 6.
- **Lexical format** — Ghost 6 only renders content in Lexical format. Content imported via `?source=html` becomes mobiledoc (which won't render). Run `scripts/fix-lexical.js` after any bulk import, or use the Ghost Admin editor which writes Lexical natively.
- **routes.yaml location** — Ghost 6 reads from `content/settings/routes.yaml`, not `content/routes.yaml`.
