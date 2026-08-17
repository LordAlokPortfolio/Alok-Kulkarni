# Universal Forecasting Tool

Reads a cycle count export, works out how fast each item is actually being
consumed, classifies items by how much they move, forecasts forward, and then
measures how wrong its own forecast has been.

It runs in a browser with no install and no server. Open `index.html`, load a
CSV, and everything happens on the page.

## What it does that is worth looking at

**Usage is per working day, not per calendar day.** Two counts eleven days
apart with a weekend and a statutory holiday between them span six working
days, not eleven. Dividing by calendar days understates consumption on exactly
the items that matter and the error grows over long gaps. Ontario statutory
holidays are built in.

**It measures its own error.** After forecasting, it computes MAPE against the
history it already has, so the tool tells you how much to trust it rather than
presenting one number with no error bar.

**It separates items that do not move from items that barely move.** Something
consumed in one interval out of fifteen needs a different stocking decision
from something consumed steadily, and both need a different decision from
something that has not moved at all.

**A rise in stock is read as a replenishment, not negative usage.** The input is
stock on hand at each count, so consumption is the drop between counts. A rise
means material arrived, and counting it as usage would corrupt the rate.

## Try it

Open `index.html` and load `sample-cycle-count-data.csv`.

That file is invented end to end: made-up vendors, SKUs, descriptions and
quantities, shaped so that regular movers, slow movers and dead stock all
appear. Its date headers deliberately mix `09/08/2025` and `09-15-2025` in one
row, because real exports do, and that used to break the tool.

## Input format

One row per item. One column per count date. The value in a cell is the stock
on hand at that count.

| SKU | Description | Vendor | Material Type | 09/08/2025 | 09-15-2025 | ... |
|-----|-------------|--------|---------------|-----------|-----------|-----|

The first column is the item key. Any column whose header is a date becomes a
count. Accepted date headers: `09/08/2025`, `09-15-2025`, `2025-09-08`,
`8-Sep`, and Excel serial numbers. Mixed formats in one header row are fine.

## Three defects found reviewing this, and what was done

**The parser silently discarded about 40% of every export.** It accepted
numeric dates written with slashes but not with hyphens, and these exports mix
both within a single header row. On the real files that was 53 of 128 count
columns in one and 18 of 48 in the other, dropped with no warning, while the
tool still produced confident usage rates and forecasts from what survived. A
tool that fails is obvious; one that quietly uses 59% of the history is not.
Fixed: both separators are accepted, and the date is built from the matched
parts rather than handed to `new Date()`, which was also shifting dates by a
day depending on the machine's timezone. Measured on the sample file, the old
parser produced 7 intervals per item and the fixed one produces 14.

**A supplier name was hardcoded in the shipped file and not in the source.**
`inferCategory` labelled anything described as paint or coating with a specific
vendor's name. It existed only in `main.js`, which is what the page loads, so
reading `main.ts` showed nothing. The label is now generic. The function was
also declared twice, so one copy had never run; the dead copy is gone.

**`main.ts` is an unfinished rewrite that this page cannot run.** It is not a
drifted copy of `main.js`, it is a different program: it needs 17 element ids
that `index.html` does not contain, and ignores 20 that it does. Loading it
renders nothing and reports no error, because even the error box it writes to
does not exist. It is kept here because the working-day and MAPE logic in it is
a cleaner expression of the same ideas, and it is honest about being
unfinished. `tsconfig.json` therefore compiles it to `main.rewrite.js`, never
over `main.js`.

## Not included

The original repository committed real data beside the code: purchase history
with supplier names, part numbers and unit costs, cycle count exports, an Excel
lock file and a backup folder. None of it is here, and `.gitignore` blocks that
class of file so it cannot be committed by reflex again.

## Files

```
index.html                     the page, loads main.js
main.js                        the working program
main.ts                        unfinished rewrite, does not run
tsconfig.json                  compiles main.ts to main.rewrite.js
sample-cycle-count-data.csv    invented data, exercises every classification
```

External libraries (PapaParse, jsPDF) load from a CDN, so first use needs a
network connection.
