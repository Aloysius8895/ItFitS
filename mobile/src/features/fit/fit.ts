import { Product, Size, sizes } from '../catalog/products';

export type BodyProfile = { height: number; chest: number; waist: number; shoulder: number; photoUri?: string };
export const defaultProfile: BodyProfile = { height: 172, chest: 92, waist: 76, shoulder: 44 };

export type FitResult = { size: Size; ease: number; score: number; label: string; detail: string };

export function fitFor(product: Product, body: BodyProfile, size: Size): FitResult {
  const ease = product.chest[size] - body.chest;
  const target = product.cut === '宽松剪裁' ? 12 : 10;
  const score = Math.max(10, Math.round(100 - Math.abs(ease - target) * 4));
  const label = ease < 4 ? '偏紧' : ease < 9 ? '贴身' : ease <= 15 ? '合身' : ease <= 22 ? '宽松' : '明显宽大';
  const detail = ease < 4 ? '胸部活动余量较少，肩部和袖口可能有拉扯。' : ease <= 15 ? '胸部保留舒适活动空间，接近这件衣服的设计版型。' : ease <= 22 ? '衣身更宽松，适合叠穿或偏好宽松风格。' : '衣身和肩部会明显宽大，适合刻意选择 oversize 效果。';
  return { size, ease, score, label, detail };
}

export function recommend(product: Product, body: BodyProfile): FitResult {
  return sizes.map(size => fitFor(product, body, size)).reduce((best, current) => current.score > best.score ? current : best);
}
