# Workflow — from reference image to Style Pack

The loop that produced Clay, Lilac, Atelier and Tactile, with the checks that keep visual fidelity and code delivery honest.

## 1. Collect and group references

- Keep reference images locally in `UI参考图/` (git-ignored). They are inspiration, not assets: never commit or republish them, and check the license of anything you do reuse (fonts, icons, photos).
- Group images that share a visual language. Pick the most complete one as **primary**; list what each secondary image adds.

## 2. Write the spec before the code

Start `<pack>/DESIGN.md` with the **reference analysis table** — one row per element (header, palette, type, layers, buttons, inputs, navigation, data, feedback):

| Element | Seen in the reference (fact) | Our decision (inferred / added) |

Facts are only what the image shows (including any printed hex values, labels and states). Everything else — exact colors when labels are illegible, font family, size scale, shadow recipes, motion, extra components — is an inference and must be labelled as one. When a printed value exists, use it (e.g. Lilac's ivory `#FCFAF6`).

## 3. Self-review the spec (no human checkpoint by default)

The repository owner reviews rarely, so the default is **autonomous end-to-end**: do not stop for confirmation. Re-read the reference against the spec table, fix any row that states as fact something the image does not show, then code. Fidelity is enforced later by screenshots (step 5), not by sign-off.

Optional — only if the owner asks for a review round: place the primary reference on a **Claude Design canvas** (an Artifact of the *Design* type) next to annotated callouts for the spec rows and let them correct it in place.

- The canvas is for agreement on *what the style is*; it is not production code.
- Keep each pack's canvas and any design-system sync **separate per pack**. The homepage chrome in `site/` is never synced or mixed into a pack.

Status in this environment (checked 2026-11-22): the Design artifact type is available; the account has no design systems; the `DesignSync` tool only runs from a user-started `/design-sync` and targets claude.ai/design projects, and **standalone claude.ai/design closes on 2026-12-14** — so this workflow does not depend on `/design-sync`. If you try it, sync one pack folder per design-system project.

## 4. Build in this order

1. `tokens/tokens.json` (+ `tokens.dark.json` or `tokens.<attr>-<value>.json` variants) → `node scripts/build-tokens.mjs <pack>`.
2. `index.html` — the styleguide, recreating the reference layout first. This is the representative page.
3. `css/components.css` — only components the reference shows, plus the shared anatomy (btn, input, chip/badge, tabs, toggle/checkbox/radio, card, nav, table, dialog, tooltip). Every interactive component gets hover, active, focus-visible and disabled.
4. `components.html` — the catalog: every component as real, working markup, split into demos (variants, sizes, states) under the shared component ids (see the repo `AGENTS.md`). The components browser renders these demos live; never show a component as a screenshot or a crop of the styleguide.
5. One real example page in `examples/` that uses the delivered CSS and JS unchanged.

## 5. Verify in a real browser

- `node scripts/snap.mjs <pack>` (or `site`) — full-page screenshots at 1280 and 390 (real mobile emulation) into `.snapshots/`, and a non-zero exit if any page overflows horizontally (it names the culprit elements). It captures in slices and stitches them (a single capture of a page full of live iframes and components exceeds headless raster memory), freezes infinite animations and shows scroll reveals in their final state.
- Put the screenshot next to the reference and check: layout proportions, alignment, type, colors, spacing, shadows, image crops, states, responsive behaviour. Fix, re-run.
- For motion (sliding indicators, knobs), sample positions over real time via the DevTools protocol; headless "virtual time" screenshots freeze CSS transitions.

## 6. Deliver

- `DESIGN.md` (spec), `AGENTS.md` (rules for AI), `README.md` (quick start, components, tokens), screenshots.
- A card on the homepage (`index.html`) and an entry in `packs.json`.
- Styleguides include `site/code-view.js`, which shows each specimen's markup read from the delivered file, so preview and copied code are the same.
- `node scripts/build-tokens.mjs --check` and `node scripts/snap.mjs` pass; commit; push.

## Isolation rules

- `site/` (homepage styles, code viewer) is neutral chrome. Packs never import it for styling; the code viewer renders in Shadow DOM.
- A pack never reads another pack's tokens or classes.
- The homepage never sets pack tokens; it only embeds pack pages in iframes.
