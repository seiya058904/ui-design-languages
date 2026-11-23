# Components

All components are plain CSS classes. States work both with real pseudo-classes and with helper classes (`.is-hover`, `.is-active`, `.is-focus`, `.is-selected`, `.is-disabled`) so you can show any state statically. Icons use the sprite in [`assets/icons.html`](../assets/icons.html): `<svg class="clay-icon"><use href="#i-search"/></svg>`.

Live reference: [`index.html`](../index.html).

## Board — `css/base.css`
```html
<main class="clay-board clay-ruler">…</main>
```
`.clay-board` paper + 64px grid · `.clay-ruler` adds the ruler frame (showcase sheets only) · `.clay-grid-bg` grid on any element · `.clay-raised` / `.clay-sunken` generic surfaces.

Typography: `.clay-display` `.clay-heading` `.clay-title` `.clay-subtitle` `.clay-lead` `.clay-body` `.clay-small` `.clay-caption` `.clay-muted` `.clay-mono` `.clay-section-title`.
Layout: `.clay-container` `.clay-stack` (`--gap`) `.clay-row` (`--gap`) `.clay-divider` `.clay-visually-hidden`.

## Theme switch — `js/clay.js`
```html
<div class="clay-segmented" role="tablist" aria-label="Theme">
  <button class="clay-segmented__item" role="tab" data-theme-set="light">Light</button>
  <button class="clay-segmented__item" role="tab" data-theme-set="dark">Dark</button>
  <button class="clay-segmented__item" role="tab" data-theme-set="auto">Auto</button>
</div>

<button class="clay-btn clay-btn--icon" data-theme-toggle aria-label="Dark theme">
  <svg class="clay-icon clay-theme-icon--to-dark"><use href="#i-moon"/></svg>
  <svg class="clay-icon clay-theme-icon--to-light"><use href="#i-sun"/></svg>
</button>
```
Selection is remembered in `localStorage` (`clay-theme`) and announced with a `clay:themechange` event (`detail.theme`, `detail.dark`). `ClayUI.setTheme("dark")` works too.

## Button — `button.css`
```html
<button class="clay-btn clay-btn--primary">Send invoice</button>
<button class="clay-btn">Cancel</button>
<button class="clay-btn clay-btn--neutral clay-btn--sm">Image</button>
<button class="clay-btn clay-btn--icon" aria-label="Search"><svg class="clay-icon"><use href="#i-search"/></svg></button>
```
Variants `--primary` `--neutral` `--ghost` · sizes `--sm` `--lg` `--icon` `--block` · works on `<a>` too · disabled via `disabled`, `.is-disabled` or `aria-disabled="true"`.

## Inputs — `input.css`
```html
<!-- Ringed search field -->
<label class="clay-field">
  <span class="clay-field__control">
    <input type="search" placeholder="Search invoices" aria-label="Search invoices">
    <svg class="clay-icon"><use href="#i-search"/></svg>
  </span>
</label>

<!-- Form row with plain carved input -->
<div class="clay-form-row">
  <label class="clay-label" for="email">Billing email</label>
  <input class="clay-input" id="email" aria-invalid="true" aria-describedby="email-hint">
  <span class="clay-hint clay-hint--error" id="email-hint">Add a domain, for example name@company.com</span>
</div>
```
`.clay-input` also styles `<textarea>` and `<select>`. States: `:focus`/`.is-focus`, `aria-invalid="true"`/`.is-invalid`, `:disabled`; for the ringed field use `.clay-field.is-invalid` / `.is-disabled`.

## Chip & badge — `chip.css`
```html
<button class="clay-chip" aria-pressed="false"><svg class="clay-icon"><use href="#i-filter"/></svg>Filter</button>
<button class="clay-chip" aria-pressed="true">Selected</button>
<span class="clay-badge clay-badge--success">Paid</span>
```
Chip: `aria-pressed="true"`/`.is-selected` glows · `--neutral` · `:disabled`. Badge (passive): `--success` `--warning` `--error` `--info` `--plain` (no dot).

