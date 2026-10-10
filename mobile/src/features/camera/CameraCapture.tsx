import { CameraView } from 'expo-camera';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../ui/Kit';
import { CapturedPhoto, useCamera } from './useCamera';

type Props = {
  onPhotoConfirmed: (photo: CapturedPhoto) => void;
  onCancel?: () => void;
};

// Full-screen camera: live preview -> take photo -> review (Retake / Use this photo).
// The CameraView is unmounted while reviewing, which stops the camera session and turns the camera indicator off.
export function CameraCapture({ onPhotoConfirmed, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const { ref, permission, blocked, askPermission, facing, switchCamera, ready, setReady, busy, error, onReady, onMountError, takePhoto } = useCamera();
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);

  async function capture() {
    const result = await takePhoto();
    if (result) { setReady(false); setPhoto(result); }
  }

  const pad = { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 };

  if (!permission) return <View style={[s.screen, s.center]}><ActivityIndicator color={C.paper} /></View>;

  if (!permission.granted) {
    return (
      <View style={[s.screen, s.center, pad]}>
        <Text style={s.title}>CAMERA ACCESS</Text>
        <Text style={s.note}>{blocked ? 'Camera access is turned off for this app. Turn it on in Settings to take your photo.' : 'Fitted needs your camera to take a full-body photo.'}</Text>
        <Btn label={blocked ? 'OPEN SETTINGS' : 'START CAMERA'} primary onPress={askPermission} />
        {onCancel ? <Btn label="CANCEL" onPress={onCancel} /> : null}
        <Text style={[s.note, { marginTop: 24 }]}>Your photo stays on your device.</Text>
      </View>
    );
  }

  if (photo) {
    return (
      <View style={[s.screen, pad]}>
        <Image source={{ uri: photo.uri }} resizeMode="contain" style={{ flex: 1 }} />
        <View style={s.row}>
          <Btn label="RETAKE" grow onPress={() => setPhoto(null)} />
          <Btn label="USE THIS PHOTO" primary grow onPress={() => onPhotoConfirmed(photo)} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <CameraView ref={ref} style={StyleSheet.absoluteFill} facing={facing} onCameraReady={onReady} onMountError={onMountError} />
      <View style={[s.overlay, pad]} pointerEvents="box-none">
        <View style={s.topBar}>
          {onCancel ? <Btn label="✕" small onPress={onCancel} /> : <View />}
          <Btn label={facing === 'back' ? 'FRONT CAM' : 'BACK CAM'} small onPress={switchCamera} />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={{ alignItems: 'center' }}>
          <Text style={s.note}>Your photo stays on your device.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={capture} disabled={!ready || busy} style={[s.shutter, (!ready || busy) && { opacity: 0.4 }]}>
            <View style={s.shutterInner} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Btn({ label, onPress, primary, small, grow }: { label: string; onPress: () => void; primary?: boolean; small?: boolean; grow?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[s.btn, primary && { backgroundColor: C.orange, borderColor: C.ink }, small && s.btnSmall, grow ? { flex: 1 } : !small && { alignSelf: 'stretch' }]}>
      <Text style={[s.btnText, primary && { color: C.ink }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.ink },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between', paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 },
  title: { fontFamily: F.display, fontSize: 40, color: C.paper },
  note: { fontFamily: F.body, fontSize: 12, fontWeight: '700', color: C.paper, textAlign: 'center' },
  error: { fontFamily: F.body, fontSize: 13, fontWeight: '800', color: C.ink, backgroundColor: C.paper, padding: 12, borderRadius: 12, textAlign: 'center' },
  btn: { height: 52, minWidth: 52, borderRadius: 26, borderWidth: 1.5, borderColor: C.paper, backgroundColor: 'rgba(22,21,19,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnSmall: { height: 44, borderRadius: 22 },
  btnText: { fontFamily: F.body, fontSize: 13, fontWeight: '800', color: C.paper },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: C.paper, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.orange },
});
