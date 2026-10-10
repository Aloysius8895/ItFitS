import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../features/ui/Kit';
import { BodyIcon, CompareIcon, FitIcon, ReviewIcon, TryOnIcon } from '../../features/ui/TabIcons';
// BODY is the first tab and the screen the app opens on (route '/'). Icons replace the text labels.
const items = [['index', 'BODY', BodyIcon], ['fit', 'FIT', FitIcon], ['try-on', 'TRY ON', TryOnIcon], ['compare', 'COMPARE', CompareIcon], ['reviews', 'REVIEW', ReviewIcon]] as const;
// Compact bar: 46 px for the icons plus only part of the home-indicator inset, so there is less black below.
export default function TabLayout() { const insets = useSafeAreaInsets(); const bottom = Math.max(6, insets.bottom - 14); return <Tabs screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarActiveTintColor: C.accent, tabBarInactiveTintColor: C.paper, tabBarStyle: { backgroundColor: C.ink, height: 46 + bottom, paddingTop: 0, paddingBottom: bottom, maxWidth: 440, width: '100%', alignSelf: 'center', borderTopWidth: 0 }, tabBarItemStyle: { height: 46, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' }, tabBarIconStyle: { width: 28, height: 28 } }}>{items.map(([name, title, Icon]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarAccessibilityLabel: title, tabBarIcon: ({ color }) => <Icon color={color} size={26} /> }} />)}</Tabs>; }