## Tabs — `tabs.css`
```html
<div class="clay-segmented" role="tablist" aria-label="Section">
  <button class="clay-segmented__item" role="tab" aria-selected="true">Overview</button>
  <button class="clay-segmented__item" role="tab" aria-selected="false" tabindex="-1">Billing</button>
</div>

<div class="clay-tabs" role="tablist" aria-label="Section">
  <button class="clay-tabs__item" role="tab" aria-selected="true">Overview</button>
  <button class="clay-tabs__item" role="tab" aria-selected="false" tabindex="-1">Billing</button>
</div>
```
`.clay-segmented--block` stretches full width. Add `aria-controls="panel-id"` and `js/clay.js` toggles the panels' `hidden` attribute.

**Sliding indicator.** With `js/clay.js` loaded, every tablist gets one mint pill (segmented) or bar (underline) that glides to the active tab in 380ms with an iOS-style ease (`--clay-motion-easing-spring`); holding the active segment squeezes the pill slightly. It measures the real tab positions, so any number of tabs and any label length work, and it follows resizes and web-font loading. Without JS each tab falls back to its own static highlight.

In React/Vue/Svelte, just render `aria-selected="true"` (or `.is-active`) on the active tab — the indicator follows attribute changes and picks up tablists rendered later. Manual hooks: `ClayUI.initIndicators(root)`, `ClayUI.refresh(list)`, `ClayUI.selectTab(tab)` (`initTabs` / `refreshTabs` remain as aliases). Keyboard: ←/→, Home, End.

## Alert — `alert.css`
```html
<div class="clay-alert clay-alert--success" role="status"><svg class="clay-icon"><use href="#i-check-circle"/></svg>Invoice sent</div>

<div class="clay-alert clay-alert--error clay-alert--block" role="alert">
  <svg class="clay-icon"><use href="#i-error"/></svg>
  <div><div class="clay-alert__title">Card declined</div><div class="clay-alert__text">Ask the client to update their card, then retry.</div></div>
  <button class="clay-alert__close" aria-label="Dismiss"><svg class="clay-icon"><use href="#i-x"/></svg></button>
</div>
```
Variants `--success` `--warning` `--error` `--info` · `--block` for multi-line content.

## Card — `card.css`
```html
<article class="clay-card clay-card--stacked">
  <div class="clay-card__content">
    <h3 class="clay-card__title">Title</h3>
    <p class="clay-card__text">Body copy.</p>
    <div class="clay-card__footer"><button class="clay-btn clay-btn--sm">Open</button></div>
  </div>
  <div class="clay-card__media"><svg viewBox="0 0 24 24"><use href="#i-image"/></svg></div>
</article>
```
Variants `--column` `--stacked` `--sunken` `--interactive` · `.clay-card__media--wide` 16:9.

## Surfaces — `surface.css`
- Swatch: `<div class="clay-swatch clay-swatch--primary"></div>` (`--surface` `--neutral` `--warning` `--error` `--ring`; size via `--swatch-size`) + `.clay-swatch-label`.
- Elevation utilities: `.clay-elevation-1` … `.clay-elevation-5`.
- Strata (stacked levels demo): `.clay-strata > .clay-strata__level × 5`.
- Avatar: `<span class="clay-avatar" style="--avatar-size:40px;--avatar-bg:#F5E596">AM</span>`, group with `.clay-avatar-group`.
- Progress: `<div class="clay-progress" role="progressbar" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100"><span style="--value:72%"></span></div>`.

## Selection controls — `controls.css`
```html
<label class="clay-check"><input type="checkbox" class="clay-toggle" checked> Email receipts</label>
<label class="clay-check"><input type="checkbox" class="clay-checkbox"> Include tax</label>
<label class="clay-check"><input type="radio" name="cycle" class="clay-radio"> Monthly</label>
```
Pressing stretches the glossy toggle knob toward its travel and squashes its shadow; it then travels on `--clay-motion-easing-knob`, overshooting a hair past the stop. Pure CSS, no JS needed.

