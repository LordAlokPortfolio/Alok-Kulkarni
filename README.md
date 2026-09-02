# A&N Ledger

**Never commit real statement data or your OpenAI API key.**
`an-ledger/.gitignore` covers `.env`, `amex-ledger.csv` (or whatever you
name your running file), and `data/`, and a pre-commit hook double-checks
that on every commit. This repository is public.

Everything for A&N Ledger — `index.html`, `rebuild.html`, and their
supporting files — lives in the `an-ledger/` folder. This README documents
only that folder; nothing here depends on or describes anything else in
the repository.

Two independent static HTML tools, sharing a visual language and nothing
else: no server, no build step, no npm install, no network calls except
the one explicit OpenAI request described below. Everything runs by
double-clicking the file in a browser.

## `an-ledger/index.html` — spending dashboard

Load a CSV of your transactions and see a monthly bar chart against an
editable spend ceiling, a month-by-category breakdown, and which month(s)
went over.

**Maintaining your running CSV:** keep one CSV file that you add to each
month — export new transactions from the Amex statement sheet, append them
to the end of the same file (don't create a new file each month), and sort
by date. By the end of the year it covers every month in one file. Load
that file into the tool each time; it re-reads the whole thing from
scratch.

**Required columns** (case-insensitive, matched by header name, not
position): `Date`, `Merchant`, `Amount`, `Category`. `Amount` is positive
for a charge, negative for a refund. `Category` is one of: Groceries,
Dining, Fuel, Transport, Utilities, Phone/Internet, Subscriptions,
Insurance, Medical, Household, Clothing, Travel, Entertainment,
Fees/Interest, Payment, Other, UNCLEAR. `Card` is optional — if it's
missing every row is treated as `Amex`. If a required column is missing,
the tool names it and refuses to load the file.

**Categorizing new rows:** when you append fresh transactions they won't
have a `Category` yet. The page shows how many and offers a "Categorize
rows" button. Only when you click it does it send the merchant name and
amount for just those rows to the OpenAI API (`gpt-4o-mini`) — nothing
else in the file, and rows that already have a category are never
touched. Enter your API key in the password field on the page; it's
stored only in this browser's `localStorage` and is never written to a
file. After categorizing, a verification summary and a "Download
categorized CSV" button let you save the result back over your source
file — keep a backup first.

**Opening it:** double-click `an-ledger/index.html`.

### Data integrity guardrails

This tool touches financial data, so it is deliberately strict:

- The file is parsed once, held in memory, and never re-read.
- Every row's `Amount` must be numeric and every row's `Date` must be
  valid before anything renders — the first bad row stops the load and
  names the row, the column, and the bad value.
- Categorizing never touches any column but `Category`, and never
  overwrites a row that already has one. If the API returns a different
  number of categories than were requested, or something outside the
  fixed category list, nothing is written silently — you get an error or
  a logged warning naming exactly what happened.
- Before a download is generated, every row is re-checked against a
  snapshot taken at load time: same row count, same columns, same amounts
  and dates, only `Category` cells allowed to differ. Any mismatch
  refuses the download rather than writing a corrupted file.
- The browser console logs the loaded file's byte count and SHA-256 hash
  on every load, as a reference if you ever need to prove what was read.

## `an-ledger/rebuild.html` — line of credit rebuild tracker

A standalone household tracker, unrelated to the dashboard beyond shared
styling. State is saved to this browser's `localStorage`. Open it the
same way.

## Enabling the commit-safety hook

```
git config core.hooksPath an-ledger/.githooks
```

This makes `an-ledger/.githooks/pre-commit` run on every commit, refusing
to commit any staged `.csv`, `.xlsx`, or `.env` file other than
`sample.csv`.

## `an-ledger/sample.csv`

Fake data for testing — several months, a refund, a Payment row, an
UNCLEAR row, and a few rows with a blank `Category` so you can try the
categorize button without touching real data.
