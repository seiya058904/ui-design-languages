# Braun / Field — Design Spec

> A precision instrument panel: anodized aluminium, POM keycaps with real travel, matte-black recesses, one International Orange and a signal-green lamp. Less, but better.

**Use it for** hardware companion apps, device and lab consoles, audio and measurement tools, industrial dashboards, settings for physical products, anything that wants to feel engineered.
**Avoid it for** editorial or marketing pages that need warmth, long-form reading, playful consumer apps, interfaces that need more than one accent color to separate many categories.

*Braun / Field is an homage to the functionalist industrial-design tradition. It is not affiliated with or endorsed by Braun GmbH.*

## 1. Design intent

- **Everything is a part.** A button is a keycap with a lit face, a solid skirt and a contact shadow; a field is a bay sunk into the panel; a value is printed in mono like a legend.
- **One accent, used as a signal.** International Orange marks the primary key, the dial pointer, lit segments and the current item — nothing decorative is orange.
- **Motion is mechanical.** Keys travel 1.5 mm in 85 ms through a tactile bump, stick for an instant at the bottom and spring back in 170 ms; needles travel along rails; a dial clicks from step to step and its crown dips at each detent. Never an overshoot, never a bounce.
- **Spec-sheet honesty.** Numbered sections on black rules, mono caps notes, labelled specimens, values with units.

## 2. Reference analysis

Primary reference: `UI参考图/braun-field.jpg` (kept local, never committed). Facts are only what the image shows; everything else is a labelled decision.

