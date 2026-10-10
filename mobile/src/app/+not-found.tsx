import { Link } from 'expo-router';
import { Text } from 'react-native';
import { C, Content, F, Hero, Screen } from '../features/ui/Kit';
export default function NotFound() { return <Screen><Content><Hero>NOT FOUND</Hero><Text style={{ fontFamily: F.body, color: C.ink, marginTop: 20 }}>This page does not exist.</Text><Link href="/" style={{ color: C.orange, fontFamily: F.body, fontWeight: '800', marginTop: 20 }}>BACK TO FIT</Link></Content></Screen>; }
