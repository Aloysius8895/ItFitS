import { Size, sizes } from '../catalog/products';
import { BodyProfile } from './fit';

const feelings = ['Tight all over — restricts movement', 'Snug, slim through chest', 'Relaxed as designed', 'Roomy, slightly boxy', 'Oversized, drops past shoulders'];
const notes = [
  'Too small: chest and shoulders sit below your body measurements.',
  'Works if you like it close. Shoulders pull when you reach forward.',
  'Matches the relaxed cut the designer intended. Sleeves land at the wrist.',
  'Good for layering. Length runs 4 cm longer and sleeves bunch at the cuff.',
  'Shoulder seams drop 6 cm. Only for a deliberately oversized look.',
];
const easeBySize = [[-4, -3, -2.5, -3, -5], [2, 3, -0.5, -1.5, -2], [8, 9, 1, 0.5, 1], [13, 14, 2.5, 3.5, 5], [18, 19, 5, 6, 8]];
const zoneNames = ['CHEST', 'WAIST', 'SHOULDER', 'SLEEVE', 'LENGTH'];
const ideal = [[4, 12], [4, 14], [-1, 3], [-1, 3], [-2, 4]];

export function originalFeel(size: Size) { return feelings[sizes.indexOf(size)]; }
export function originalNote(size: Size) { return notes[sizes.indexOf(size)]; }
export function fitZones(size: Size, profile: BodyProfile) {
  return zoneNames.map((name, index) => {
    let ease = easeBySize[sizes.indexOf(size)][index];
    if (index === 0) ease += 92 - profile.chest;
    if (index === 1) ease += 76 - profile.waist;
    if (index === 2) ease += 44 - profile.shoulder;
    const [low, high] = ideal[index];
    const t = Math.max(.04, Math.min(.96, .5 + (ease - (low + high) / 2) / (high - low) * .2));
    return { name, ease, position: t, word: t < .4 ? 'TIGHT' : t > .6 ? 'LOOSE' : 'IDEAL', off: t < .4 || t > .6 };
  });
}

export const reviewPurchases = [
  { id: 'linen-shirt', name: 'LINEN SHIRT', size: 'M', date: 'DELIVERED 3 DAYS AGO', predicted: 5 },
  { id: 'ribbed-tank', name: 'RIBBED TANK', size: 'S', date: 'DELIVERED 5 DAYS AGO', predicted: 4 },
  { id: 'wide-leg-chinos', name: 'WIDE-LEG CHINOS', size: '30', date: 'DELIVERED 2 WEEKS AGO', predicted: 5 },
  { id: 'cropped-puffer', name: 'CROPPED PUFFER', size: 'L', date: 'DELIVERED 1 MONTH AGO', predicted: 6 },
];
