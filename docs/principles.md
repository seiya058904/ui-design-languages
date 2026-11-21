# Principles

Clay UI treats the interface as a physical object: a matte paper board with soft clay pieces pressed onto it. Every visual decision follows from that.

## 1. Height carries meaning
- **Raised** = you can press it (buttons, chips, active tabs, cards you can open).
- **Carved** = you can fill it (text fields, tracks, progress rails).
- **Flat** = it is unavailable (disabled clay has lost its height).

If a piece is neither pressable nor fillable, keep it flat on the board (text, dividers, table rows).

## 2. One accent, and it means "yes"
Mint is the only accent. It marks the primary action, the selected option, the active tab and success. Grey clay is structure. Yellow and coral appear only for warnings and errors. Never use mint for decoration.

## 3. Light comes from above
Every raised piece has a bright top edge, a shaded underside and a soft warm drop shadow. Carved pieces invert that. Shadows are tinted warm brown, never neutral grey or black.

## 4. Round, then rounder
Controls are pills. Cards are 20px. Large panels and dialogs are 28px. Swatches, avatars and icon tiles are 34% squircles. Inner elements are always rounder or equal to their container, never sharper.

## 5. Calm type, confident headlines
Inter throughout. Display and headings are bold with tight tracking; section labels are medium weight at 20px; body is 16px regular. Sentence case everywhere.

## 6. Glow is for attention
The mint glow ring marks keyboard focus, hover on primary actions and the selected chip. It should be the brightest thing on screen, so use it sparingly.

## 7. Quiet motion
Hover lifts by 1px, press sinks by 1px, both in 180ms. Dialogs pop in once. Nothing animates on its own.

## Do / Don't

| Do | Don't |
| --- | --- |
| Put content on a `.clay-board` | Use pure white pages |
| Use one primary button per view | Make every button mint |
| Pair color with an icon or text in alerts and badges | Rely on color alone |
| Keep shadow tokens intact | Hand-write `box-shadow: 0 2px 4px #0003` |
| Use `--clay-color-text-muted` for secondary text | Use `--clay-color-text-subtle` for anything that must be read |
