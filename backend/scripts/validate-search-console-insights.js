'use strict';

const assert = require('assert');
const { buildOpportunities, buildReading } = require('../services/searchConsoleInsights');

const queries = [
  { keys: ['notebook gamer'], clicks: 4, impressions: 420, ctr: 0.009, position: 6.2 },
  { keys: ['memoria ram ddr5'], clicks: 12, impressions: 180, ctr: 0.066, position: 7.4 },
  { keys: ['monitor 24 pulgadas'], clicks: 2, impressions: 90, ctr: 0.022, position: 14 },
  { keys: ['fuente 650w'], clicks: 0, impressions: 70, ctr: 0, position: 22 }
];

const pages = [
  { keys: ['https://www.zenn.com.py/producto/notebook-vieja'], clicks: 1, impressions: 80, ctr: 0.012, position: 24 }
];

const queryPages = [
  { keys: ['mouse inalambrico', 'https://www.zenn.com.py/producto/mouse-a'], clicks: 3, impressions: 60, ctr: 0.05, position: 8 },
  { keys: ['mouse inalambrico', 'https://www.zenn.com.py/producto/mouse-b'], clicks: 2, impressions: 40, ctr: 0.05, position: 11 }
];

const sitemaps = [
  { path: 'https://www.zenn.com.py/sitemap.xml', errors: 0, contents: [{ type: 'web', submitted: 1000, indexed: 120 }] }
];

const opportunities = buildOpportunities({ queries, pages, queryPages, sitemaps });
const kinds = opportunities.map((item) => item.kind);

assert.ok(kinds.includes('ctr'));
assert.ok(kinds.includes('top3'));
assert.ok(kinds.includes('page2'));
assert.ok(kinds.includes('zero_clicks'));
assert.ok(kinds.includes('cannibal'));
assert.ok(kinds.includes('weak_page'));
assert.ok(kinds.includes('indexacion'));
assert.strictEqual(opportunities[0].severity, 'alta');

const reading = buildReading({ clicks: 40, impressions: 6000, ctr: 0.006, position: 18 }, { clicks: 20, impressions: 4000 }, 28);
assert.ok(reading[0].includes('6.000') || reading[0].includes('6000'));
assert.ok(reading.some((line) => line.includes('millones')));

const empty = buildReading({ clicks: 0, impressions: 0, ctr: 0, position: 0 }, null, 28);
assert.strictEqual(empty.length, 1);

console.log('search-console-insights-ok', kinds.join(','));
