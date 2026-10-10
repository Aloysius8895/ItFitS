export const sizes = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type Size = (typeof sizes)[number];

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  material: string;
  cut: string;
  color: string;
  chest: Record<Size, number>;
  similarFeedback: string;
};

export const products: Product[] = [
  { id: 'merino', name: 'MERINO CREW SWEATER', category: 'KNITWEAR', price: 229, material: '80% MERINO · 20% NYLON', cut: 'RELAXED', color: '#C6B39A', chest: { XS: 92, S: 98, M: 104, L: 110, XL: 118 }, similarFeedback: 'Similar bodies kept M most often; XL gives a deliberately oversized look.' },
  { id: 'linen', name: 'LIGHT LINEN SHIRT', category: 'SHIRT', price: 179, material: '100% LINEN', cut: 'REGULAR', color: '#B6C2A8', chest: { XS: 90, S: 96, M: 102, L: 108, XL: 116 }, similarFeedback: 'Similar bodies found M comfortable through the shoulders and chest.' },
  { id: 'denim', name: 'CLASSIC DENIM JACKET', category: 'JACKET', price: 299, material: '98% COTTON · 2% ELASTANE', cut: 'STRAIGHT', color: '#8197A4', chest: { XS: 94, S: 100, M: 106, L: 112, XL: 120 }, similarFeedback: 'Similar bodies chose M or L depending on how much they layered.' },
];