| Element | Seen in the reference (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Header | "BRAUN / FIELD" in a heavy grotesk; mono tagline "Precision industrial interface language"; right column behind a vertical rule: "SPEC 04.26", then "INTERFACES / COMPONENTS / BEHAVIOUR / SYSTEMS" | Space Grotesk 700, −0.045em, caps; IBM Plex Mono tagline at 0.1em |
| Sections | "01. FOUNDATIONS" … "04. DATA & FEEDBACK"; black rule above, hairline below; right-aligned mono caps triplets ("MATERIALS / GEOMETRY / CONSTRUCTION"); columns split by vertical hairlines | `.braun-section`; a 60-column module grid whose dividers are drawn on each cell's top and left edge |
| Surfaces | Chassis — Anodized Al `#C9C9C6`; Keycap — POM Plastic `#F4F4F1`; Recessed — Matte Black `#1B1B1B`; Bezel — Aluminum `#DADADA` | Tokens `chassis`, `keycap`, `inverse`, `bezel` |
| Colors | Aluminum `#E5E5E0`, Off-White `#F4F4F1`, Obsidian `#1B1B1B`, International Orange `#FF4F00`, Signal Green (no hex printed) | Signal Green `#18D259` (reads as a lit LED); aluminium is the canvas |
| Texture | Speaker grille, "Ø 1.5mm 3mm pitch" | Pure-CSS perforation, 6 px holes at 12 px pitch (4 px/mm), `background-repeat: space` so no hole is ever cut |
| Elevation | "0 mm Base · 0.5 mm Low · 1 mm Mid · 2 mm High" plates | `--braun-shadow-level-0…3`: a solid skirt of 0 / 1 / 2 / 4 px plus a contact shadow |
| Radius | 2 / 4 / 6 / 8 px | `xs` badges · `sm` fields and chips · `md` keys · `lg` plates; added `xl` 14 px for the panel and `pill` |
| Borders | "1 px engraved border — Subtle, precise, permanent." on a brushed plate | A dark line paired with a light line 1 px below (`engrave` / `engrave-light`) |
| Controls | Orange capsule "Execute"; black capsule "Cancal"; switch with an orange dot in its knob, "OFF ON" below; knurled rotary dial with orange pointer, tick ring, "72", "0 – 100"; field "MODULE_01" with caret; orange checked box + empty box; orange radio + empty | "Cancal" → **Cancel**. The dial is fully interactive; the lamp in the switch knob lights when on |
| Navigation | Joined keys "Overview / System / Logs", Overview orange; breadcrumb "Devices › Module › Configuration" (current orange); square pagination keys with "2" orange; sidebar with an orange bar on "Modules" and counts 12 / 4 / 8 / 6 | Keys behave as interlocking push-buttons; the sidebar bar is a needle that travels along a rail |
| Data & feedback | Status card MODULE_01 ● Online — Voltage 12.4 V, Current 0.8 A, Temperature 36.1 °C, Uptime 17:42:36; ~24-segment orange meter "68%" "Syncing data to device…"; black toast "● Synced to device — 2 min ago"; pale-orange alert "Temperature threshold exceeded / Module_01 operating at 78.4 °C" with × ; modal "Reset module? / This will clear all configuration data." Cancel / Reset | 24 segments exactly, lit one at a time; alert wash `#F7E0D3` with `#EFA27F` outline |
| Footer | "LESS BUT BETTER • FUNCTIONAL CLARITY" … "BRAUN / FIELD" on a black rule | Kept |
| Not in the reference | — | Hover, focus and disabled states, the fader, tabs with a needle, chips with lamps, tooltip, table, operator tokens, the power-on self-test, live meters with peak hold, the oscilloscope readout, the console example, **the black anodized edition** |

## 3. Foundations

| Role | Token | Aluminium | Black edition |
| --- | --- | --- | --- |
| Panel | `--braun-color-canvas` | `#E5E5E0` | `#1F1F1E` |
| Wells, tracks | `-chassis` | `#C9C9C6` | `#161615` |
| Plates (cards, dialogs) | `-plate` | `#ECECE8` | `#272726` |
| Keys / POM caps | `-key` / `-keycap` | `#E2E2DD` / `#F4F4F1` | `#383835` / `#3A3A37` |
| Contrasting key, toast | `-inverse` | `#1B1B1B` | `#E2E2DD` |
| Accent | `-primary` | `#FF4F00` | `#FF5A12` |
| Orange as text | `-primary-text` | `#B23500` (4.9:1) | `#FF7A3D` |
| Lamp | `-signal` | `#18D259` | `#22E066` |
| Ink / muted | `-ink` / `-text-muted` | `#1B1B1B` / `#5E5E58` (5.2:1) | `#F1F1EC` / `#A3A39C` |

**Typography** — Space Grotesk 700 for the nameplate, section titles and big numerals (dial readout 52, meter 28); IBM Plex Mono for everything an instrument prints: labels 13–14 / 500, values, keys, spec caps 12 at 0.14em. Tabular figures throughout.
**Spacing** — 4 px base; modules pad 18–20 px; sections 26 px apart.
**Shape** — keys 6 px, fields and chips 4 px, plates 8 px, the panel 14 px; capsules for hero keys and switch tracks.
**Depth** — A raised part = lit top edge (`inset 0 1px 0 highlight`) + solid skirt (`0 2px 0 skirt`) + contact shadow. Pressed: the skirt shrinks to 0.5 px and the top edge falls into shadow — the same five shadow layers, so the press interpolates. Sunk parts use `--braun-shadow-well`.
**Texture** — a fine bead-blasted grain on the panel (inline SVG noise token), brushed lines on plates, concentric turning marks on the knob crown.
**Black edition (added)** — The same instrument in matte-black anodizing: graphite POM keys, the contrasting key turns satin aluminium, highlights fall to a faint sheen, shadows go near-black and the orange brightens a step so lit segments still read. Because every shadow is built from color tokens, the theme only swaps colors.

**Motion** — Mechanical detent. Keycaps press in 85 ms on `easing-key-press` `linear(0, .64 40%, .6 56%, 1)` — a quick first half, a one-frame catch at the tactile bump, then the bottom-out — and return in 170 ms on `easing-key-return` `linear(0, .04 14%, .7 40%, .94 66%, 1)`: a release transient that sticks for an instant, then snaps home without passing rest. Other parts press in 55 ms on `cubic-bezier(.55,0,1,.45)` and release in 140 ms on `cubic-bezier(.2,0,0,1)`. Live meters attack in 70 ms and hold their peak segment for 900 ms (`duration-peak-hold`) before it falls one segment per 60 ms (`duration-decay-step`). The oscilloscope trace sweeps at ~30 fps with a 28% afterglow of the previous frame. Interlocking keys: the new key latches down at press speed while the old one pops up at release speed. Switch knob snaps over centre (120 ms, `cubic-bezier(.7,0,.25,1)`). Needles travel 220 ms like a motor-driven pointer. The dial moves one detent per step (55 ms); a single registered number, `--braun-value`, drives the dial pointer, knurling and lit ticks, the fader and the LED meters — so meters fill segment by segment (`round(down, …)`). Power-on (`.braun-boot`): modules settle 6 px into the panel with a 45 ms stagger, the dial sweeps full scale and settles, meters fill once. All of it stops under `prefers-reduced-motion`.

## 4. Components

Panel, section header, keycap button (primary / default / inverse / ghost, pill, sizes, latched, locked), interlocking keys, needle tabs, breadcrumb, pagination keys, sidebar nav with travelling needle, sunk text field (+ search affix, error, disabled), over-centre switch with lamp (+ OFF / ON legend), checkbox and radio keycaps, **rotary dial** (drag around or up/down, wheel, keyboard; one detent per step), fader with scale, **24-segment LED meter**, thin progress, LED (on / warn / off / blink), badge, status, chips with lamps, status card with readings, toast, alert (warning / neutral), dialog, tooltip, table, operator tokens and person rows, **speaker grille**, engraved plate, swatches, specimens and elevation plates. Markup: `components.html`; signature layout: `index.html`; a real page: `examples/console.html`.

## 5. Accessibility

- Orange keys carry **ink legends** (5.2:1); white on `#FF4F00` is only 3.3:1. Orange used as text switches to `--braun-color-primary-text` (4.9:1).
- Focus is a 2 px ink ring offset from the part — high contrast on aluminium and on orange alike (an orange ring would be 2.6:1 on the panel).
- The dial is a real `role="slider"` with `aria-valuenow` / `-valuetext`, full keyboard support and a linked `<output>`; meters are `role="progressbar"`.
- State is never shown by depth alone: selected keys turn orange, current nav items turn bold and carry the needle, lamps sit next to words.
- Everything moves less under `prefers-reduced-motion`.

## 6. Decisions

| Decision | Why |
| --- | --- |
| Ink, not white, on orange keys | AA contrast (5.2:1 vs 3.3:1). Black legends on safety orange are the industrial convention anyway. `--braun-color-primary-ink` is one token if a product must use white at large sizes |
| "Cancal" → "Cancel" | Typo in the reference |
| Neutral keys in light grey (`#E2E2DD`), POM off-white kept for knobs and caps | The reference's tab, pagination and modal keys read grey on the aluminium; pure off-white keys looked pasted on |
| 24 LED segments, lit only whole | The reference shows ~24; partial segments would look like a rendering glitch, not a meter |
| Dial scale of 25 ticks over 270° with a major every sixth | Matches the reference's density; lit ticks quantize to the detent |
| A needle for tabs and sidebar, latching keys for the segmented control | Two mechanical metaphors — carriage on a rail, interlocking push-buttons — instead of the gliding pill every other pack uses |
| Black anodized dark theme | The aluminium reference has no dark mode; a black edition is how hardware actually ships one |

## 7. Files, stack, license

`tokens/tokens.json` (+ `tokens.dark.json`) → `tokens/tokens.css` · `css/braun.css` (`base.css`, `components.css`) · `js/braun.js` · `index.html` · `components.html` · `examples/console.html` · `AGENTS.md` · `README.md`.
Stack: HTML + CSS custom properties + optional vanilla JS. Dependencies: none (Space Grotesk and IBM Plex Mono from Google Fonts, SIL OFL). License: MIT.
