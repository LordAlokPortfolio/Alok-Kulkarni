# A&N Ledger

**Real statement data and OpenAI API keys must never be committed.**
`an-ledger/.gitignore` covers `.env`, `amex-ledger.csv` (or whatever the
running file is named), and `data/`, and a pre-commit hook double-checks
that on every commit. This repository is public.

Everything for A&N Ledger (`index.html`, `rebuild.html`, and their
supporting files) lives in the `an-ledger/` folder. This README documents
only that folder; nothing here depends on or describes anything else in
the repository.

Two independent static HTML tools, sharing a visual language and nothing
else. No server, no build step, no npm install, no network calls except
the one explicit OpenAI request described below. Both run by
double-clicking the file in a browser: no account, no install.

## What the dashboard gives you

- Whether a given month went over a spending ceiling, and by how much.
- For the worst over-ceiling month, its top 3 categories by amount, so
  the cause is visible without reading the whole table.
- A full month-by-category breakdown with row and column totals.
- Correct handling of refunds (they reduce the total, a month can go
  negative) and card payments (excluded from spend entirely, so paying
  the bill is never counted as spending).
- A warning when a month's `UNCLEAR` category is over 10% of its total,
  so bad categorization doesn't quietly distort the numbers.
- Optional AI-assisted categorizing for new, blank-category rows.
- A per-`Card` filter, if more than one card is tracked in the same file.

**What it does not give you:** it cannot split spending by person, only
by `Card`. If two people share one physical card, there is no way to see
who spent what; it only answers "did we go over, and on what," not "who
spent it." It also does no forecasting, no recurring-charge detection,
and no year-over-year comparison. It shows exactly what's in the CSV and
nothing more.

## Getting started from a real Amex export

A raw Amex export, `.csv` or `.xlsx`, can be loaded directly. No manual
cleanup is required:

1. Download the repository (or just the `an-ledger/` folder) and open
   `an-ledger/index.html` by double-clicking it.
2. Export transactions from the Amex site, as CSV or Excel.
3. Load that file into `index.html` via the file picker as-is.

The dashboard handles the rest of the raw export on its own:

- Some Amex exports put a few metadata rows (account holder, card name,
  statement period) above the real table. The dashboard scans the first
  30 rows for the one that actually contains `Date`, `Merchant`, and
  `Amount` and treats everything above it as ignorable.
- Extra columns the export includes (`Description`, `Address`, `City /
  Province`, `Postal Code`, `Country`, `Reference`, and similar) are
  matched by header name and just ignored; nothing needs deleting.
- If there's no `Category` column at all, one is added automatically,
  blank, exactly as if every row already had an empty `Category` cell.
  From there, either use "Categorize rows" to fill it via OpenAI, or type
  categories in by hand after downloading: one of Groceries, Dining,
  Fuel, Transport, Utilities, Phone/Internet, Subscriptions, Insurance,
  Medical, Household, Clothing, Travel, Entertainment, Fees/Interest,
  Payment, Other, UNCLEAR.
- A `Card` column is optional; add one only if more than one card's
  transactions are tracked together in the same file.

From then on, the same file is reused: new transactions get appended to
the bottom each month, not a new file each time, and reloaded.

## `an-ledger/index.html`: spending dashboard

Loads a `.csv` or `.xlsx` of transactions and shows a monthly bar chart
against an editable spend ceiling, a month-by-category breakdown, and
which month(s) went over.

See "Getting started from a real Amex export" above for what happens to
a raw export on load: metadata rows above the real table are skipped, a
missing `Category` column is added blank, and extra columns are ignored.
After that, it's one running file: new transactions get appended to the
end, not a new file each month, and sorted by date, and that same file
is reloaded into the tool each time. The tool re-reads the whole thing
from scratch; it doesn't remember anything between loads.

**Required columns**, once the real header row is found (case-insensitive,
matched by header name, not position): `Date`, `Merchant`, `Amount`.
`Amount` is positive for a charge, negative for a refund. `Category` is
added automatically if missing, and is one of: Groceries, Dining, Fuel,
Transport, Utilities, Phone/Internet, Subscriptions, Insurance, Medical,
Household, Clothing, Travel, Entertainment, Fees/Interest, Payment,
Other, UNCLEAR. `Card` is optional; if it's missing every row is treated
as `Amex`. If `Date`, `Merchant`, or `Amount` can't be found in any of
the first 30 rows, the tool says so and refuses to load the file.

**Categorizing new rows:** newly appended transactions won't have a
`Category` yet. The page shows how many and offers a "Categorize rows"
button. Only on click does it send the merchant name and amount for just
those rows to the OpenAI API (`gpt-4o-mini`), nothing else in the file,
and rows that already have a category are never touched. The OpenAI API
key is entered in a password field on the page; it's stored only in that
browser's `localStorage` and is never written to a file. After
categorizing, a verification summary and a "Download categorized CSV"
button allow saving the result back over the source file. Keep a backup
first.

**Opening it:** double-click `an-ledger/index.html`.

### Data integrity guardrails

This tool touches financial data, so it checks itself at every step:

- The file is parsed once, held in memory, and never re-read. `.xlsx`
  files are parsed entirely in the browser using a vendored copy of
  [SheetJS](https://sheetjs.com) (`an-ledger/vendor/xlsx.full.min.js`,
  MIT licensed, loaded locally, no network request); no file content
  goes anywhere but through that local parser.
- Every row's `Amount` must be numeric and every row's `Date` must be
  valid before anything renders. The first bad row stops the load and
  names the row, the column, and the bad value.
- Categorizing never touches any column but `Category`, and never
  overwrites a row that already has one. If the API returns a different
  number of categories than were requested, or something outside the
  fixed category list, nothing is written silently: an error or a logged
  warning names exactly what happened.
- Before a download is generated, every row is re-checked against a
  snapshot taken at load time: same row count, same columns, same amounts
  and dates, only `Category` cells allowed to differ. Any mismatch
  refuses the download rather than writing a corrupted file.
- The browser console logs the loaded file's byte count and SHA-256 hash
  on every load, as a reference if the read ever needs to be proven.

## `an-ledger/rebuild.html`: line of credit rebuild tracker

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

Fake data for testing: several months, a refund, a Payment row, an
UNCLEAR row, and a few rows with a blank `Category` so the categorize
button can be tried without touching real data.
