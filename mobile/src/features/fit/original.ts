import { Purchase } from '../reviews/types';

// Sample purchases from the original design, shown under the user's own purchases. Their reviews stay on the device.
export const demoPurchases: Purchase[] = [
  { id: 'linen-shirt', productId: 'linen-shirt', name: 'LINEN SHIRT', size: 'M', purchasedAt: 'DELIVERED 3 DAYS AGO', predictedRating: 5, demo: true },
  { id: 'ribbed-tank', productId: 'ribbed-tank', name: 'RIBBED TANK', size: 'S', purchasedAt: 'DELIVERED 5 DAYS AGO', predictedRating: 4, demo: true },
  { id: 'wide-leg-chinos', productId: 'wide-leg-chinos', name: 'WIDE-LEG CHINOS', size: '30', purchasedAt: 'DELIVERED 2 WEEKS AGO', predictedRating: 5, demo: true },
  { id: 'cropped-puffer', productId: 'cropped-puffer', name: 'CROPPED PUFFER', size: 'L', purchasedAt: 'DELIVERED 1 MONTH AGO', predictedRating: 6, demo: true },
];
