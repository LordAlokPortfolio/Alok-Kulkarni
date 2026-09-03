/*!
 * Spend Clarity — spending variance as a rose diagram
 *
 * A single pure function. Give it transactions, get back an SVG string.
 * It touches no DOM, makes no network calls, reads no files, and has no
 * dependencies. The caller owns the page and decides what to do with the
 * string it gets back.
 *
 *   var svg = SpendClarity.renderRoseDiagram({ ... });
 *   document.getElementById('chart').innerHTML = svg;
 *
 * Interactivity is the caller's job too: every petal carries a
 * data-category attribute, so a delegated click listener is all that is
 * needed to drill down. See "WIRING UP CLICKS" at the bottom of this file.
 *
 * ---------------------------------------------------------------------
 * FOR INTEGRATORS: the three things you are most likely to want to change
 * are marked with "TUNE:" comments —
 *   1. VARIANCE_THRESHOLDS — what counts as over/under/normal
 *   2. PALETTES            — the colours, including your own brand scheme
 *   3. radiusFor()         — how amount maps to petal length
 * ---------------------------------------------------------------------
 */

(function (global) {
  'use strict';

  /**
   * TUNE 1: Variance thresholds.
   *
   * variance = (targetAmount - baselineAmount) / baselineAmount
   *
   *   variance >  0.20  → "over"   (red)    spending grew 20%+ over baseline
   *   variance < -0.05  → "under"  (green)  spending fell more than 5%
   *   otherwise         → "normal" (gray)   effectively flat
   *
   * These are deliberately asymmetric: a 20% overshoot is worth flagging,
   * but a 6% saving is already worth crediting. Tighten `over` to 0.10 for
   * a more sensitive anomaly detector, or loosen to 0.35 for noisy data
   * like variable-income households.
   */
  var VARIANCE_THRESHOLDS = {
    over: 0.20,
    under: -0.05
  };

  /**
   * TUNE 2: Colour schemes.
   *
   * `baseline` is the reference ring drawn underneath; `over`/`under`/
   * `normal` colour the target ring by variance. To brand this, add a
   * scheme here and pass its name as options.colorScheme.
   *
   * Colour is never the only carrier of meaning: each petal is also
   * labelled with its category, amount, and variance percentage, so the
   * diagram still reads correctly in greyscale or for a colourblind
   * viewer.
   */
  var PALETTES = {
    'default': {
      baseline: '#C7D0CC',
      over: '#d03b3b',
      under: '#0ca30c',
      normal: '#8b949a',
      text: '#16232E',
      subtext: '#5E6D6A',
      surface: 'none'
    },
    // Higher-contrast steps for small displays and print.
    accessible: {
      baseline: '#adb5b1',
      over: '#b3141f',
      under: '#00701f',
      normal: '#5c6469',
      text: '#000000',
      subtext: '#333333',
      surface: 'none'
    },
    dark: {
      baseline: '#3a4450',
      over: '#e66767',
      under: '#3fbf5f',
      normal: '#8c959d',
      text: '#ffffff',
      subtext: '#c3c2b7',
      surface: 'none'
    }
  };

  /**
   * Sums transactions per category for one YYYY-MM month.
   * Transactions whose date does not start with that month are ignored.
   */
  function sumByCategory(transactions, month, categories) {
    var sums = {};
    categories.forEach(function (c) { sums[c] = 0; });
    transactions.forEach(function (t) {
      if (!t || typeof t.date !== 'string') return;
      if (t.date.slice(0, 7) !== month) return;
      if (!(t.category in sums)) return; // category not in the requested list
      var amount = Number(t.amount);
      if (isNaN(amount)) return;
      sums[t.category] += amount;
    });
    return sums;
  }

  /**
   * Classifies one category's change from baseline to target.
   *
   * Special case: a baseline of zero has no defined percentage change
   * (dividing by zero). Spending that appears where there was none before
   * is treated as "over" — it is new spending, which is exactly the kind
   * of thing this diagram exists to surface — and zero-to-zero is normal.
   */
  function classify(baselineAmount, targetAmount) {
    if (baselineAmount === 0) {
      return targetAmount > 0 ? 'over' : 'normal';
    }
    var variance = (targetAmount - baselineAmount) / baselineAmount;
    if (variance > VARIANCE_THRESHOLDS.over) return 'over';
    if (variance < VARIANCE_THRESHOLDS.under) return 'under';
    return 'normal';
  }

  function variancePercent(baselineAmount, targetAmount) {
    if (baselineAmount === 0) return targetAmount > 0 ? null : 0;
    return ((targetAmount - baselineAmount) / baselineAmount) * 100;
  }

  function money(n) {
    var sign = n < 0 ? '-' : '';
    return sign + '$' + Math.abs(Math.round(n)).toLocaleString('en-CA');
  }

  function escapeText(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** "2026-03" → "Mar 2026" */
  function monthLabel(month) {
    var parts = String(month).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    if (isNaN(d.getTime())) return String(month);
    return d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
  }

  /**
   * Builds one petal: an annular sector (a wedge from the centre out to
   * `radius`, spanning `startAngle` to `endAngle`, angles in radians and
   * measured clockwise from 12 o'clock).
   */
  function petalPath(cx, cy, radius, startAngle, endAngle) {
    if (radius <= 0) return '';
    var x1 = cx + radius * Math.sin(startAngle);
    var y1 = cy - radius * Math.cos(startAngle);
    var x2 = cx + radius * Math.sin(endAngle);
    var y2 = cy - radius * Math.cos(endAngle);
    var largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
    return 'M ' + cx + ' ' + cy +
           ' L ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
           ' A ' + radius.toFixed(2) + ' ' + radius.toFixed(2) + ' 0 ' + largeArc + ' 1 ' +
           x2.toFixed(2) + ' ' + y2.toFixed(2) + ' Z';
  }

  /**
   * renderRoseDiagram(options) → SVG string
   *
   * options:
   *   transactions   [{date:"2026-03-15", category:"Groceries", amount:120}, ...]
   *   categories     ["Groceries", "Dining", ...]  — fixed order, one petal each
   *   baselineMonth  "2026-02"  — the month compared against
   *   targetMonth    "2026-03"  — the month being visualized
   *   width          SVG viewport width  (default 400)
   *   height         SVG viewport height (default 400)
   *   colorScheme    "default" | "accessible" | "dark"
   */
  function renderRoseDiagram(options) {
    options = options || {};
    var transactions = options.transactions || [];
    var categories = options.categories || [];
    var baselineMonth = options.baselineMonth;
    var targetMonth = options.targetMonth;
    var width = options.width || 400;
    var height = options.height || 400;
    var palette = PALETTES[options.colorScheme] || PALETTES['default'];

    if (!categories.length || !baselineMonth || !targetMonth) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"></svg>';
    }

    var baselineSums = sumByCategory(transactions, baselineMonth, categories);
    var targetSums = sumByCategory(transactions, targetMonth, categories);

    var cx = width / 2;
    var cy = height / 2;
    // Leave room around the circle for the petal labels.
    var maxRadius = Math.min(width, height) / 2 - 62;
    if (maxRadius < 20) maxRadius = Math.min(width, height) / 2 - 10;

    /**
     * TUNE 3: Amount → petal length.
     *
     * Radius is proportional to the SQUARE ROOT of the amount, because a
     * petal's visual weight is its AREA, and area grows with the square of
     * the radius. Scaling radius linearly would make a category that spent
     * twice as much look four times as large — a real and well-documented
     * way to mislead people about their own money. Do not "simplify" this
     * to a linear scale.
     */
    var largest = 0;
    categories.forEach(function (c) {
      largest = Math.max(largest, baselineSums[c] || 0, targetSums[c] || 0);
    });
    function radiusFor(amount) {
      if (largest <= 0 || amount <= 0) return 0;
      return maxRadius * Math.sqrt(amount / largest);
    }

    var sliceAngle = (Math.PI * 2) / categories.length;
    var svg = '';
    svg += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" ' +
           'width="' + width + '" height="' + height + '" ' +
           'role="img" aria-label="Spending by category, ' + escapeText(monthLabel(targetMonth)) +
           ' compared with ' + escapeText(monthLabel(baselineMonth)) + '" ' +
           'font-family="ui-sans-serif, -apple-system, Segoe UI, Helvetica, Arial, sans-serif">';

    // Baseline ring first, underneath: a neutral petal per category showing
    // where spending was. The target petal is drawn over it, so a shorter
    // target leaves baseline visible (spent less) and a longer one overhangs.
    categories.forEach(function (category, i) {
      var start = i * sliceAngle;
      var end = start + sliceAngle * 0.92; // small gap so petals read separately
      var path = petalPath(cx, cy, radiusFor(baselineSums[category] || 0), start, end);
      if (!path) return;
      svg += '<path d="' + path + '" fill="' + palette.baseline + '" fill-opacity="0.55" ' +
             'stroke="' + palette.baseline + '" stroke-width="0.5"/>';
    });

    // Target ring, coloured by variance, carrying the data-category hook.
    categories.forEach(function (category, i) {
      var baselineAmount = baselineSums[category] || 0;
      var targetAmount = targetSums[category] || 0;
      var state = classify(baselineAmount, targetAmount);
      var start = i * sliceAngle;
      var end = start + sliceAngle * 0.92;
      var radius = radiusFor(targetAmount);
      var path = petalPath(cx, cy, radius, start, end);
      var pct = variancePercent(baselineAmount, targetAmount);
      var pctText = pct === null ? 'new' : (pct > 0 ? '+' : '') + Math.round(pct) + '%';

      if (path) {
        svg += '<path d="' + path + '" fill="' + palette[state] + '" fill-opacity="0.75" ' +
               'stroke="' + palette[state] + '" stroke-width="1" ' +
               'data-category="' + escapeText(category) + '" ' +
               'data-state="' + state + '" ' +
               'data-baseline="' + baselineAmount.toFixed(2) + '" ' +
               'data-target="' + targetAmount.toFixed(2) + '" ' +
               'style="cursor:pointer">' +
               '<title>' + escapeText(category) + ': ' + money(targetAmount) +
               ' vs ' + money(baselineAmount) + ' (' + pctText + ')</title></path>';
      }

      // Label just outside the circle, at the petal's mid-angle. Text
      // carries category, amount and variance, so meaning never rests on
      // colour alone.
      if (baselineAmount === 0 && targetAmount === 0) return;
      var mid = start + (sliceAngle * 0.92) / 2;
      var labelR = maxRadius + 12;
      var lx = cx + labelR * Math.sin(mid);
      var ly = cy - labelR * Math.cos(mid);
      var anchor = Math.sin(mid) > 0.15 ? 'start' : (Math.sin(mid) < -0.15 ? 'end' : 'middle');
      svg += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" font-size="10" ' +
             'fill="' + palette.text + '" text-anchor="' + anchor + '">' + escapeText(category) + '</text>';
      svg += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 11).toFixed(1) + '" font-size="9" ' +
             'fill="' + palette.subtext + '" text-anchor="' + anchor + '">' +
             money(targetAmount) + ' · ' + pctText + '</text>';
    });

    // Centre: the one-line summary — overall change, then the single
    // category that moved the most in absolute dollars.
    var baselineTotal = 0, targetTotal = 0;
    categories.forEach(function (c) {
      baselineTotal += baselineSums[c] || 0;
      targetTotal += targetSums[c] || 0;
    });
    var overallDelta = targetTotal - baselineTotal;
    var biggestMover = null, biggestMove = 0;
    categories.forEach(function (c) {
      var delta = (targetSums[c] || 0) - (baselineSums[c] || 0);
      if (Math.abs(delta) > Math.abs(biggestMove)) { biggestMove = delta; biggestMover = c; }
    });

    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="34" fill="#ffffff" fill-opacity="0.86"/>';
    svg += '<text x="' + cx + '" y="' + (cy - 6) + '" font-size="10" font-weight="600" ' +
           'fill="' + palette.text + '" text-anchor="middle">' +
           escapeText(monthLabel(targetMonth).split(' ')[0]) + ' vs ' +
           escapeText(monthLabel(baselineMonth).split(' ')[0]) + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 7) + '" font-size="10" ' +
           'fill="' + (overallDelta > 0 ? palette.over : palette.under) + '" text-anchor="middle">' +
           (overallDelta > 0 ? '+' : '') + money(overallDelta) + '</text>';
    if (biggestMover) {
      svg += '<text x="' + cx + '" y="' + (cy + 19) + '" font-size="8" ' +
             'fill="' + palette.subtext + '" text-anchor="middle">' +
             escapeText(biggestMover) + ' ' + (biggestMove > 0 ? '+' : '') + money(biggestMove) + '</text>';
    }

    svg += '</svg>';
    return svg;
  }

  /*
   * WIRING UP CLICKS
   *
   * This function returns a string, so it cannot attach handlers itself.
   * Every target petal carries data-category (plus data-state,
   * data-baseline and data-target), so one delegated listener on your own
   * container handles every petal, and keeps working after a re-render:
   *
   *   container.innerHTML = SpendClarity.renderRoseDiagram(opts);
   *   container.addEventListener('click', function (e) {
   *     var petal = e.target.closest('[data-category]');
   *     if (!petal) return;
   *     showDrilldown(petal.getAttribute('data-category'));
   *   });
   */

  var api = {
    renderRoseDiagram: renderRoseDiagram,
    // Exposed so integrators can read or override the tuning constants
    // without editing this file.
    VARIANCE_THRESHOLDS: VARIANCE_THRESHOLDS,
    PALETTES: PALETTES
  };

  global.SpendClarity = api;
  // Convenience global, so a plain <script> tag user can call it directly.
  global.renderRoseDiagram = renderRoseDiagram;

  // Also usable as a CommonJS/ES module if the host app has a bundler.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : this);
