import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { products } from '../../features/catalog/products';
import { recommend } from '../../features/fit/fit';
import { useApp } from '../../features/state/AppState';
import { Button, C, Card, Label, Page, s } from '../../features/ui/Kit';
export default function Shop() { const router = useRouter(); const { productId, setProductId, profile, setSelectedSize } = useApp(); return <Page eyebrow="AI SHOPPING ASSISTANT · DEMO" title="找到适合你的那一件"><Text style={s.body}>先看推荐尺码，再亲自选择想要的版型。你的选择会同步到试穿示意。</Text>{products.map(p => { const rec = recommend(p, profile); const active = p.id === productId; return <Pressable key={p.id} onPress={() => { setProductId(p.id); setSelectedSize(rec.size); router.push('/fit'); }}><Card><View style={{ height: 110, backgroundColor: p.color, borderRadius: 5, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 52 }}>✳</Text></View><Label>{p.category} · {p.cut}</Label><Text style={{ fontSize: 24, fontWeight: '900', color: C.ink }}>{p.name}</Text><Text style={s.body}>RM {p.price}  ·  {p.material}</Text><Text style={{ color: C.orange, fontWeight: '900' }}>演示推荐 {rec.size} · 合身分数 {rec.score}/100 {active ? '· 当前商品' : ''}</Text></Card></Pressable>; })}<Button title="查看当前商品尺码" onPress={() => router.push('/fit')} /></Page>; }
