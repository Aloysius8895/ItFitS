import { Product, Size } from '../catalog/products';

export type Sex = 'female' | 'male' | 'unspecified';
export type FitPreference = 'fitted' | 'regular' | 'relaxed' | 'oversize';
export const preferences: FitPreference[] = ['fitted', 'regular', 'relaxed', 'oversize'];

export type BodyProfile = { sex: Sex; height: number; weight: number; chest: number; waist: number; hip: number; shoulder: number; age?: number; preference: FitPreference; photoUri?: string };
export const defaultProfile: BodyProfile = { sex: 'unspecified', height: 172, weight: 64, chest: 92, waist: 76, hip: 96, shoulder: 44, preference: 'regular' };

export type Level = 'too_tight' | 'fitted' | 'relaxed' | 'oversize';
export type Zone = { name: string; ease_cm: number; ease_pct: number; position: number; word: 'TIGHT' | 'IDEAL' | 'LOOSE' | 'SHORT' | 'LONG'; off: boolean; display?: string };
export type MlSignal = { fit: string; confidence: number; probabilities: Record<string, number>; ease_shift: number } | null;
export type FitResult = { size: Size; level: Level; label: string; detail: string; score: number; ease_cm: number | null; mean_ease_pct: number | null; position: number; zones: Zone[]; ml: MlSignal; predicted_rating: number; review_class: 'small' | 'fit' | 'large' };

// Same rules as model/backend/app_fit.py, minus the ML nudge. Used when the backend is unreachable.
const preferenceTarget: Record<FitPreference, number> = { fitted: 4, regular: 8, relaxed: 14, oversize: 24 };
const cutShift: Record<string, number> = { SLIM: -3, REGULAR: 0, STRAIGHT: 0, RELAXED: 3, OVERSIZED: 8 };
const stretchPct = { none: 0, low: 3, medium: 6, high: 10 };
const groups: Record<string, 'top' | 'outerwear'> = { TOP: 'top', KNITWEAR: 'top', SHIRT: 'top', JACKET: 'outerwear', COAT: 'outerwear' };
const thresholds = { top: [3, 12, 22], outerwear: [6, 16, 26], other: [0, 4, 12] };
const labels: Record<Level, string> = { too_tight: 'TOO TIGHT', fitted: 'FITTED', relaxed: 'RELAXED', oversize: 'OVERSIZE' };
export const details: Record<Level, string> = {
  too_tight: 'Below your body measurements; expect pulling and restricted movement.',
  fitted: 'Close to the body with little spare room.',
  relaxed: 'Comfortable room to move with the intended silhouette.',
  oversize: 'Visibly large on you; only for a deliberately oversized look.',
};

export function targetEase(product: Product, body: BodyProfile) {
  return preferenceTarget[body.preference] + (cutShift[product.cut.toUpperCase()] ?? 0);
}

export function ratingToClass(rating: number) { return rating <= 3 ? 'small' : rating >= 7 ? 'large' : 'fit'; }

// Height/weight range charts (ruler/*.csv): same rules as assess_range_chart in app_fit.py.
// The base size is chosen by HEIGHT (closest to the middle of a size's height range, ties to the smaller size);
// weight only marks a size TIGHT or LOOSE. The preference moves the pick, never onto a size the person cannot wear.
const rangeSteps: Record<FitPreference, number> = { fitted: -1, regular: 0, relaxed: 1, oversize: 2 };
type Row = Product['chart'][string];
const isRangeRow = (row: Row) => row.chest === undefined && (row.height_min !== undefined || row.weight_min !== undefined);
const isRangeChart = (product: Product) => product.sizes.every(size => isRangeRow(product.chart[size]));

function rangeZone(name: string, value: number, low: number, high: number, unit: string, over: Zone['word'], under: Zone['word']) {
  const half = Math.max((high - low) / 2, .5); const z = (value - (low + high) / 2) / half;
  const outside = value > high ? value - high : value < low ? value - low : 0;
  const word = z > 1 ? over : z < -1 ? under : 'IDEAL';
  const span = `${low}–${high} ${unit}`;
  const zone: Zone = { name, ease_cm: Math.round(outside * 10) / 10, ease_pct: z, position: Math.max(.04, Math.min(.96, .5 - .1 * z)), word, off: word !== 'IDEAL', display: outside === 0 ? `IN RANGE ${span}` : `${outside > 0 ? '+' : ''}${outside.toFixed(1)} ${unit} vs ${span}` };
  return { z, zone };
}

function rangeZones(row: Row, body: BodyProfile) {
  const out: { weight?: ReturnType<typeof rangeZone>; height?: ReturnType<typeof rangeZone> } = {};
  if (row.weight_min !== undefined && row.weight_max !== undefined) out.weight = rangeZone('WEIGHT', body.weight, row.weight_min, row.weight_max, 'KG', 'TIGHT', 'LOOSE');
  if (row.height_min !== undefined && row.height_max !== undefined) out.height = rangeZone('HEIGHT', body.height, row.height_min, row.height_max, 'CM', 'SHORT', 'LONG');
  return out;
}

// Weight this far over a size's range (about 25 kg for L) rules it out even though height decides the size.
const rangeCannotWear = (zones: ReturnType<typeof rangeZones>) =>
  zones.weight && zones.weight.z > 6 ? true : zones.weight && zones.height ? zones.weight.zone.word === 'TIGHT' && zones.height.zone.word === 'SHORT' : (zones.weight ?? zones.height)!.z > 1.5;

