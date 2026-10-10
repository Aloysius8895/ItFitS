import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../src/features/catalog/products';
import { assessAll, cannotWear, defaultProfile, fitFor, ratingToClass, recommend } from '../src/features/fit/fit';

test('recommended size remains M when a user chooses oversized XL', () => {
  const product = products[0];
  const recommendation = recommend(product, defaultProfile);
  const chosen = fitFor(product, defaultProfile, 'XL');
  assert.equal(recommendation.size, 'M');
  assert.equal(recommendation.level, 'relaxed');
  assert.equal(chosen.size, 'XL');
  assert.equal(chosen.ease_cm, 26);
  assert.equal(chosen.level, 'oversize');
  assert.equal(chosen.zones[0].word, 'LOOSE');
  assert.ok(chosen.score < recommendation.score);
});

test('changing body measurements recalculates size recommendation', () => {
  assert.equal(recommend(products[0], { ...defaultProfile, chest: 104 }).size, 'XL');
  assert.equal(fitFor(products[0], { ...defaultProfile, chest: 104 }, 'XS').level, 'too_tight');
});

test('fit preference moves the recommendation', () => {
  assert.equal(recommend(products[0], { ...defaultProfile, preference: 'fitted' }).size, 'S');
  assert.equal(recommend(products[0], { ...defaultProfile, preference: 'oversize' }).size, 'XL');
});

test('custom size charts use every measurement they include', () => {
  const custom = { ...products[0], id: 'custom', category: 'PANTS', sizes: ['28', '30', '32'], chart: { 28: { chest: 90, waist: 72, hip: 94 }, 30: { chest: 94, waist: 78, hip: 100 }, 32: { chest: 98, waist: 84, hip: 106 } } };
  const { results } = assessAll(custom, defaultProfile);
  assert.deepEqual(results.map(result => result.zones.map(zone => zone.name)), [['CHEST', 'WAIST', 'HIP'], ['CHEST', 'WAIST', 'HIP'], ['CHEST', 'WAIST', 'HIP']]);
  assert.equal(results[0].level, 'too_tight');
});

test('review ratings map to small / fit / large', () => {
  assert.deepEqual([1, 3, 4, 5, 6, 7, 9].map(ratingToClass), ['small', 'small', 'fit', 'fit', 'fit', 'large', 'large']);
});

test('height/weight range charts from ruler/ recommend the size whose ranges fit', () => {
  const kg = (jin: number) => jin / 2;
  const rows: [string, number, number, number, number][] = [['S', 150, 160, 85, 95], ['M', 155, 168, 90, 110], ['L', 165, 175, 105, 125], ['XL', 170, 178, 115, 135], ['2XL', 172, 180, 130, 155], ['3XL', 180, 190, 150, 170]];
  const chart = { ...products[0], id: 'ruler:test', sizes: rows.map(row => row[0]), chart: Object.fromEntries(rows.map(([size, hMin, hMax, wMin, wMax]) => [size, { height_min: hMin, height_max: hMax, weight_min: kg(wMin), weight_max: kg(wMax) }])) };
  // Height decides: 172 cm is closest to the middle of L (165–175); weight 64 kg only marks it TIGHT.
  assert.equal(recommend(chart, defaultProfile).size, 'L');
  assert.equal(recommend(chart, { ...defaultProfile, height: 175, weight: 80 }).size, 'XL');
  const fitted = recommend(chart, { ...defaultProfile, preference: 'fitted' });
  assert.equal(fitted.size, 'L');
  assert.equal(fitted.zones.find(zone => zone.name === 'WEIGHT')?.word, 'TIGHT');
  assert.notEqual(fitted.zones.find(zone => zone.name === 'HEIGHT')?.word, 'SHORT');
  assert.equal(recommend(chart, { ...defaultProfile, height: 176, preference: 'fitted' }).size, 'XL');
  const tight = recommend(chart, { ...defaultProfile, weight: 140, preference: 'fitted' });
  assert.equal(tight.level, 'too_tight');
  assert.equal(tight.zones.find(zone => zone.name === 'WEIGHT')?.word, 'TIGHT');
  assert.notEqual(tight.zones.find(zone => zone.name === 'HEIGHT')?.word, 'SHORT');
  assert.equal(fitFor(chart, defaultProfile, 'M').level, 'too_tight');
  assert.equal(fitFor(chart, defaultProfile, '3XL').level, 'oversize');
  assert.equal(recommend(chart, { ...defaultProfile, height: 160, weight: 50 }).size, 'M');
  assert.equal(recommend(chart, { ...defaultProfile, preference: 'oversize' }).size, '2XL');
});

test('a size is only skipped for try-on when weight is TIGHT and height is SHORT together', () => {
  const kg = (jin: number) => jin / 2;
  const rows: [string, number, number, number, number][] = [['S', 150, 160, 85, 95], ['M', 155, 168, 90, 110], ['L', 165, 175, 105, 125], ['XL', 170, 178, 115, 135]];
  const chart = { ...products[0], id: 'ruler:test', sizes: rows.map(row => row[0]), chart: Object.fromEntries(rows.map(([size, hMin, hMax, wMin, wMax]) => [size, { height_min: hMin, height_max: hMax, weight_min: kg(wMin), weight_max: kg(wMax) }])) };
  const person = { ...defaultProfile, height: 175, weight: 64 };
  assert.equal(cannotWear(fitFor(chart, person, 'L')), false);   // weight tight, height in range -> render
  assert.equal(cannotWear(fitFor(chart, person, 'M')), true);    // weight tight and height short -> skip
  assert.equal(cannotWear(fitFor(chart, person, 'S')), true);
  assert.equal(cannotWear(fitFor(chart, person, 'XL')), false);
});

test('fitted preference picks the size with weight TIGHT and height IDEAL; regular picks both IDEAL', () => {
  const kg = (jin: number) => jin / 2;
  const rows: [string, number, number, number, number][] = [['S', 150, 160, 85, 95], ['M', 155, 168, 90, 110], ['L', 165, 175, 105, 125], ['XL', 170, 178, 115, 135], ['2XL', 172, 180, 130, 155], ['3XL', 180, 190, 150, 170]];
  const chart = { ...products[0], id: 'ruler:test', sizes: rows.map(row => row[0]), chart: Object.fromEntries(rows.map(([size, hMin, hMax, wMin, wMax]) => [size, { height_min: hMin, height_max: hMax, weight_min: kg(wMin), weight_max: kg(wMax) }])) };
  const person = { ...defaultProfile, height: 175, weight: 64 };
  const fitted = recommend(chart, { ...person, preference: 'fitted' });
  assert.equal(fitted.size, 'L');
  assert.deepEqual(fitted.zones.map(zone => zone.word), ['TIGHT', 'IDEAL']);
  assert.equal(fitted.level, 'fitted');
  assert.equal(recommend(chart, { ...person, preference: 'regular' }).size, 'XL');
  assert.equal(recommend(chart, { ...person, preference: 'relaxed' }).size, '2XL');
  assert.equal(fitFor(chart, person, 'M').level, 'too_tight');
});
