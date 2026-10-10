import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { FitGraph } from '../../features/fit/FitGraph';
import { useFit, useSelectedSize } from '../../features/fit/useFit';
import { useApp } from '../../features/state/AppState';
import { C, Content, DataRow, F, Hero, Screen, SizeSelector } from '../../features/ui/Kit';

const stretchLabel = { none: 'NONE · 0%', low: 'LOW · 3%', medium: 'MEDIUM · 6%', high: 'HIGH · 10%' };

export default function FitHome() {
  const router = useRouter(); const { product, profile } = useApp();
  const fit = useFit(product); const [selectedSize, setSelectedSize] = useSelectedSize(fit); const recommended = fit.recommended;
  const similarRate = fit.similar?.available ? fit.similar.sizes.find(s => s.size === recommended.size)?.fit_rate_pct : null;
  const ml = recommended.ml; const lean = ml ? (ml.probabilities.large ?? 0) - (ml.probabilities.small ?? 0) : 0;
  const modelSignal = ml ? (lean > .1 ? 'MAY RUN LARGE' : lean < -.1 ? 'MAY RUN SMALL' : 'TRUE TO SIZE') : profile.sex === 'female' ? 'SIZE CHART ONLY' : 'NO MEN\'S REVIEW DATA YET';
  return <Screen><Content style={{ paddingTop: 10, paddingBottom: 20 }}>
    <Hero style={{ marginTop: -8, marginBottom: -8 }}>YOUR SIZE</Hero>
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 4 }}><Text style={{ fontFamily: F.display, fontSize: recommended.size.length > 2 ? 110 : 170, marginTop: -18, marginBottom: -18, color: C.ink }}>{recommended.size}</Text><Text style={{ fontFamily: F.body, fontWeight: '800', fontSize: 12, lineHeight: 19, color: C.ink, paddingBottom: 20 }}>FIT SCORE {recommended.score} / 100{'\n'}{recommended.label}{'\n'}<Text style={{ color: C.muted }}>CONFIDENCE {fit.confidence}</Text></Text></View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Text style={{ fontFamily: F.body, fontSize: 11, fontWeight: '800', letterSpacing: .5, color: C.ink }}>FIT SCORE BY SIZE</Text><Text style={{ fontFamily: F.body, fontSize: 11, fontWeight: '700', color: C.muted }}>● TAP A SIZE</Text></View>
    <View style={{ marginTop: 10 }}><FitGraph results={fit.results} selected={selectedSize} onSelect={setSelectedSize} /></View>
    <SizeSelector sizes={product.sizes} selected={selectedSize} onSelect={setSelectedSize} plain />
    <View style={{ borderTopWidth: 1.5, borderColor: C.ink, marginTop: 14 }}>
      <DataRow label={`SIMILAR BODIES FOUND ${recommended.size} FIT`} value={similarRate != null ? `${similarRate}%` : fit.similar && !fit.similar.available ? 'NO DATA' : '—'} />
      {product.id.startsWith('ruler:') ? <DataRow label="SIZE CHART" value={product.material} /> : <DataRow label="FABRIC STRETCH" value={stretchLabel[product.stretch]} />}
      <DataRow label="FIT MODEL" value={modelSignal} />
      <DataRow label="YOUR PREFERENCE" value={profile.preference.toUpperCase()} />
    </View>
    {selectedSize !== recommended.size ? <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 12 }}>YOUR PICK: {selectedSize} · {fit.resultFor(selectedSize).label}. THE RECOMMENDATION STAYS {recommended.size}.</Text> : null}
    {product.custom ? <Text onPress={() => router.push({ pathname: '/product', params: { id: product.id } })} style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink, marginTop: 12, textDecorationLine: 'underline' }}>EDIT THIS ITEM&apos;S SIZE CHART</Text> : null}
  </Content></Screen>;
}
