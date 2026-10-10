import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Linking } from 'react-native';

export type CapturedPhoto = Pick<CameraCapturedPicture, 'uri' | 'width' | 'height'>;

// Camera state for CameraCapture: permission, front/back, ready flag, errors and taking the photo.
export function useCamera() {
  const ref = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The OS only shows the permission prompt once; after that the user has to change it in Settings.
  const blocked = permission?.granted === false && permission.canAskAgain === false;
  const askPermission = () => (blocked ? Linking.openSettings() : requestPermission());

  const switchCamera = () => setFacing(f => (f === 'back' ? 'front' : 'back'));
  const onReady = () => { setReady(true); setError(null); };
  const onMountError = ({ message }: { message: string }) => { setReady(false); setError(friendlyError(message)); };

  async function takePhoto(): Promise<CapturedPhoto | null> {
    if (!ref.current || !ready || busy) return null;
    setBusy(true);
    try {
      const { uri, width, height } = await ref.current.takePictureAsync({ quality: 0.9 });
      return { uri, width, height };
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : String(e)));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { ref, permission, blocked, askPermission, facing, switchCamera, ready, setReady, busy, error, onReady, onMountError, takePhoto };
}

function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('secure') || m.includes('https')) return 'The camera only works over HTTPS. Open the app from a secure link.';
  if (m.includes('notfound') || m.includes('no camera') || m.includes('not available')) return 'No camera was found on this device.';
  if (m.includes('notreadable') || m.includes('in use') || m.includes('busy')) return 'The camera is being used by another app. Close it and try again.';
  if (m.includes('permission') || m.includes('notallowed') || m.includes('denied')) return 'Camera access was blocked. Allow it in your settings and try again.';
  return 'The camera could not start. Please try again.';
}
