# AGENTS.md — rebuilding the Zine / Brutal look

Zine / Brutal is a high-contrast print kit: newsprint, 2px black rules, zero-blur hard shadows and three loud inks. Read this fully, plus DESIGN.md, before writing UI code.

## 1. Use the system

1. Link `css/zine.css` (it imports `tokens/tokens.css`, `css/base.css` and `css/components.css`); load **Archivo Black**, **Space Grotesk** 400/500/700 and **Space Mono** 400/700.
2. Build with the `.zine-*` classes shown in `components.html`. Page CSS is layout only: every color, border, radius, shadow, size and duration comes from a `var(--zine-*)` token.
3. Optional `js/zine.js`: tablists (folder tabs, segmented) with arrow keys, menus, pagination, chips (`[data-zine-single]` for one-of), slider sync, sortable tables, dialogs, dismissable toasts, `ZineUI.toast()`, theme switch.
4. Inverted print: `<html data-theme="dark">` (or `"auto"`), or `[data-theme-set]` / `[data-theme-toggle]` controls with the script.

## 2. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Rules | A 2px ink border on every box, button, field and chip; 3px for frames | Hairlines on controls, borderless cards, soft dividers |
| Depth | Hard offset shadows only: `--zine-shadow-sm/md/lg` (2 / 4 / 6px, zero blur) | Blurred shadows, glows, gradients, glass |
| Ink | Lime = primary and selected; vermilion = danger; cobalt = info / identity. Text on lime and vermilion is black; white only on cobalt | Lime text on paper, white on lime, a fourth accent |
| Type | Archivo Black caps for headlines, titles, buttons and big numbers; Space Mono caps for labels and data; Space Grotesk for paragraphs | Light weights, sentence-case buttons, script or serif faces |
| Labels | Black slug labels (`.zine-label`) name sections; code annotations (`.zine-code`) explain specimens | Grey helper text as the only section heading |
| Focus | Fields: lime ring + black edge (`--zine-shadow-focus`); everything else: a 2px dashed cut line offset 4–5px | Lime-only rings, removing outlines |
| Motion | Lift 2px on hover, slam 4px flat in 60ms on press, snap back with one tiny overshoot; stamp checks on | Fades, slow eases, bouncy springs, `transition: all` |

## 3. Recipes

```css
/* A pressable piece */
border: 2px solid var(--zine-color-ink); box-shadow: var(--zine-shadow-md);
transition: transform 160ms cubic-bezier(.3,1.7,.5,1), box-shadow 160ms cubic-bezier(.3,1.7,.5,1);
/* :hover */  transform: translate(-2px, -2px); box-shadow: var(--zine-shadow-lg);
/* :active */ transform: translate(4px, 4px); box-shadow: var(--zine-shadow-flat); transition-duration: 60ms;

/* Hatched lime fill */  background: var(--zine-texture-stripes), var(--zine-color-primary);
```

Folder tabs need a sheet: `<div class="zine-tabs" role="tablist">…</div><div class="zine-sheet" role="tabpanel">…</div>` — the selected tab covers the sheet's top rule. Table headers: wrap labels in `<span>` or a `.zine-sort` button so they sit on lime tape.

## 4. Copy

Loud and short, caps for UI labels and headlines: "FILE SAVED!", "DELETE FILE?", "SEND TO PRINT". Sentences in body copy and toasts: "Changes are now live.", "This action cannot be undone." Numbers with units ("1.2 MB", "300 pcs"), dates ISO-style ("2025-01-24").

## 5. Working on Zine / Brutal

- Tokens: edit `tokens/tokens.json` (and `tokens.dark.json`), run `node scripts/build-tokens.mjs zine`; never hand-edit `tokens.css`. Keep palette tokens (`newsprint`, `black`, `lime`…) fixed; themes only swap the role tokens.
- Check: `node scripts/check.mjs zine` before every commit.
