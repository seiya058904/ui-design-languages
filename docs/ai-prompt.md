# AI prompt

Paste one of these into any AI coding assistant.

## A. With access to this repository

```text
Build <describe the screen> using the Clay UI design system in this repository.
Read AGENTS.md, docs/principles.md and docs/components.md first.
Link css/clay.css, load Inter from Google Fonts, and compose the screen only from .clay-* classes.
Write page CSS for layout only; take every color, radius, shadow, size and duration from var(--clay-*) tokens.
Use one mint primary action per view, raised pieces for things you press, carved wells for things you fill,
and the mint glow for focus. Check the result at 1280px and 390px wide.
```

## B. Without the repository (any stack)

```text
Design in the "Clay UI" style: soft matte clay pieces on a warm off-white paper board with a faint 64px grid.

Palette: board #F1EFEB, page #E6E3DE, raised surface #F8F7F4, carved well #EAE7E2, grey clay #D6D3CD,
mint primary #A8E6CF (top tint #C6F0E0, ink #1E4A3A), focus glow #7CF2C6, text #2C2C2A, muted text #67635D,
warning #F5E596 (ink #4F4310), error #F2A09E (ink #5E1D1B), info #C9DDF2 (ink #1F3A57).

Type: Inter. Display 56/64 bold −0.03em, heading 40/48 bold, title 32/40 semibold, subtitle 24/32,
body 16/24, caption 12/16. Section labels 20px medium. Sentence case, no all-caps.

Shape: controls are pills (44px tall, 32 small, 52 large); cards 20px radius; dialogs 28px;
swatches, avatars and icon tiles are 34% squircles. 4px spacing grid.

Depth: raised = fill + "inset 0 1.5px 0 rgba(255,255,255,.85), inset 0 -2px 3px rgba(84,74,60,.12),
0 1px 1px rgba(84,74,60,.08), 0 4px 10px -2px rgba(84,74,60,.22)". Carved = "inset 0 2px 4px rgba(84,74,60,.18),
inset 0 -1.5px 0 rgba(255,255,255,.75)". Glow = "0 0 0 2px rgba(124,242,198,.95), 0 0 16px 2px rgba(124,242,198,.55)".
Shadows are warm brown, never black. Mint and status fills get a vertical gradient from their light tint.

States: hover lifts 1px with a deeper drop (primary also glows); active sinks 1px with an inset shadow;
focus shows the glow; disabled turns grey (#DAD7D1 / #A29E97) with almost no shadow.
Motion 180ms cubic-bezier(.2,.8,.2,1).

Components: ringed search field (grey clay pill holding a carved pill that glows mint on focus),
segmented tabs (grey track, mint pill on active), underline tabs (carved rail, mint indicator),
mint filter chips (selected one glows), full-width pill alerts with an icon, cards with a grey squircle media tile
and two slabs peeking out below, stacked elevation levels from light to dark grey.
```