## Slider — `slider.css`
```html
<div class="clay-slider-row">
  <input class="clay-slider" id="vol" type="range" min="0" max="100" value="64" style="--clay-value:64" aria-label="Volume">
  <output class="clay-slider-value" for="vol" data-suffix="%">64%</output>
</div>
```
A glossy clay ball in a carved groove. `--clay-value` (0–100) draws the mint fill so it always ends under the knob's centre; `js/clay.js` keeps it and the `<output for>` in sync. Hover puffs the knob up, pressing squashes it (`scale(1.14, .86)`) and adds the glow. `--sm` for a 22px knob; `:disabled` goes flat and grey.

## Stepper — `stepper.css`
```html
<div class="clay-stepper" role="group" aria-label="Seats">
  <button class="clay-stepper__btn" type="button" data-step="-1" aria-label="Fewer seats"><svg class="clay-icon"><use href="#i-minus"/></svg></button>
  <input class="clay-stepper__value" type="number" value="4" min="1" max="12" aria-label="Seats">
  <button class="clay-stepper__btn" type="button" data-step="1" aria-label="More seats"><svg class="clay-icon"><use href="#i-plus"/></svg></button>
</div>
```
With `js/clay.js` the keys step the input by its `step` (press and hold to repeat, faster and faster), the digits pop (`.is-bump`), and a key at either end of the range gets `aria-disabled="true"` so it stays focusable. `--sm` for 32px keys.

## Accordion — `accordion.css`
```html
<div class="clay-accordion">
  <details class="clay-accordion__item" name="faq" open>
    <summary class="clay-accordion__head">How do refunds work?<span class="clay-accordion__knob" aria-hidden="true"><svg class="clay-icon"><use href="#i-chevron"/></svg></span></summary>
    <div class="clay-accordion__body">…</div>
  </details>
</div>
```
Native `<details>`: keyboard and screen readers work without JS; the same `name` makes it one-open-at-a-time. An open item rises to elevation 2 and its knob turns mint; the body opens on the indicator curve where the browser can animate to `height: auto`.

## Widget tiles — `widget.css`
```html
<div class="clay-widgets">
  <button class="clay-widget" type="button" aria-pressed="true">
    <span class="clay-widget__icon"><svg class="clay-icon"><use href="#i-wifi"/></svg></span>
    <span class="clay-widget__label">Wi-Fi</span><span class="clay-widget__meta">Studio 5G</span>
  </button>
  <div class="clay-widget clay-widget--wide">…label row + .clay-slider…</div>
</div>
```
Control-centre tiles: pressing squashes the tile and sinks its icon; `aria-pressed="true"` fills it with mint clay (`js/clay.js` flips it on click). `--wide` spans the row and holds other controls.

## Navigation, table, dialog, tooltip — `navigation.css`
```html
<nav class="clay-nav">
  <a class="clay-nav__item" href="#" aria-current="page"><svg class="clay-icon"><use href="#i-home"/></svg>Overview</a>
  <a class="clay-nav__item" href="#">Invoices<span class="clay-nav__count">3</span></a>
</nav>

<header class="clay-topbar">…</header>

<div class="clay-table-wrap"><table class="clay-table">…<td class="is-num">$4,200.00</td>…</table></div>

<button class="clay-btn clay-btn--primary" data-clay-open="#send">Send</button>
<dialog class="clay-dialog" id="send" aria-labelledby="send-title">
  <h2 class="clay-dialog__title" id="send-title">Send invoice?</h2>
  <p class="clay-dialog__body">…</p>
  <div class="clay-dialog__actions"><button class="clay-btn" data-clay-close>Cancel</button><button class="clay-btn clay-btn--primary" data-clay-close>Send invoice</button></div>
</dialog>

<span class="clay-tooltip" data-tip="Copied"><button class="clay-btn">Copy link</button></span>
```
**Nav sliding tile.** With `js/clay.js`, the raised tile behind the active `.clay-nav__item` glides to the newly selected item (same engine and timing as the tabs). Mark the current page with `aria-current="page"` (or `.is-active`); plain left clicks move it, modifier clicks (open in new tab) don't, and `href="#"` links don't jump. In a router-driven app, set `aria-current` from your router and the tile follows. `ClayUI.selectNavItem(link)` moves it manually.
