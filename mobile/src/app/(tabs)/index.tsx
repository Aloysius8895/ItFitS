import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { products, Size, sizes } from '../../features/catalog/products';
import { FitGraph } from '../../features/fit/FitGraph';
import { fitFor, recommend } from '../../features/fit/fit';
import { useApp } from '../../features/state/AppState';
import { C, Content, DataRow, Eyebrow, F, Hero, OrangeCta, Screen, SizeSelector } from '../../features/ui/Kit';

export default function FitHome() {
  const router = useRouter(); const { profile, productId, selectedSize, setSelectedSize } = useApp();
  const product = products.find(p => p.id === productId) ?? products[0]; const recommended = recommend(product, profile);
  return <Screen><Content><Eyebrow>{product.name} · {product.cut}</Eyebrow><Hero>YOUR SIZE</Hero><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 4 }}><Text style={{ fontFamily: F.display, fontSize: 170, lineHeight: 180, color: C.ink }}>{recommended.size}</Text><Text style={{ fontFamily: F.body, fontWeight: '800', fontSize: 12, lineHeight: 19, color: C.ink, paddingBottom: 20 }}>FIT SCORE {recommended.score} / 100{'\n'}<Text style={{ color: C.muted }}>CONFIDENCE HIGH</Text></Text></View><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Text style={{ fontFamily: F.body, fontSize: 11, fontWeight: '800', letterSpacing: .5, color: C.ink }}>FIT SCORE BY SIZE</Text><Text style={{ fontFamily: F.body, fontSize: 11, fontWeight: '700', color: C.muted }}>● TAP A SIZE</Text></View><View style={{ marginTop: 10 }}><FitGraph product={product} profile={profile} selected={selectedSize} onSelect={setSelectedSize} /></View><SizeSelector sizes={sizes} selected={selectedSize} onSelect={size => setSelectedSize(size as Size)} plain /><View style={{ borderTopWidth: 1.5, borderColor: C.ink, marginTop: 14 }}><DataRow label={`SIMILAR BODIES KEPT ${recommended.size}`} value="82%" /><DataRow label="FABRIC STRETCH" value="LOW · 4%" /><DataRow label="BRAND RUNS" value="HALF SIZE SMALL" /></View>{selectedSize !== recommended.size ? <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 12 }}>YOUR PICK: {selectedSize} · {fitFor(product, profile, selectedSize).label}. THE RECOMMENDATION STAYS {recommended.size}.</Text> : null}</Content><OrangeCta word="COMPARE" detail="Torn between M and L? See where each one pulls or hangs loose on your body." subtitle="SIZE BY SIZE" onPress={() => router.push('/compare')} /></Screen>;
}
