import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../../features/ui/Kit';
const items = [['index', 'FIT'], ['compare', 'COMPARE'], ['try-on', 'TRY ON'], ['body', 'BODY'], ['reviews', 'REVIEW']] as const;
export default function TabLayout() { const insets = useSafeAreaInsets(); return <Tabs screenOptions={{ headerShown: false, tabBarLabelPosition: 'below-icon', tabBarActiveTintColor: C.orange, tabBarInactiveTintColor: C.paper, tabBarStyle: { backgroundColor: C.ink, height: 64 + insets.bottom, paddingBottom: insets.bottom, maxWidth: 440, width: '100%', alignSelf: 'center', borderTopWidth: 0 }, tabBarLabelStyle: { fontFamily: F.body, fontSize: 11, fontWeight: '800', letterSpacing: .5, marginBottom: 10 }, tabBarIconStyle: { marginTop: 4 } }}>{items.map(([name, title]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ focused }) => <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: focused ? C.orange : 'transparent' }} /> }} />)}</Tabs>; }
