# A&N Ledger

**Real statement data and OpenAI API keys must never be committed.**
`an-ledger/.gitignore` covers `.env`, `amex-ledger.csv` (or whatever the
running file is named), and `data/`, and a pre-commit hook double-checks
that on every commit. This repository is public.

Everything for A&N Ledger — `index.html`, `rebuild.html`, and their
supporting files — lives in the `an-ledger/` folder. This README documents
only that folder; nothing here depends on or describes anything else in
the repository.

Two independent static HTML tools, sharing a visual language and nothing
else: no server, no build step, no npm install, no network calls except
the one explicit OpenAI request described below. Both run by
double-clicking the file in a browser — no account, no install.

## Getting started from a real Amex export

Amex's own CSV export does **not** already match what the dashboard
expects — it needs a small one-time fix before the first load:

1. Download the repository (or just the `an-ledger/` folder) and open
   `an-ledger/index.html` by double-clicking it.
2. Export transactions from the Amex site as CSV.
3. Open that CSV in a spreadsheet and rename its columns to exactly
   `Date`, `Merchant`, `Amount`, `Category` (Amex typically calls these
   something like Date, Description, Amount — the names have to match,
   the tool reads by header name). Add a `Card` column too if more than
   one card's transactions are being tracked together; otherwise skip it.
4. Add a `Category` column if there isn't one. It can be left **entirely
   blank** — the dashboard will still load the file, and the "Categorize
   rows" button will offer to fill every blank row in one pass using
   OpenAI's API (a personal API key is required, and each categorize
   call costs a small, per-request amount on that account). Categories
   can also just be typed in by hand instead, using one of: Groceries,
   Dining, Fuel, Transport, Utilities, Phone/Internet, Subscriptions,
   Insurance, Medical, Household, Clothing, Travel, Entertainment,
   Fees/Interest, Payment, Other, UNCLEAR — no OpenAI key needed if so.
5. Save that CSV and load it into `index.html` via the file picker.

From then on, the same file is reused: new transactions get appended to
the bottom each month (not a new file each time) and reloaded.

## `an-ledger/index.html` — spending dashboard

Loads a CSV of transactions and shows a monthly bar chart against an
editable spend ceiling, a month-by-category breakdown, and which month(s)
went over.

See "Getting started from a real Amex export" above for the one-time
setup. After that, it's one running CSV file: new transactions get
appended to the end (not a new file each month) and sorted by date, and
that same file is reloaded into the tool each time — the tool re-reads
the whole thing from scratch, it doesn't remember anything between loads.

**Required columns** (case-insensitive, matched by header name, not
position): `Date`, `Merchant`, `Amount`, `Category`. `Amount` is positive
for a charge, negative for a refund. `Category` is one of: Groceries,
Dining, Fuel, Transport, Utilities, Phone/Internet, Subscriptions,
Insurance, Medical, Household, Clothing, Travel, Entertainment,
Fees/Interest, Payment, Other, UNCLEAR. `Card` is optional — if it's
missing every row is treated as `Amex`. If a required column is missing,
the tool names it and refuses to load the file.

**Categorizing new rows:** newly appended transactions won't have a
`Category` yet. The page shows how many and offers a "Categorize rows"
button. Only on click does it send the merchant name and amount for just
those rows to the OpenAI API (`gpt-4o-mini`) — nothing else in the file,
and rows that already have a category are never touched. The OpenAI API
key is entered in a password field on the page; it's stored only in that
browser's `localStorage` and is never written to a file. After
categorizing, a verification summary and a "Download categorized CSV"
button allow saving the result back over the source file — a backup
should be kept first.

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
  fixed category list, nothing is written silently — an error or a
  logged warning names exactly what happened.
- Before a download is generated, every row is re-checked against a
  snapshot taken at load time: same row count, same columns, same amounts
  and dates, only `Category` cells allowed to differ. Any mismatch
  refuses the download rather than writing a corrupted file.
- The browser console logs the loaded file's byte count and SHA-256 hash
  on every load, as a reference if the read ever needs to be proven.

## `an-ledger/rebuild.html` — line of credit rebuild tracker

A standalone household tracker, unrelated to the dashboard beyond shared
styling. State is saved to that browser's `localStorage`. Opened the same
way.

## Enabling the commit-safety hook

```
git config core.hooksPath an-ledger/.githooks
```

This makes `an-ledger/.githooks/pre-commit` run on every commit, refusing
to commit any staged `.csv`, `.xlsx`, or `.env` file other than
`sample.csv`.

## `an-ledger/sample.csv`

Fake data for testing — several months, a refund, a Payment row, an
UNCLEAR row, and a few rows with a blank `Category` so the categorize
button can be tried without touching real data.
