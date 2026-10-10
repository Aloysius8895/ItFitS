import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '../../features/ui/Kit';
const items = [['index','商品','◧'], ['fit','尺码','◎'], ['try-on','试穿','◉'], ['body','身材','♧'], ['reviews','评价','✦']] as const;
export default function TabLayout() { return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: C.orange, tabBarInactiveTintColor: C.muted, tabBarStyle: { backgroundColor: C.ink, height: 74, paddingBottom: 10, paddingTop: 5 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '800' } }}>{items.map(([name,title,icon]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>{icon}</Text> }} />)}</Tabs>; }
