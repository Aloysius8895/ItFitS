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
  { id: 'merino', name: '美丽诺羊毛圆领衫', category: '针织衫', price: 229, material: '美丽诺羊毛 80% · 尼龙 20%', cut: '宽松剪裁', color: '#C6B39A', chest: { XS: 92, S: 98, M: 104, L: 110, XL: 118 }, similarFeedback: '相近体型用户多选 M；想要明显宽松感的用户会选 XL。' },
  { id: 'linen', name: '轻盈亚麻衬衫', category: '衬衫', price: 179, material: '亚麻 100%', cut: '标准剪裁', color: '#B6C2A8', chest: { XS: 90, S: 96, M: 102, L: 108, XL: 116 }, similarFeedback: '相近体型用户反馈 M 的肩部和胸部较舒适。' },
  { id: 'denim', name: '经典牛仔外套', category: '外套', price: 299, material: '棉 98% · 弹性纤维 2%', cut: '直筒剪裁', color: '#8197A4', chest: { XS: 94, S: 100, M: 106, L: 112, XL: 120 }, similarFeedback: '相近体型用户常在 M 与 L 之间选择，取决于是否内搭厚衣。' },
];
