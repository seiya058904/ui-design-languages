# UI Design Languages

A library of complete UI design languages ("Style Packs"). Each one is shown as real, working pages — so you can compare styles by how they actually look and behave — and each one ships both the **design spec** (Markdown) and the **code** (tokens, CSS components, optional JS, demos).

**Live library:** https://seiya058904.github.io/ui-design-languages/

| Pack | Character | Spec | Styleguide + code | Example |
| --- | --- | --- | --- | --- |
| [Clay](clay/) | Soft extruded clay on a matte grid board, mint accent, light + dark | [DESIGN.md](clay/DESIGN.md) | [open](https://seiya058904.github.io/ui-design-languages/clay/) | [dashboard](https://seiya058904.github.io/ui-design-languages/clay/examples/dashboard.html) · [landing](https://seiya058904.github.io/ui-design-languages/clay/examples/landing.html) |
| [Lilac](lilac/) | Ivory study tiles, one glowing accent, editorial serif | [DESIGN.md](lilac/DESIGN.md) | [open](https://seiya058904.github.io/ui-design-languages/lilac/) | [focus planner](https://seiya058904.github.io/ui-design-languages/lilac/examples/app.html) |
| [Atelier](atelier/) | Precise frosted product UI with working appearance settings | [DESIGN.md](atelier/DESIGN.md) | [open](https://seiya058904.github.io/ui-design-languages/atelier/) | [workspace](https://seiya058904.github.io/ui-design-languages/atelier/examples/workspace.html) |
| [Tactile](tactile/) | Warm sand neumorphism, four material states, deep teal | [DESIGN.md](tactile/DESIGN.md) | [open](https://seiya058904.github.io/ui-design-languages/tactile/) | [smart home](https://seiya058904.github.io/ui-design-languages/tactile/examples/home.html) |
| [Sketch](sketch/) | Hand-drawn ink on cream paper, hatching, watercolor tints | [DESIGN.md](sketch/DESIGN.md) | [open](https://seiya058904.github.io/ui-design-languages/sketch/) | [settings](https://seiya058904.github.io/ui-design-languages/sketch/examples/settings.html) |

## Use a pack

```html
<!-- 1. fonts listed in the pack's README, then its entry CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/seiya058904/ui-design-languages@main/atelier/css/atelier.css">
<!-- 2. compose with the pack's prefixed classes -->
<button class="atelier-btn atelier-btn--primary">Create task</button>
<!-- 3. optional behaviour (sliding indicators, theme / appearance, dialogs) -->
<script src="https://cdn.jsdelivr.net/gh/seiya058904/ui-design-languages@main/atelier/js/atelier.js"></script>
```

Or copy the pack folder into your project. Every styleguide has a **Code** button under each component showing the exact HTML from the delivered file. For AI assistants, hand over the pack's `DESIGN.md` and `AGENTS.md`.

## Repository layout

```
index.html            library homepage (live previews, comparison)
site/                 neutral homepage chrome + code viewer (not part of any pack)
packs.json            machine-readable index of packs, entry files, fonts, variants
<pack>/               tokens/  css/  js/  index.html  examples/  DESIGN.md  AGENTS.md  README.md
scripts/build-tokens.mjs   tokens.json (+ variants) → tokens.css, with --check
scripts/snap.mjs           real-browser screenshots at 1280 / 390 + overflow check
docs/WORKFLOW.md           reference image → spec → code → visual check → delivery
```

## Develop

```bash
node scripts/build-tokens.mjs           # rebuild every pack's tokens.css
node scripts/build-tokens.mjs --check   # verify they are in sync
node scripts/snap.mjs [pack]            # screenshots into .snapshots/, fails on horizontal overflow
```

Requirements: Node 18+ and a local Chrome or Edge for `snap.mjs` (`CHROME_PATH` to override). No npm dependencies.

## Licenses

Code and docs: [MIT](LICENSE). Fonts are loaded from Google Fonts under the SIL Open Font License (Inter, Cormorant Garamond, Manrope, Archivo, Plus Jakarta Sans, Kalam, Patrick Hand). Icons are drawn for this repository. The reference images that inspired the packs are not redistributed.
