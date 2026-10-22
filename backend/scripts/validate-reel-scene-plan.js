'use strict';

const assert = require('assert');
const { buildPlan, validatePlan } = require('../services/reelScenePlan');

const product = {
  _id: '507f1f77bcf86cd799439011',
  codigo: 'TEST01',
  productName: 'Mouse de prueba Zenn',
  brandName: 'Zenn',
  category: 'Periféricos',
  subcategory: 'Mouse',
  stock: 3,
  sellingPrice: 150000,
  productImage: [
    'https://cdn.zenn.com.py/products/a.webp',
    'https://cdn.zenn.com.py/products/b.webp'
  ],
  technicalSpecifications: { conexion: 'Wireless' }
};

const plan = buildPlan(product);
assert.strictEqual(plan.scenes.length, 4);
assert.strictEqual(plan.render.targetDurationSeconds, 20);
assert.strictEqual(plan.scenes[0].purpose, 'hook');
assert.strictEqual(plan.scenes[3].purpose, 'close');
assert.ok(plan.editorial.hook.includes('Attack Shark') || plan.editorial.hook.includes('Zenn'));
assert.ok(validatePlan(plan).ok);

const bad = JSON.parse(JSON.stringify(plan));
bad.scenes[0].ffmpeg = '-vf hflip';
assert.strictEqual(validatePlan(bad).ok, false);

const short = JSON.parse(JSON.stringify(plan));
short.scenes = short.scenes.slice(0, 1);
assert.strictEqual(validatePlan(short).ok, false);

console.log('reel-scene-plan-ok', plan.scenes.map((scene) => scene.motion.type).join(','));
