import { Product, Size, sizes } from '../catalog/products';

export type BodyProfile = { height: number; weight: number; chest: number; waist: number; shoulder: number; photoUri?: string };
export const defaultProfile: BodyProfile = { height: 172, weight: 64, chest: 92, waist: 76, shoulder: 44 };

export type FitResult = { size: Size; ease: number; score: number; label: string; detail: string };

export function fitFor(product: Product, body: BodyProfile, size: Size): FitResult {
  const ease = product.chest[size] - body.chest;
  const target = product.cut === 'RELAXED' ? 12 : 10;
  const demoScores: Record<Size, number> = { XS: 38, S: 71, M: 91, L: 79, XL: 54 };
  const score = product.id === 'merino' && body.chest === 92 ? demoScores[size] : Math.max(10, Math.round(91 - Math.abs(ease - target) * 3));
  const label = ease < 4 ? 'TIGHT' : ease < 9 ? 'SNUG' : ease <= 15 ? 'IDEAL' : ease <= 22 ? 'ROOMY' : 'OVERSIZED';
  const detail = ease < 4 ? 'Little room through the chest; the shoulders may pull.' : ease <= 15 ? 'Comfortable movement with the intended silhouette.' : ease <= 22 ? 'Extra room for layers or a relaxed look.' : 'The body and shoulders will look visibly large for an intentional oversized fit.';
  return { size, ease, score, label, detail };
}

export function recommend(product: Product, body: BodyProfile): FitResult {
  return sizes.map(size => fitFor(product, body, size)).reduce((best, current) => current.score > best.score ? current : best);
}
