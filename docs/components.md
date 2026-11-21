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
