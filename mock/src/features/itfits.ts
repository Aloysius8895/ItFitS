import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { Product } from './products';

// ItFitS dev server (mobile/, `npm run app`) and its backend (model/, port 8000), on the same computer as this app.
const ITFITS_PORT = process.env.EXPO_PUBLIC_ITFITS_PORT ?? '8081';
// Deployed web build: ItFitS's site, e.g. https://itfits.vercel.app (set when building on Vercel).
const ITFITS_URL = process.env.EXPO_PUBLIC_ITFITS_URL?.replace(/\/$/, '');
const API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? '8000';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
const host = () => isWeb ? window.location.hostname : Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';

// Opens ItFitS on its TRY ON screen with this product's photo as the garment and the chosen size selected.
// Web: the photo URL goes in the link. Expo Go: the product is handed over through the ItFitS backend
// (ItFitS picks it up when TRY ON opens), because Expo Go drops link parameters when switching projects.
export async function openInItFitS(product: Product, size: string) {
  const photoUrl = isWeb ? new URL(Asset.fromModule(product.image as number).uri, window.location.href).href : Asset.fromModule(product.image as number).uri;
  const params = new URLSearchParams({ size, name: product.name });
  if (isWeb) {
    // Browsers keep link parameters, so the photo URL goes straight in the link (no backend hand-off needed).
    params.set('garment', photoUrl);
    window.location.assign(`${ITFITS_URL ?? `${window.location.protocol}//${host()}:${ITFITS_PORT}`}/try-on?${params}`);
    return;
  }
  try {
    const garment = await downloadAsDataUrl(photoUrl);
    const response = await fetch(`http://${host()}:${API_PORT}/api/app/handoff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ garment_image: garment, size, name: product.name }) });
    if (!response.ok) throw new Error(`Hand-off failed (${response.status})`);
    params.set('handoff', (await response.json()).id);
  } catch {
    // Backend not running: fall back to passing the photo URL in the link.
    params.set('garment', photoUrl);
  }
  // exp:// switches Expo Go to the ItFitS project.
  await Linking.openURL(`exp://${host()}:${ITFITS_PORT}/--/try-on?${params}`);
}

async function downloadAsDataUrl(url: string) {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the photo.'));
    reader.onerror = () => reject(new Error('Could not read the photo.'));
    reader.readAsDataURL(blob);
  });
}
