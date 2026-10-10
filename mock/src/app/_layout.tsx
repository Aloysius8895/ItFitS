import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { M } from '../features/theme';

export default function RootLayout() {
  return <>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: M.page } }} />
  </>;
}
