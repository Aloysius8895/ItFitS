import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Shrinks a local photo and returns it as a JPEG data URL small enough to upload (~100-300 KB).
// Data URLs (e.g. a garment photo handed over by the mock store) are already uploadable and pass through.
export async function toDataUrl(uri: string, width = 768) {
  if (uri.startsWith('data:')) return uri;
  const rendered = await ImageManipulator.manipulate(uri).resize({ width }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error('Could not read the photo.');
  return `data:image/jpeg;base64,${saved.base64}`;
}

// Downloads an image (e.g. a product photo served by the mock store's dev server) as a data URL,
// so it survives app restarts and can be uploaded for the try-on.
export async function downloadAsDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image download failed (${response.status}).`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read the image.'));
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.readAsDataURL(blob);
  });
}
