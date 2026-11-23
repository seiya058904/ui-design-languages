# AGENTS.md — rebuilding the Obsidian / Glass look

Obsidian / Glass is dark first: frosted glass layers over a deep obsidian canvas, 1px specular edges, and one luminous accent. Read this fully, plus DESIGN.md, before writing UI code.

## 1. Use the system

1. Link `css/obsidian.css` (it imports `tokens/tokens.css`, `css/base.css` and `css/components.css`); load **Inter** 400–800 and **JetBrains Mono** 400/500.
2. Build with the `.obsidian-*` classes shown in `components.html`. Page CSS is layout only: every color, radius, shadow, blur, size and duration comes from a `var(--obsidian-*)` token.
3. Optional `js/obsidian.js`: liquid indicators for tabs / segmented / nav, tablist keyboard support, slider sync, menus, rim light, dialogs, dismissable toasts, ⌘K focus, accent switching.
4. Accent: glacier cyan (default), `<html data-accent="emerald">` or `"violet"`, or `[data-accent-set]` controls with the script. There is no light theme.

## 2. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Canvas | `--obsidian-color-canvas` with `--obsidian-atmosphere-page` behind everything — glass needs something to frost | Flat black pages; light backgrounds |
| Layers | Base for solid surfaces, frosted for panels and cards, elevated for anything floating (menus, dialogs, toasts), inset for tracks, fields and wells | Opaque grey cards; drop shadows as the only depth cue; blur without a tint |
| Edges | Every glass layer: 1px border (`border-low` at rest, `border-medium` on hover / elevated) + specular top edge (`inset 0 1px 0 var(--obsidian-color-edge)`) | Thick or colored borders except `border-high` for the focused / selected / primary piece |
| Accent | The accent only where something is on, chosen, focused or primary; it may glow (`--obsidian-color-primary-glow`) | Accent text blocks, accent backgrounds on large areas, glows on more than a few pieces per view |
| Text on accent | `--obsidian-color-primary-ink` (dark) | White on cyan / emerald / violet |
| Type | Inter; caps titles with the number in the accent; 11px caps group labels; tabular figures for numbers | Light weights for body on glass; mixed families |
| Focus | `--obsidian-shadow-focus` on every interactive element | Removing focus to keep the glass clean |
| Motion | 320 ms `cubic-bezier(.22,1,.36,1)`; indicators lead and trail (the trailing edge gathers on `--obsidian-motion-easing-trail`); the rim light glides after the pointer (registered `--obsidian-mx/-my`, 220 ms); 90 ms presses; draw-in for charts | Linear slides, bounces, `transition: all`, a rim light that jumps, glows wider than 18px or glow that leaves its card |

## 3. Recipes

```css
/* Frosted panel */
border: 1px solid var(--obsidian-color-border-low); border-radius: var(--obsidian-radius-xl);
background: var(--obsidian-atmosphere-sheen), var(--obsidian-color-glass);
backdrop-filter: blur(var(--obsidian-blur-frosted)) saturate(140%);
box-shadow: var(--obsidian-shadow-panel);

/* A lit piece */  background: var(--obsidian-color-primary); color: var(--obsidian-color-primary-ink); box-shadow: var(--obsidian-shadow-glow);
/* Values */       style="--obsidian-value: 78"   /* integer 0–100 on .obsidian-ring, .obsidian-progress, .obsidian-slider */
```

A ring: `<div class="obsidian-ring" style="--obsidian-value:78" role="img" aria-label="78% complete"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="obsidian-ring__track" cx="60" cy="60" r="50" pathLength="100"/><circle class="obsidian-ring__arc" cx="60" cy="60" r="50" pathLength="100"/></svg><span class="obsidian-ring__label" aria-hidden="true"><b></b>Complete</span></div>` — the number is drawn by CSS from the value.

## 4. Copy

Calm, precise, sentence case: "Archive workspace?", "This will move the workspace to the archive. You can restore it anytime.", "Workspace saved · Your changes have been applied." Numbers with thousands separators and signed deltas ("+12.6%"). Caps only for panel titles and group labels.

## 5. Working on Obsidian / Glass

- Tokens: edit `tokens/tokens.json` (accents in `tokens.accent-*.json`), run `node scripts/build-tokens.mjs obsidian`; never hand-edit `tokens.css`. Glows and washes are mixed from `--obsidian-color-primary`: a new accent needs only `primary`, `primary-strong` and `primary-ink`.
- Check: `node scripts/check.mjs obsidian` before every commit.
