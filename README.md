# Alok Kulkarni

Portfolio. Manufacturing supply chain automation.

**Live: https://lordalokportfolio.github.io/Alok-Kulkarni/**

The site is one static HTML file with the styles inline. No build step, no
dependencies, no external requests, so it loads instantly and there is nothing
to break.

To publish or republish: Settings > Pages > Deploy from a branch > `main` >
`/ (root)`.

## What is in here

```
index.html    the whole site
.nojekyll     stops Pages running the file through Jekyll
```

Nothing else on `main`, deliberately. Project code lives in its own repository
so that opening this one shows the portfolio and not a pile of unrelated work.

## Branches

`universal-forecasting-tool` holds a publishable rebuild of a consumption
forecasting tool. The original repository cannot be made public: it committed
real purchase history beside the code, including supplier names, part numbers
and unit costs. The branch carries the code, invented sample data, and a README
documenting the three defects found while reviewing it, the worst being a date
parser that silently discarded about 40% of every export while still reporting
confident forecasts.

It is on a branch rather than `main` because it has not been decided whether it
becomes its own public repository or is merged in here.

## Linked from the site

- [inventory-database](https://github.com/LordAlokPortfolio/inventory-database)
  purchase order and inventory automation for Excel, with a browser preview,
  importable scripts and a test suite
- [report-tools](https://github.com/LordAlokPortfolio/report-tools)
  three single-purpose browser tools that run entirely on the machine that
  opens them

## Editing it

Every claim on the page is marked as measured, unmeasured or unfinished, and
that is the point of it rather than a stylistic tic. If you change something
here, keep that: a page that says "no baseline was captured" is trusted on
everything else it says, and one unsourced number undoes that for the whole
document.

No company data belongs in this repository. No internal sheet names, table
names, SharePoint links, supplier names or part numbers, in the site or in any
branch.
