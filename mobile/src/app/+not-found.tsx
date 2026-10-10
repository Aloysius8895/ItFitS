import { Link } from 'expo-router';
import { Text } from 'react-native';
import { C, Page, s } from '../features/ui/Kit';
export default function NotFound() { return <Page title="页面不存在"><Text style={s.body}>这个页面无法打开。</Text><Link href="/" style={{ color: C.orange, fontWeight: '900' }}>返回商品页</Link></Page>; }
