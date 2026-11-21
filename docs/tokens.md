# Tokens

Source of truth: [`tokens/tokens.json`](../tokens/tokens.json) (W3C Design Tokens format). `tokens/tokens.css` is generated from it:

```bash
node scripts/build-tokens.mjs          # regenerate tokens.css
node scripts/build-tokens.mjs --check  # fail if tokens.css is stale
```

Naming: the JSON path joined by `-`, prefixed with `--clay-`. `color.primary` → `--clay-color-primary`, `font.size.body` → `--clay-font-size-body`.

## Color

| Token | Value | Use |
| --- | --- | --- |
| `--clay-color-canvas` | `#E6E3DE` | Page behind boards |
| `--clay-color-board` | `#F1EFEB` | Matte paper board with the grid |
| `--clay-color-surface` | `#F8F7F4` | Raised clay: cards, default buttons |
| `--clay-color-surface-sunken` | `#EAE7E2` | Carved wells: inputs, tracks |
| `--clay-color-primary` | `#A8E6CF` | Mint: primary, selected, success |
| `--clay-color-primary-light` | `#C6F0E0` | Top tint for mint gradients |
| `--clay-color-primary-strong` | `#6ED3AE` | Progress fill, strokes on mint |
| `--clay-color-primary-ink` | `#1E4A3A` | Text/icons on mint |
| `--clay-color-neutral` | `#D6D3CD` | Grey clay: rings, tracks |
| `--clay-color-neutral-strong` | `#B9B5AE` | Media placeholders |
| `--clay-color-border` | `#DCD9D3` | Hairlines, table rows |
| `--clay-color-focus` | `#7CF2C6` | Glow ring |
| `--clay-color-text` | `#2C2C2A` | Primary text |
| `--clay-color-text-muted` | `#67635D` | Secondary text (≥ 4.5:1 on board) |
| `--clay-color-text-subtle` | `#9C988F` | Placeholders, inactive tabs only |
| `--clay-color-disabled` / `-ink` | `#DAD7D1` / `#A29E97` | Disabled fill / text |
| `--clay-color-success` / `-ink` | `#A8E6CF` / `#1E4A3A` | Success |
| `--clay-color-warning` / `-ink` | `#F5E596` / `#4F4310` | Warning |
| `--clay-color-error` / `-ink` | `#F2A09E` / `#5E1D1B` | Error |
| `--clay-color-info` / `-ink` | `#C9DDF2` / `#1F3A57` | Info, drafts |
| `--clay-color-grid` / `-strong` | warm 9% / 22% | Board grid, ruler ticks |

## Typography

| Token | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `--clay-font-size-display` | 56 / 64 | 700, −0.03em | Hero, page title |
| `--clay-font-size-heading` | 40 / 48 | 700, −0.02em | Section heading |
| `--clay-font-size-title` | 32 / 40 | 600 | Page heading in apps |
| `--clay-font-size-subtitle` | 24 / 32 | 600 | Card group, dialog title |
| `--clay-font-size-lead` | 19 / 29 | 400 | Intro paragraph |
| `--clay-font-size-body` | 16 / 24 | 400 | Body |
| `--clay-font-size-small` | 14 / 20 | 400–600 | Dense UI, tables |
| `--clay-font-size-caption` | 12 / 16 | 400–600 | Meta, hints |

Families: `--clay-font-family-sans` (Inter), `--clay-font-family-mono` (JetBrains Mono, used for hex values).

## Spacing (4px grid)

`--clay-space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-8` 32 · `-10` 40 · `-12` 48 · `-16` 64 · `-20` 80

## Radius

| Token | Value | Use |
| --- | --- | --- |
| `--clay-radius-sm` | 8px | Checkbox, tiny tags |
| `--clay-radius-md` | 14px | Nav items, small tiles |
| `--clay-radius-lg` | 20px | Cards, media |
| `--clay-radius-xl` | 28px | Panels, dialogs |
| `--clay-radius-squircle` | 34% | Swatches, avatars, icon tiles |
| `--clay-radius-pill` | 999px | All controls |

## Control sizes

`--clay-size-control-sm` 32px · `--clay-size-control` 44px · `--clay-size-control-lg` 52px

## Shadows

| Token | Use |
| --- | --- |
| `--clay-shadow-raised` | Default extruded clay |
| `--clay-shadow-raised-sm` | Chips, knobs, indicators |
| `--clay-shadow-raised-hover` | Hover lift |
| `--clay-shadow-pressed` | Active / pushed |
| `--clay-shadow-inset` / `-inset-sm` | Carved wells |
| `--clay-shadow-flat` | Disabled |
| `--clay-shadow-glow` | Focus / selected glow (append) |
| `--clay-shadow-elevation-1…5` | Resting tile → dialog |

## Motion

`--clay-motion-duration-fast` 120ms (press) · `--clay-motion-duration` 180ms (hover, color) · `--clay-motion-duration-slow` 280ms (knobs, indicators, dialogs) · `--clay-motion-easing` `cubic-bezier(0.2, 0.8, 0.2, 1)`
