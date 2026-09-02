# A&N Ledger

**Never commit real statement files.** Anything matching `*.csv`, `*.xlsx`,
`*.xls`, `.env`, or `*.key` is gitignored (except `sample.csv`), and a
pre-commit hook double-checks that. This repository is public.

Two independent static HTML tools. No server, no build step, no npm
install, no API keys in source, no network calls except the one explicit
OpenAI request described below. Everything runs by double-clicking the
file in a browser.

## `index.html` — spending dashboard

Load a CSV exported from the Amex statement sheet and see a monthly bar
chart against an editable spend ceiling, a month-by-category breakdown,
and which month(s) went over.

**Exporting the CSV:** export the statement sheet to CSV with a header row
containing (case-insensitive) `Date`, `Merchant`, `Amount`, `Category`,
and optionally `Card`. `Amount` is positive for a charge, negative for a
refund. `Category` should already be filled in with one of: Groceries,
Dining, Fuel, Transport, Utilities, Phone/Internet, Subscriptions,
Insurance, Medical, Household, Clothing, Travel, Entertainment,
Fees/Interest, Payment, Other, UNCLEAR.

**Categorizing new rows:** if some rows have a blank `Category`, the page
shows how many and offers a "Categorize rows" button. Only when you click
it does it send just the merchant name and amount for those rows to the
OpenAI API (`gpt-4o-mini`). Nothing else in the file is sent, and rows
that already have a category are never touched. The API key is entered in
a password field and stored only in this browser's `localStorage` — it is
never written to any file. After categorizing you can download the
updated CSV to save back over your source file.

**Opening it:** double-click `index.html`.

## `rebuild.html` — line of credit rebuild tracker

A standalone household tracker, unrelated to the dashboard beyond shared
styling. State is saved to this browser's `localStorage`. Open it the
same way.

## Enabling the commit-safety hook

```
git config core.hooksPath .githooks
```

This makes `.githooks/pre-commit` run on every commit in this repo,
refusing to commit any staged `.csv`, `.xlsx`, or `.env` file other than
`sample.csv`.

## `sample.csv`

Fake data for testing — several months, a refund, a Payment row, an
UNCLEAR row, and one row with a blank Category so you can try the
categorize button without touching real data.
