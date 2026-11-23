# Terrarium / Earth — Design Spec

> Warm botanical ceramics: oat-linen paper, glazed cream cards with warm layered shadows, pebble shapes, and a palette from a windowsill — terracotta, moss, ochre, linen, espresso. A soft serif for what you read first; motion that settles like a leaf.

**Use it for** journaling, wellbeing and habit apps, slow-living and food brands, community and care products, gardening, education for younger audiences, anything that should feel kind.
**Avoid it for** dense professional dashboards, trading or monitoring tools, products that need maximum information density, cold technical brands.

## 1. Design intent

- **Made by hand, glazed by fire.** Surfaces are cream ceramic on linen; depth is a warm, layered shadow, never grey.
- **Colors from nature, each with a meaning.** Terracotta is the main action; moss is calm and "on" (progress, the current place); ochre is paused; soft clay is a draft. Espresso is ink.
- **Soft, never sloppy.** Round pills and pebbles, a soft serif (Fraunces with its SOFT axis) for headings, a round sans for the interface, generous spacing.
- **Organic motion.** 300ms on a soft spring with a small warm overshoot: indicators sway into place, rings grow, knobs stretch as you press, sprouts grow when something is done.

## 2. Reference analysis

Primary reference: `UI参考图/terrarium-earth.jpg` (kept local, never committed). Facts are only what the image shows; everything else is a labelled decision.

