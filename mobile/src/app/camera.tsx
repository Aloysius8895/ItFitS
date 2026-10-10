import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { CameraCapture } from '../features/camera/CameraCapture';
import { CapturedPhoto } from '../features/camera/useCamera';
import { useApp } from '../features/state/AppState';
import { C } from '../features/ui/Kit';

export default function CameraScreen() {
  const { profile, setProfile, ready } = useApp();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  function cancel() {
    if (router.canGoBack()) router.back();
    else router.replace('/try-on');
  }

  function confirm(photo: CapturedPhoto) {
    setProfile({ ...profile, photoUri: photo.uri });
    router.replace('/try-on');
  }

  if (!focused || !ready) return <View style={{ flex: 1, backgroundColor: C.ink }} />;
  return <CameraCapture onPhotoConfirmed={confirm} onCancel={cancel} />;
}
