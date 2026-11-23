# Zine / Brutal — Design Spec

> A high-contrast tactile print kit: newsprint paper, 2px black rules, zero-blur hard shadows and three loud inks — acid lime, vermilion and cobalt. Buttons lift off the page and slam flat. No blur. No gradients. No apologies.

**Use it for** creative tools and studios, indie publishing and events, portfolios, developer tools with personality, campaign and launch pages, internal tools that should feel made by people.
**Avoid it for** calm finance or healthcare products, dense enterprise data entry for eight hours a day, luxury brands, anything that needs to whisper.

## 1. Design intent

- **Printed, not rendered.** Every box is a 2px black rule on paper; depth is an offset block of ink (2 / 4 / 6px), never a blur.
- **Color is ink with a job.** Lime marks the primary action and whatever is chosen; vermilion means danger; cobalt is the third ink for info and identity. Black and newsprint do everything else.
- **Physical snap.** Hover lifts a piece 2px and thickens its shadow to 6px; a press slams it 4px into the page in 60ms; release snaps back with one tiny overshoot. Checks and stickers are stamped on.
- **Editorial structure.** A masthead, numbered spreads with lime title bands, black slug labels, code annotations printed beside specimens.

## 2. Reference analysis

Primary reference: `UI参考图/zine-brutal.jpg` (kept local, never committed). Facts are only what the image shows; everything else is a labelled decision.