function assessRangeChart(product: Product, body: BodyProfile) {
  const zones = product.sizes.map(size => rangeZones(product.chart[size], body));
  const byHeight = zones.every(zone => zone.height);
  const base = zones.reduce((best, zone, i) => Math.abs((byHeight ? zone.height : zone.weight)!.z) < Math.abs((byHeight ? zones[best].height : zones[best].weight)!.z) ? i : best, 0);
  let pick = Math.max(0, Math.min(product.sizes.length - 1, base + rangeSteps[body.preference]));
  while (pick < product.sizes.length - 1 && rangeCannotWear(zones[pick])) pick++;
  const results = product.sizes.map((size, i): FitResult => {
    const steps = i - base; const offset = i - pick;
    const level: Level = rangeCannotWear(zones[i]) || steps <= -2 ? 'too_tight' : steps <= 0 ? 'fitted' : steps === 1 ? 'relaxed' : 'oversize';
    let score = Math.max(5, 95 - 22 * Math.abs(offset)); let rating = Math.max(1, Math.min(9, 5 + 2 * offset));
    if (level === 'too_tight') { score = Math.min(score, 40); rating = Math.min(rating, 3); }
    const list = [zones[i].weight?.zone, zones[i].height?.zone].filter((zone): zone is Zone => !!zone);
    return { size, level, label: labels[level], detail: details[level], score, ease_cm: null, mean_ease_pct: null, position: Math.max(.04, Math.min(.96, .5 + .12 * offset)), zones: list, ml: null, predicted_rating: rating, review_class: ratingToClass(rating) };
  });
  return { results, recommended: results[pick] };
}

export function fitFor(product: Product, body: BodyProfile, size: Size): FitResult {
  const row = product.chart[size];
  if (isRangeRow(row)) return assessRangeChart(product, body).results.find(result => result.size === size)!;
  const [tightBelow, relaxedFrom, oversizeFrom] = thresholds[groups[product.category.toUpperCase()] ?? 'other'];
  const tight = tightBelow - stretchPct[product.stretch];
  const target = targetEase(product, body);
  const circumference: number[] = [];
  const zones: Zone[] = [];
  for (const name of ['chest', 'waist', 'hip', 'shoulder'] as const) {
    const garment = row[name]; const own = body[name];
    if (garment === undefined || !own) continue;
    const easeCm = garment - own; const easePct = easeCm / own * 100;
    if (name !== 'shoulder') circumference.push(easePct);
    const raw = name === 'shoulder' ? .5 + (easeCm - 1.5) / 16 : .5 + (easePct - target) / 40;
    const position = Math.max(.04, Math.min(.96, raw));
    const isTight = name === 'shoulder' ? easeCm < -1.5 : easePct < tight;
    const word = isTight || position < .4 ? 'TIGHT' : position > .6 ? 'LOOSE' : 'IDEAL';
    zones.push({ name: name.toUpperCase(), ease_cm: Math.round(easeCm * 10) / 10, ease_pct: Math.round(easePct * 10) / 10, position, word, off: word !== 'IDEAL' });
  }
  const mean = circumference.reduce((a, b) => a + b, 0) / circumference.length;
  const min = Math.min(...circumference);
  const level: Level = min < tight ? 'too_tight' : mean < relaxedFrom ? 'fitted' : mean < oversizeFrom ? 'relaxed' : 'oversize';
  let score = Math.max(5, Math.min(99, 97 - 3.2 * Math.abs(mean - target)));
  if (level === 'too_tight') score = Math.min(score, 40);
  let rating = Math.max(1, Math.min(9, Math.round(5 + (mean - target) / 4)));
  if (level === 'too_tight') rating = Math.min(rating, 3);
  return { size, level, label: labels[level], detail: details[level], score: Math.round(score), ease_cm: Math.round(((row.chest ?? body.chest) - body.chest) * 10) / 10, mean_ease_pct: Math.round(mean * 10) / 10, position: Math.max(.04, Math.min(.96, .5 + (mean - target) / 40)), zones, ml: null, predicted_rating: rating, review_class: ratingToClass(rating) };
}

// Too small to render a try-on (same rule as cannot_wear in app_fit.py): with a height/weight chart only when
// weight is over the range AND height is over it; otherwise when the verdict is too tight.
export function cannotWear(result: FitResult) {
  const weight = result.zones.find(zone => zone.name === 'WEIGHT'); const height = result.zones.find(zone => zone.name === 'HEIGHT');
  if (weight && height) return weight.word === 'TIGHT' && height.word === 'SHORT';
  return result.level === 'too_tight';
}

export function assessAll(product: Product, body: BodyProfile) {
  if (isRangeChart(product)) return assessRangeChart(product, body);
  const results = product.sizes.map(size => fitFor(product, body, size));
  const candidates = results.filter(result => result.level !== 'too_tight');
  const recommended = (candidates.length ? candidates : results).reduce((best, current) => current.score > best.score ? current : best);
  return { results, recommended };
}

export function recommend(product: Product, body: BodyProfile): FitResult { return assessAll(product, body).recommended; }

// Rough build label for the BODY screen, from chest / waist / hip circumferences.
export function buildLabel(body: BodyProfile) {
  const { chest, waist, hip } = body;
  if (waist >= chest * .95 && waist >= hip * .95) return 'ROUNDED MIDSECTION';
  if (hip > chest * 1.05) return 'HIP-LED';
  if (chest > hip * 1.05) return 'CHEST-LED';
  if (waist <= Math.min(chest, hip) * .78) return 'DEFINED WAIST';
  return 'STRAIGHT';
}
