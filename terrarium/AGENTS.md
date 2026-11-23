# AGENTS.md — rebuilding the Terrarium / Earth look

Terrarium / Earth is warm botanical ceramics: oat linen, glazed cream cards, pebbles, terracotta and moss, a soft serif, organic motion. Read this fully, plus DESIGN.md, before writing UI code.

## 1. Use the system

1. Link `css/terrarium.css` (it imports `tokens/tokens.css`, `css/base.css` and `css/components.css`); load **Fraunces** (opsz, wght 400–700, SOFT, WONK) and **Plus Jakarta Sans** 400–700.
2. Build with the `.terrarium-*` classes shown in `components.html`. Page CSS is layout only: every color, radius, shadow, size and duration comes from a `var(--terrarium-*)` token.
3. Optional `js/terrarium.js`: swaying indicators (segmented, tabs, sidebar), tablist keyboard support, chips, slider sync, dialogs, dismissable toasts, `TerrariumUI.setValue()` for rings and bars, `TerrariumUI.toast()`, theme switch.
4. Evening theme: `<html data-theme="dark">` (or `"auto"`), or `[data-theme-set]` / `[data-theme-toggle]` controls with the script.

## 2. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Color meaning | Terracotta = the main action; moss = calm actions, "on", progress, where you are; ochre = paused; clay = draft; espresso = ink | Terracotta for status, a sixth hue, saturated brights |
| Surfaces | Cream cards (`--terrarium-color-surface`) on linen, warm shadows (`--terrarium-shadow-level-1…3`) with a glaze highlight | Pure white cards, grey shadows, hard borders around cards |
| Shape | Pills for buttons, tabs, badges, switches; 16 / 20 / 28px for fields, inner cards, cards; pebbles for swatches | Sharp corners, 4px radii, mixed shapes in one group |
| Type | Fraunces (SOFT 100) for display, section and card titles; Plus Jakarta Sans for the interface | Serif body text, all-caps body, light weights on cream |
| Text on color | White on terracotta `#B9502B` and moss; dark ink on ochre; terracotta text uses `--terrarium-color-primary-text` | White on `#C85A32` or ochre |
| Focus | `--terrarium-shadow-focus` (moss ring, cream gap) on every interactive element | Removing focus to keep it soft |
| Motion | 300ms `cubic-bezier(.34,1.35,.64,1)`; knobs and indicators settle on `--terrarium-motion-easing-spring` (one 3% overshoot, decaying); rings and sprouts grow with the habits; warm glaze light glides across cards; presses give way gently | Linear motion, hard snaps, big bounces, overshoot above 5%, `transition: all` |

## 3. Recipes

```css
/* A glazed card */
border-radius: var(--terrarium-radius-xl); background: var(--terrarium-color-surface);
box-shadow: inset 0 1px 0 var(--terrarium-color-glaze), 0 0 0 1px var(--terrarium-color-shade-soft), 0 6px 16px -6px var(--terrarium-color-shade);

/* Rings and bars */  style="--terrarium-value: 75"   /* integer 0–100; TerrariumUI.setValue(el, n) tweens it */
/* Switch words */    <input class="terrarium-switch" type="checkbox" data-on="On" data-off="Off" aria-label="Reminders">
```

## 4. Copy

Kind, calm, unhurried, sentence case: "Entry saved", "Save changes?", "This will update your journal entry.", "Streak paused — pick it up whenever you're ready." Never scold; frame progress gently ("One more and today is fully tended").

## 5. Working on Terrarium / Earth

- Tokens: edit `tokens/tokens.json` (and `tokens.dark.json`), run `node scripts/build-tokens.mjs terrarium`; never hand-edit `tokens.css`.
- Check: `node scripts/check.mjs terrarium` before every commit.
