'use strict';

const assert = require('assert');
const { acceptSlug } = require('../services/seoDailyReview');

const current = 'notebook-hp-15-fc0235dx-amd-ryzen-7-7730u-pantalla-touch-full-hd-156-16gb-de-ram-512gb-ssd';
assert.strictEqual(acceptSlug(current, 'notebook-hp-15-fc0235dx-ryzen-7'), 'notebook-hp-15-fc0235dx-ryzen-7');
assert.strictEqual(acceptSlug(current, 'Notebook HP'), '');
assert.strictEqual(acceptSlug(current, current), '');
assert.strictEqual(acceptSlug(current, 'hp'), '');
assert.strictEqual(
  acceptSlug(current, 'notebook-hp-15-fc0235dx-amd-ryzen-7-7730u-pantalla-touch-full-hd-156-16gb'),
  ''
);

console.log('seo-daily-ok');
