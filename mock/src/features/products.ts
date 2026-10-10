import { ImageSourcePropType } from 'react-native';

export type Colour = { label: string; swatch: string };
export type Product = {
  id: string;
  name: string;
  price: number;
  was: number;
  rating: number;
  ratings: string;
  sold: string;
  colours: Colour[];
  sizes: string[];
  image: ImageSourcePropType;
};

// Sizes match ruler/clothing_size_chart.csv in the ItFitS repository.
const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

// Photos live in mock/product/.
export const products: Product[] = [
  { id: 'black-hoodie', name: 'Essential Black Hoodie', price: 89, was: 129, rating: 4.8, ratings: '1.2k', sold: '3.4k', colours: [{ label: 'Black', swatch: '#17201F' }], sizes, image: require('../../product/black-hoodie.png') },
  { id: 'banana-costume', name: 'Banana Costume', price: 59, was: 79, rating: 4.6, ratings: '486', sold: '1.1k', colours: [{ label: 'Yellow', swatch: '#FFC53D' }], sizes, image: require('../../product/banana-costume.png') },
];

export const discount = (product: Product) => Math.round((1 - product.price / product.was) * 100);
export const findProduct = (id: string | undefined) => products.find(product => product.id === id) ?? products[0];
