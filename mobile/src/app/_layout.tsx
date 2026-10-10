import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { AppProvider } from '../features/state/AppState';
import { C } from '../features/ui/Kit';

export default function RootLayout() {
  const [loaded] = useFonts({ Anton: require('../../assets/fonts/Anton-Regular.ttf'), Archivo: require('../../assets/fonts/Archivo.ttf') });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.paper }} />;
  return <AppProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.outer } }} /></AppProvider>;
}
