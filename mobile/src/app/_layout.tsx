import { Stack } from 'expo-router';
import { AppProvider } from '../features/state/AppState';
export default function RootLayout() { return <AppProvider><Stack screenOptions={{ headerShown: false }} /></AppProvider>; }
