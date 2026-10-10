import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../src/features/catalog/products';
import { defaultProfile, fitFor, recommend } from '../src/features/fit/fit';

test('recommended size remains M when a user chooses oversized XL', () => {
  const product = products[0];
  const recommendation = recommend(product, defaultProfile);
  const chosen = fitFor(product, defaultProfile, 'XL');
  assert.equal(recommendation.size, 'M');
  assert.equal(chosen.size, 'XL');
  assert.equal(chosen.ease, 26);
  assert.equal(chosen.label, '明显宽大');
  assert.ok(chosen.score < recommendation.score);
});

test('changing body measurements recalculates size recommendation', () => {
  assert.equal(recommend(products[0], { ...defaultProfile, chest: 104 }).size, 'XL');
});
