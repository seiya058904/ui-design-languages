# AGENTS.md — rebuilding the Atelier look

Atelier is a tactile, precise product UI: cool frosted panels on a pale blue-grey canvas, one accent, bold semi-expanded uppercase section titles and an appearance panel whose settings really work. Reference: **ATELIER / PRODUCT UI SYSTEM**, with the appearance-settings idea also seen in the Settings sketch.

## 1. Use the system

1. Link `css/atelier.css`; load **Archivo** with the width axis: `family=Archivo:wdth,wght@100..125,400..800`.
2. Compose with `.atelier-*` classes (list in `README.md`). Page CSS is layout only.
3. Include `js/atelier.js` for sliding indicators, sliders, dialogs and the appearance manager.
4. Paste the one-line restore script from `README.md` into `<head>` of every page so stored appearance applies before first paint.

## 2. Appearance model

All of these compose freely because tints are derived with `color-mix()` from the accent and status colors:

| Setting | How | Values |
| --- | --- | --- |
| Theme | `<html data-theme>` | light (default) · `dark` · `auto` |
| Accent | `<html data-accent>` | cobalt (default) · `violet` · `cyan` · `green` · `orange` |
| Density | `<html data-density>` | `cozy` · balanced (default) · `compact` — changes control heights, row height, panel padding and gaps |
| Radius | `--atelier-radius-base` on `<html>` | 8–24px; `sm/md/lg/xl` are 0.5×/0.75×/1×/1.5× of it |
| Motion | `<html data-motion="reduced">` | durations drop to 0 |
| Contrast | `<html data-contrast="high">` | muted text becomes body text, borders become strong |

Never hard-code a tint: if you need a soft version of a color, use `color-mix(in srgb, var(--atelier-color-…) N%, var(--atelier-color-surface))` so it survives dark mode and accent changes.

## 3. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Panels | Frosted: `--atelier-color-panel` + `backdrop-filter: blur(16px) saturate(140%)`, 1px bright rim, soft cool shadow, `--atelier-radius-lg` | Opaque grey cards, heavy borders, warm shadows |
| Titles | Section titles are numbered, uppercase, weight 800, `font-stretch: 112%` ("01. FOUNDATIONS"); the number is the section's order | Numbering things that are not a sequence; uppercase body text |
| Accent | One accent for primary buttons, selected tabs, current page, checked controls, progress | A second accent; colored text for emphasis |
| Buttons | Pills. Primary = accent gradient + glow; Secondary = accent outline; Tertiary = neutral outline; Destructive = coral fill | Square buttons, more than one primary per area |
| Selection | Pill tabs fill with the accent; segmented / theme switch uses a soft accent fill with an accent border; sidebar uses `--atelier-color-primary-soft` | Underlines for primary navigation |
| Status | Soft tinted badges (`--teal`, `--amber`, `--danger`, `--violet`, `--soft`) and one filled `--primary` for "New" | Saturated status fills everywhere |
| Data | Cards are white with 1px border and subtle shadow; kanban columns are sunken | Shadows heavier than `floating` outside overlays |
| Motion | 160ms for color; indicators glide 340ms on `cubic-bezier(.32,.72,0,1)` | Bounces, decorative animation |

## 4. Recipes

- **Primary button**: `linear-gradient(180deg, primary-light, primary)`, shadow `inset 0 1px 0 rgba(255,255,255,.22), 0 1px 2px primary-strong@40%, 0 6px 16px -6px primary@65%`.
- **Panel shadow**: `inset 0 1px 0 rgba(255,255,255,.8), 0 1px 2px rgba(28,35,51,.04), 0 12px 32px -14px rgba(28,35,51,.16)`.
- **Focus**: `0 0 0 3px color-mix(in srgb, accent 30%, transparent)`.
- **Overlay surface**: `repeating-conic-gradient(checker 0 25%, surface 0 50%) 0 0 / 12px 12px`.

## 5. Copy

Plain, product-like, sentence case for UI text ("New task", "Delete project?", "This action cannot be undone."). Uppercase only for section titles and kickers.

## 6. Working on Atelier

Edit `tokens/tokens.json`, `tokens.dark.json` or a `tokens.<setting>-<value>.json` variant, then run `node scripts/build-tokens.mjs atelier` from the repo root. New components go into `css/components.css` with a usage comment and appear on `index.html`.
