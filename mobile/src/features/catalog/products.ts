export const sizes = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type Size = string;

export type Stretch = 'none' | 'low' | 'medium' | 'high';
export const stretches: Stretch[] = ['none', 'low', 'medium', 'high'];
export const cuts = ['SLIM', 'REGULAR', 'STRAIGHT', 'RELAXED', 'OVERSIZED'] as const;
export const categories = ['KNITWEAR', 'SHIRT', 'TOP', 'JACKET', 'COAT', 'DRESS', 'PANTS', 'SKIRT'] as const;

// One size: garment measurements in cm (chest...), or the body height (cm) / weight (kg) range a ruler/ chart lists for it.
export type SizeRow = { chest?: number; waist?: number; hip?: number; shoulder?: number; length?: number; height_min?: number; height_max?: number; weight_min?: number; weight_max?: number };

export type Product = {
  id: string;
  name: string;
  category: string;
  price?: number;
  material: string;
  cut: string;
  color: string;
  stretch: Stretch;
  sizes: string[];
  chart: Record<string, SizeRow>;
  imageUri?: string;
  custom?: boolean;
};

const letters = [...sizes];
const chestOnly = (values: number[]) => Object.fromEntries(letters.map((size, index) => [size, { chest: values[index] }]));

export const products: Product[] = [
  { id: 'merino', name: 'MERINO CREW SWEATER', category: 'KNITWEAR', price: 229, material: '80% MERINO · 20% NYLON', cut: 'RELAXED', color: '#C6B39A', stretch: 'low', sizes: letters, chart: chestOnly([92, 98, 104, 110, 118]) },
  { id: 'linen', name: 'LIGHT LINEN SHIRT', category: 'SHIRT', price: 179, material: '100% LINEN', cut: 'REGULAR', color: '#B6C2A8', stretch: 'none', sizes: letters, chart: chestOnly([90, 96, 102, 108, 116]) },
  { id: 'denim', name: 'CLASSIC DENIM JACKET', category: 'JACKET', price: 299, material: '98% COTTON · 2% ELASTANE', cut: 'STRAIGHT', color: '#8197A4', stretch: 'low', sizes: letters, chart: chestOnly([94, 100, 106, 112, 120]) },
];
