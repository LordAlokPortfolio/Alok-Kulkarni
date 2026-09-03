# Spend Clarity — Technical Specification

## What it is

- A JavaScript component that visualizes spending variance using a rose
  diagram (Florence Nightingale chart).
- Format-agnostic: accepts any transaction data with a date, a category,
  and an amount.
- Works entirely in the browser: no server calls, no API keys, no login,
  no dependencies, no build step.
- Produces SVG output as a string, for easy embedding anywhere.

## What it does

- Shows spending by category for two time periods (a target month against
  a baseline month).
- Colours each category by variance: red (over), green (under), grey
  (effectively flat).
- Petal length is proportional to the square root of the amount, so a
  petal's visual area — not its length — tracks the money. Linear length
  scaling would make twice the spending look four times as large.
- The baseline month is drawn underneath as a neutral petal, so a shorter
  target petal leaves the baseline visible and a longer one overhangs it.
  The comparison is visible without reading a single number.
- Interactive by design: every petal carries `data-category`, so the host
  app can attach its own click handler and open its own drill-down.

## Why this matters

- Most financial apps show *what* was spent, not *why it changed*.
- Spreadsheets and tables hide spending patterns; a rose diagram surfaces
  the shift in one glance.
- Fintech companies, banks, and advisors need this to help customers
  understand cashflow.

## Market fit

- Credit card issuers (Amex, Visa) needing better customer insights.
- Neobanks (Revolut, Wise) wanting analytics features without building
  them.
- Financial advisory platforms needing client dashboards.
- Budgeting apps (YNAB, Rocket Money) needing variance detection.

## API

```javascript
var svg = SpendClarity.renderRoseDiagram({
  transactions: [
    { date: "2026-03-15", category: "Groceries", amount: 120 }
  ],
  categories:    ["Groceries", "Dining", "Fuel"],  // fixed order, one petal each
  baselineMonth: "2026-02",                        // reference month
  targetMonth:   "2026-03",                        // month being visualized
  width:  400,                                     // SVG viewport width
  height: 400,                                     // SVG viewport height
  colorScheme: "default"                           // "default" | "accessible" | "dark"
});
```

Returns an SVG string. It does not touch the DOM, fetch anything, read
files, or hold state. Calling it twice with the same input returns the
same string.

Loadable three ways: a plain `<script>` tag (sets `window.SpendClarity`
and `window.renderRoseDiagram`), CommonJS `require`, or through a
bundler.

## Variance rules

```
variance = (targetAmount - baselineAmount) / baselineAmount

variance >  0.20  → red    (over baseline by 20% or more)
variance < -0.05  → green  (under baseline by more than 5%)
otherwise         → grey   (effectively flat)

baselineAmount == 0 → red if targetAmount > 0 (new spending), else grey
```

Thresholds are asymmetric on purpose: a 20% overshoot is worth flagging,
while a 6% saving is already worth crediting. They live in
`VARIANCE_THRESHOLDS` at the top of `spend-clarity.js` and are exposed on
the exported object, so a host app can tune them without forking the file.

## How to integrate

1. Include `spend-clarity.js` (one file, ~14KB, no dependencies).
2. Prepare data: `{transactions, categories, baselineMonth, targetMonth}`.
3. Call `renderRoseDiagram(options)` → get an SVG string.
4. Insert that string into your app's DOM.
5. Attach one delegated click listener for drill-down:

```javascript
container.innerHTML = SpendClarity.renderRoseDiagram(opts);
container.addEventListener('click', function (e) {
  var petal = e.target.closest('[data-category]');
  if (petal) showDrilldown(petal.getAttribute('data-category'));
});
```

Each petal also exposes `data-state` (`over`/`under`/`normal`),
`data-baseline`, and `data-target`, so a host app can drive its own
alerting from the same render.

## Accessibility

- Colour is never the only carrier of meaning: each petal is labelled with
  its category, amount, and variance percentage, and carries a `<title>`
  for hover and screen readers.
- The `accessible` colour scheme ships higher-contrast steps for small
  displays and print.
- The whole diagram carries an `aria-label` naming both months compared.

## Limitations (stated plainly)

- Compares exactly two months. Multi-period trends need a different form.
- Categories must be supplied by the caller; it does no categorization
  itself.
- Petals are equal-angle: the diagram encodes amount by length, not by
  angular width.
- A category absent from both months is drawn as nothing, not as a
  zero-length stub.

## Licensing options

- **Component license**: use `spend-clarity.js` in your app, attribution
  required. $X per year.
- **White-label custom build**: full integration, custom colours, your
  branding. $Y per year.
- **Founding partner**: early access, pricing negotiation, co-marketing.
  Let's talk.

Contact via GitHub