| Element | Seen in the reference (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Masthead | "ZINE / BRUTAL" in a black heavy grotesk; "High-contrast tactile print interface kit" in bold mono; "ISSUE 01" in a lime box with a hard shadow, behind a vertical rule | Archivo Black + Space Mono 700; the issue box sits at −1.5° like a pasted label |
| Panels | Four framed spreads "01. FOUNDATIONS … 04. DATA & FEEDBACK" with lime title bands | `.zine-panel` with a 3px frame and a 3px rule under the lime band |
| Labels | Black slugs with white bold mono caps, parenthetical notes in regular ("SURFACE ELEVATION (HARD SHADOW)") | `.zine-label` + `<small>` |
| Elevation | "2px / 4px / 6px SHADOW" boxes captioned "0 2px 2px #111111" etc. | **The captions describe a blurred y-only shadow — corrected to `2px 2px 0`, `4px 4px 0`, `6px 6px 0`** (what the image actually draws) |
| Palette | Newsprint #F4F1EA, White #FFFFFF, Black #111111, Acid Lime #C8FF00, Vermilion #FF3B1F, Cobalt #0057FF | Palette tokens never change; role tokens (paper, surface, ink) are what the dark theme swaps |
| Borders / radius | 1px, 2px, 3px borders; radius 0, 1, 2, 4, 6, 8px | 2px everywhere, 3px for frames; 2px radius on controls, pill only for toggles |
| Controls | PRIMARY (lime), PRIMARY (PRESSED) shifted with no shadow, SECONDARY (white), DANGER (vermilion), each with `<button variant="…" />`; text inputs, focus "// focus: 2px solid #C8FF00"; Unchecked / Checked lime checkbox; Off / On toggles; slider at 65% with a square thumb | Focus = 3px lime ring **plus** a 2px black edge (lime alone is ~1:1 on newsprint); dashed "cut-line" outline for buttons |
| Navigation | Folder tabs OVERVIEW (lime) / FILES / SHARING / SETTINGS with angled corners; breadcrumb HOME > PROJECTS > ZINE / BRUTAL > ISSUE 01 (lime); pagination ‹ 1 2 3 5 › (2 lime); sidebar DASHBOARD / PROJECTS (lime) / FILES / TEAM / SETTINGS | The selected folder tab runs into the sheet below it; sidebar items slide right on hover |
| Data & feedback | Profile card with a pixel portrait on cobalt, "ALEX KIM @alexkim Product / Design", stickers NEW / LIVE / BETA; toast "FILE SAVED! Changes are now live." with ×; modal "DELETE FILE? This action cannot be undone." CANCEL / DELETE; hatched lime progress "70%"; table with a hatched lime header (# / FILE NAME / TYPE / SIZE / UPDATED) | Pixel portrait drawn as 12×12 SVG; header labels sit on lime tape so the hatch never cuts the letters; sortable columns |
| Not in the reference | — | Hover / disabled states, segmented control, chips, alerts, tooltip, avatars with initials, sticker tilt, halftone dialog backdrop, the stamp animation and ink spread, tear-off ticket, sticker board, accordion, **inverted-print dark theme**, the studio example |

## 3. Foundations

| Role | Token | Newsprint | Inverted |
| --- | --- | --- | --- |
| Paper | `--zine-color-paper` | `#F4F1EA` | `#141414` |
| Surface | `-surface` | `#FFFFFF` | `#1D1D1C` |
| Ink (text, rules, shadows) | `-ink` | `#111111` | `#F4F1EA` |
| Muted | `-text-muted` | `#4A4741` (8.2:1) | `#BDB8AD` |
| Primary | `-primary` / `-primary-ink` | `#C8FF00` / `#111111` | same |
| Danger | `-danger` / `-danger-ink` | `#FF3B1F` / `#111111` (5.3:1) | same |
| Info | `-info` / `-info-ink` | `#0057FF` / `#FFFFFF` (5.5:1) | same |

**Typography** — Archivo Black for the masthead (92px, −0.035em), panel titles (30px), button labels and big numbers; Space Mono 400/700 for labels, meta, data and code; Space Grotesk for running text.
**Shape** — 2px rules everywhere, 3px for frames and the issue box; radius 2px on controls and cards; pills only for toggles.
**Depth** — `--zine-shadow-sm/md/lg` = 2 / 4 / 6px hard offsets in ink; `--zine-shadow-flat` is the same shadow at 0 so hover → press interpolates.
**Texture** — uncoated paper fibre (inline SVG noise), a −45° hatch printed over lime (progress, table header), a halftone dot screen behind dialogs.
**Inverted print (added)** — The same kit printed in newsprint-colored ink on black stock: rules, text and hard shadows turn paper-white; the three inks stay as loud. Hatching stays black so it still reads on lime.

**Motion** — Snappy print snap, in printed frames. Hover lifts in two hard frames (`easing-lift` `steps(2, jump-end)`, 90ms): `translate(-2px,-2px)` and a 6px shadow. Press slams flat in a single frame (`easing-slam` `steps(1, jump-start)`): `translate(4px,4px)` and a flat shadow. Release 160ms on `cubic-bezier(.3,1.7,.5,1)` — one tiny overshoot. Checkboxes, radios and the chosen segment are **stamped** (scale 1.45 → 1, −8° → 0, 240ms) and the ink spreads out from under the stamp (`duration-ink` 320ms). Lifting a folder tab tilts it a degree, like paper; a held sticker lifts and tilts, a dropped one slaps flat; a torn ticket stub rips along its perforation and drops away (`duration-tear`). Folder tabs pop up as they are selected; sheets slide in 6px; toasts slap on from the right at a slight angle; dialogs drop onto a halftone screen. Page load: blocks land one after another (`.zine-press`). All of it stops under `prefers-reduced-motion`.

## 4. Components

Masthead type, deck, panel with title band, slug label, code annotation, marker highlight, button (primary / secondary / danger / info / ghost, sizes, icon, pressed), field (+ search, error, disabled), checkbox, radio, toggle, slider, folder tabs + sheet, segmented, breadcrumb, pagination, sidebar menu, chip, sticker (+ tilt), card (+ hover lift), profile, avatar (pixel or initials, stack), progress (+ marching), meter, toast (+ lime), alert (danger / info / lime), dialog, tooltip, sortable table, swatch, shadow block, issue box.

## 5. Accessibility

- Text on lime and vermilion is black (≥ 5.3:1); white only on cobalt (5.5:1).
- Focus is never lime alone (≈1:1 on newsprint): fields get a lime ring with a 2px black edge, everything else a dashed black "cut line" offset from the piece.
- State is shown by more than color: pressed pieces are physically flat, the current menu item gains a black bar, sorted columns flip an arrow and set `aria-sort`.
- Hatching never runs behind text: table header labels sit on a strip of lime tape.

## 6. Decisions

| Decision | Why |
| --- | --- |
| `0 2px 2px` captions → `2px 2px 0` | The printed values describe a soft y-only shadow; the image (and the brief) draw hard diagonal blocks |
| Lime focus ring + black edge | Lime on newsprint has almost no contrast; the black edge makes the ring visible on any paper, and keeps the reference's lime |
| A dashed outline for button focus | A cut line reads as print, never fights the hard shadow, and stays visible on lime |
| Header labels on lime tape | The reference's hatched header puts stripes through the letters; tape keeps the look and the legibility |
| Stamp, not fade | Brutal UIs flicker when they fade; stamping is how print gets marked |
| Inverted-print dark theme | The reference has no dark mode; inverting paper and ink keeps every rule and shadow honest |

## 7. Files, stack, license

`tokens/tokens.json` (+ `tokens.dark.json`) → `tokens/tokens.css` · `css/zine.css` (`base.css`, `components.css`) · `js/zine.js` · `index.html` · `components.html` · `examples/studio.html` · `AGENTS.md` · `README.md`.
Stack: HTML + CSS custom properties + optional vanilla JS. Dependencies: none (Archivo Black, Space Grotesk and Space Mono from Google Fonts, SIL OFL). License: MIT.
