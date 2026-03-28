# Erell Institute — erell.ngo

Website for the **Erell Institute**, a 501(c)(3) nonprofit dedicated to education through research in behavioral ecology. Built with Astro 4.

---

## Tech Stack

| Tool | Purpose |
| ---- | ------- |
| [Astro 4.3](https://astro.build) | Static site generator |
| [Bun](https://bun.sh) | Package manager & runtime |
| [SCSS](https://sass-lang.com) | Styling (scoped per component + global theme) |
| [Pure CSS](https://purecss.io) | Responsive grid (`pure-g`, `pure-u-*`) |
| [Adobe Typekit](https://fonts.adobe.com) | Fonts: `apparat-light` (body), `indivisible` (UI) |
| [Iconoir](https://iconoir.com) | Icon set (CDN) |
| React (`@astrojs/react`) | Retained for potential interactive components |

---

## Project Structure

```text
src/
├── assets/
│   ├── css/
│   │   ├── _theme.scss        # Color palette + typography variables
│   │   ├── _mixins.scss       # Responsive breakpoint helpers
│   │   ├── global.scss        # Base reset, page-header, fade-up, section-title
│   │   ├── navigation.scss    # Top nav, dropdowns, mobile hamburger
│   │   └── donate.scss        # Fixed floating donate button (bottom-right)
│   ├── img/
│   │   ├── logo.svg
│   │   ├── main-banner.jpg
│   │   ├── homepage/          # curiosity, creativity, teamwork, discovery, research, support
│   │   ├── lizard-camp/       # Year photos 2017–2025
│   │   └── meet-the-team/     # Headshots
│   └── pdf/                   # Freely available PDFs (served via Vite import.meta.glob)
├── components/
│   ├── Navigation.astro
│   └── Footer.astro
├── layouts/
│   └── Layout.astro           # Shared HTML shell; accepts title + description props
└── pages/
    ├── index.astro             # Homepage
    ├── about.astro             # Mission + overview
    ├── about/
    │   ├── meet-the-team/      # Team + advisory board with photo lightbox
    │   └── newsletter-archive/ # July 2025 + December 2025 editions
    ├── education/
    │   ├── index.astro
    │   ├── lizard-camp/        # Year-by-year alternating cards 2017–2025
    │   └── netp/               # Naturalist Education & Training Program
    ├── research/
    │   ├── index.astro
    │   ├── publications/       # Full bibliography with PDF links (30+ entries)
    │   ├── movement-ecology/
    │   ├── social-systems/
    │   └── italian-wall-lizards/
    ├── photos/
    ├── support/
    └── contact/
```

---

## Color Palette

Defined in `src/assets/css/_theme.scss`:

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

## Local Development

```bash
# Install dependencies
bun install

# Start dev server at http://localhost:4321
bun run dev

# Production build (outputs to dist/)
bun run build

# Preview production build locally
bun run preview
```

---

## GitHub Pages Deployment

The site deploys automatically to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.

### One-time repository setup

1. Go to **Settings → Pages** in the GitHub repository.
2. Under **Source**, select **GitHub Actions**.
3. If using a custom domain, enter `www.erell.ngo` in the **Custom domain** field and save.
4. Create a file `public/CNAME` at the project root containing just: `www.erell.ngo`
5. Ensure your DNS provider has a CNAME record: `www.erell.ngo` → `nathanrdodson.github.io`

### Pushing an update

```bash
git add .
git commit -m "describe your change"
git push origin main
```

The Actions workflow will install dependencies with Bun, build, and deploy `dist/` to Pages automatically. Monitor build status at `https://github.com/nathanrdodson/erell-ngo/actions`.

### Deploying to a subdirectory instead of a custom domain

If you want `nathanrdodson.github.io/erell-ngo` instead of a custom domain, update `astro.config.mjs`:

```js
export default defineConfig({
  integrations: [react()],
  site: 'https://nathanrdodson.github.io',
  base: '/erell-ngo',
});
```

---

## Publications & PDFs

PDFs live in `src/assets/pdf/`. They are bundled through Vite so filenames get content-hashed in the build:

```ts
const pdfFiles = import.meta.glob('/src/assets/pdf/*.pdf', {
  eager: true, query: '?url', import: 'default'
});
```

Publications with `~` in `publications.md` have freely available PDFs; others display a "Request PDF" mailto link to `deifler@erell.ngo`.

---

## Adding Content

### New publication with PDF

1. Add the PDF to `src/assets/pdf/`
2. In `src/pages/research/publications/index.astro`, change the entry from a `pub-request` link to a `pub-pdf` link: `<a href={pdf('your-filename.pdf')} class="pub-pdf" target="_blank">PDF</a>`

### New Lizard Camp year

1. Add a photo to `src/assets/img/lizard-camp/` (e.g., `2026.jpg`)
2. Import it at the top of `src/pages/education/lizard-camp/index.astro`
3. Add a `.camp-year-card` block following the existing alternating pattern

### New team member

Edit `src/pages/about/meet-the-team/index.astro` and add a card to the team grid.

---

## Scroll Animations

Elements with class `fade-up` animate in on scroll via `IntersectionObserver` in `Layout.astro`. Apply `class="fade-up"` to any section wrapper to opt in.

---

## Navigation

Nav lives in `src/components/Navigation.astro` + `src/assets/css/navigation.scss`. Dropdowns are CSS hover-based (no JS). The mobile hamburger is a pure CSS checkbox toggle.

Dropdown menus: About, Education, Research.

Top-level links: About · Education · Research · Photo Gallery · Support · Contact
