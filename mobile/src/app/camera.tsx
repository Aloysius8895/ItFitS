import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraCapture } from '../features/camera/CameraCapture';
import { CapturedPhoto } from '../features/camera/useCamera';
import { C, F } from '../features/ui/Kit';

// Demo route for the camera feature (open /camera). Shows the confirmed photo until the next feature plugs in.
export default function CameraDemo() {
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!photo) return <CameraCapture onPhotoConfirmed={setPhoto} onCancel={back} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.paper, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 20, gap: 12 }}>
      <Text style={{ fontFamily: F.display, fontSize: 40, color: C.ink }}>PHOTO READY</Text>
      <Image source={{ uri: photo.uri }} resizeMode="contain" style={{ flex: 1, borderRadius: 16, backgroundColor: C.track }} />
      <Text style={{ fontFamily: F.body, fontSize: 13, fontWeight: '800', color: C.muted }}>{photo.width} × {photo.height} px · stays on this device</Text>
      <Pressable accessibilityRole="button" onPress={() => setPhoto(null)} style={{ height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.body, fontSize: 13, fontWeight: '800', color: C.ink }}>TAKE ANOTHER</Text>
      </Pressable>
    </View>
  );
}