| Element | Seen in the reference (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Header | "TERRARIUM / EARTH" in a soft serif with a terracotta slash; "Warm botanical & ceramic interface language" between hairlines; potted plants and ceramics left and right | Fraunces 600 caps with SOFT 100; the ceramics redrawn as inline SVG (pothos vase, terracotta pot, dried flowers, bowl) |
| Cards | Four rounded cream cards on linen, "01. FOUNDATIONS … 04. DATA & FEEDBACK" with a one-line lede | `.terrarium-card`, 28px radius, warm level-2 shadow with a glaze highlight |
| Palette | Pebble swatches: Terracotta #C85A32, Moss #3E5C4A, Ochre #D49A3A, Linen #E9DFD0, Espresso #26221E | Five pebble outlines (`.terrarium-pebble--2…5`); the first one breathes on the styleguide |
| Surfaces | Surface 1 (Base), Surface 2 (+4px), Surface 3 (+8px) | Three shadow levels; canvas `#F3EFE6`, cards `#FAF7F0` |
| Radius | 8, 16, 20, 28px | `sm md lg xl` + `pill` + `pebble` |
| Icons | Sprout, house, open book, calendar, heart, lotus — soft outlines | 1.6px round strokes, drawn for this pack |
| Controls | Continue (terracotta), Save Draft (moss), Cancel (cream outline); input "Enter your journal title" with a sprout; checked terracotta checkbox; terracotta radio; moss switch with "On" inside and a cream "Off"; slider at 68% with terracotta label | **Terracotta buttons use #B9502B** (white on #C85A32 is 4.2:1); the switch word comes from `data-on` / `data-off` |
| Navigation | Segmented Today / Journal / Archive (terracotta pill); breadcrumb ⌂ Home › Journal › New Entry in a pill; pagination 1 2 3 … 8; sidebar with Habits as a moss pill | Pills slide on the spring; breadcrumb current item in terracotta text (#A9471F, 5.4:1) |
| Data & feedback | "Daily Journal" card with a botanical tile and Active / Paused / Draft badges; 75% Progress ring in moss; "Entry saved" toast; Ava / Noah / Maya list with photos; "Save changes?" dialog with a sprout | Photos replaced by **illustrated portraits** (no external images); the ring counts up in CSS; the dialog's sprout grows as it opens |
| Not in the reference | — | Hover / pressed / focus / disabled states, tabs, chips, notes, tooltip, table, progress bars, the evening theme, the journal example |

## 3. Foundations

| Role | Token | Daylight | Evening |
| --- | --- | --- | --- |
| Canvas | `--terrarium-color-canvas` | `#F3EFE6` | `#1B201C` |
| Card | `-surface` / `-surface-raised` | `#FAF7F0` / `#FFFCF6` | `#242A25` / `#2C332D` |
| Ink / text / muted | `-ink` / `-text` / `-text-muted` | `#26221E` / `#3B342D` / `#6E6457` (5.4:1) | `#F2EBDD` / `#DDD5C6` / `#ADA595` |
| Primary (terracotta) | `-primary` / `-primary-ink` | `#B9502B` / `#FFFBF5` (4.9:1) | `#D9714A` / `#1B1410` |
| Secondary (moss) | `-secondary` / `-secondary-ink` | `#3E5C4A` / `#F7F3EA` (7.4:1) | `#86AE93` / `#13201A` |
| Ochre / clay | `-ochre` + `-ochre-ink`, `-rose` + `-rose-ink` | `#D49A3A` / `#3A2A10` (5.6:1) | |

**Typography** — Fraunces (opsz, wght, SOFT 100) for the display (58px caps), section titles (26px caps) and card titles (22px); Plus Jakarta Sans 400–700 for everything else (body 15px).
**Shape** — fields 16px, inner cards and toasts 20px, cards and dialogs 28px, pills for buttons, tabs, badges and switches, pebbles for swatches.
**Depth** — every level pairs a glaze highlight (`inset 0 1px 0`) with a hairline of warm shade and a soft warm drop: 1 (base) · 2 (+4px) · 3 (+8px). Terracotta and moss pieces cast shadows of their own color.
**Evening (added)** — "Deep moss reading light": dark moss-charcoal walls, glazed cards one step lighter, cream ink, terracotta and moss lifted so they still glow; text on them turns dark.

**Motion** — Organic botanical ease: 300ms on `cubic-bezier(.34,1.35,.64,1)`. Segmented, tabs and sidebar indicators sway to the new item; buttons lift 1px toward the pointer and give way (`scale(.97)`, 120ms) when pressed; switch knobs stretch while held; chips plant a moss seed; the ring grows on load and tweens whenever habits change (`@property --terrarium-value`, counted up in CSS); the dialog blooms and its sprout grows; cards unfold one after another on load (`.terrarium-grow`). All of it stops under `prefers-reduced-motion`.

## 4. Components

Display, tagline, section title + lede, card (flat / raised), button (primary / secondary / outline / ghost, sizes, icon), field with trailing or leading icon, textarea, checkbox, radio, switch with words (+ small), slider, segmented tabs, tabs, sidebar nav, breadcrumb, pagination, badges (active / paused / draft / neutral), chips, feature card with botanical art, ring, progress bars, toast, notes (moss / ochre / terracotta), dialog with sprout, tooltip, table, avatars (illustrated or initials, stack), community list, pebbles, surface samples.

## 5. Accessibility

- Terracotta buttons are fired one step deeper (`#B9502B`) so white text reaches 4.9:1; terracotta used as text is `#A9471F` (5.4:1).
- Muted text is 5.4:1 on cream; placeholders are the only lighter text.
- Focus is a moss ring with a cream gap on every interactive element.
- Status never relies on color alone: badges carry words, switches carry "On" / "Off", the ring has an `aria-label` that updates with its value.

## 6. Decisions

| Decision | Why |
| --- | --- |
| `#C85A32` kept for the palette, `#B9502B` for buttons | AA contrast for white labels without changing how the palette reads |
| Illustrated portraits instead of photos | No external assets; portraits in the palette feel warmer than stock photos and work in both themes |
| Fraunces with SOFT 100 | The reference's serif has soft, rounded terminals; Fraunces' SOFT axis gives exactly that, from one family |
| One swaying indicator per group | The reference highlights one pill at a time; moving it on a spring reads as something alive rather than a set of buttons |
| Evening theme in deep moss | The reference is daylight only; a moss-charcoal night keeps the botanical mood instead of falling back to neutral grey |

## 7. Files, stack, license

`tokens/tokens.json` (+ `tokens.dark.json`) → `tokens/tokens.css` · `css/terrarium.css` (`base.css`, `components.css`) · `js/terrarium.js` · `index.html` · `components.html` · `examples/journal.html` · `AGENTS.md` · `README.md`.
Stack: HTML + CSS custom properties + optional vanilla JS. Dependencies: none (Fraunces and Plus Jakarta Sans from Google Fonts, SIL OFL). License: MIT.
