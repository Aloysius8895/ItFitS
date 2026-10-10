import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { api } from '../../features/api/client';
import { ratingToClass } from '../../features/fit/fit';
import { demoPurchases } from '../../features/fit/original';
import { useApp } from '../../features/state/AppState';
import { BodyText, C, Content, DataRow, Eyebrow, F, Hero, OrangeCta, Screen } from '../../features/ui/Kit';

const troubleSpots = ['SHOULDERS', 'CHEST', 'WAIST', 'HIPS', 'SLEEVES', 'LENGTH'];
const rateWords = ['', 'Way too tight', 'Too tight', 'A bit snug', 'Slightly snug', 'Perfect', 'Slightly loose', 'A bit loose', 'Too loose', 'Way too loose'];

function when(value: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  const days = Math.floor((Date.now() - time) / 86400000);
  return days < 1 ? 'BOUGHT TODAY' : `BOUGHT ${days} DAY${days === 1 ? '' : 'S'} AGO`;
}

export default function Reviews() {
  const { reviews, addReview, purchases, status, refreshStatus } = useApp();
  const list = [...purchases, ...demoPurchases];
  const [purchaseIndex, setPurchaseIndex] = useState(0); const [rating, setRating] = useState<number | null>(null); const [spots, setSpots] = useState<string[]>([]); const [sending, setSending] = useState(false); const [notice, setNotice] = useState<string | null>(null);
  const purchase = list[Math.min(purchaseIndex, list.length - 1)];
  const reviewOf = (id: string) => reviews.find(review => (review.purchaseId ?? review.productId) === id);
  const existing = reviewOf(purchase.id);
  const shownRating = rating ?? existing?.rating ?? null; const shownSpots = rating === null && existing ? existing.zones : spots;
  const waiting = list.filter(item => !reviewOf(item.id)).length;

  // Accuracy: the server's running figure once real reviews exist, otherwise this device's reviews.
  const local = reviews.filter(review => review.predictedRating !== undefined);
  const localHits = local.map(review => ratingToClass(review.rating) === ratingToClass(review.predictedRating!));
  const server = status?.accuracy;
  const accuracy = server?.reviews ? server.accuracy_pct ?? 0 : localHits.length ? Math.round(localHits.filter(Boolean).length / localHits.length * 100) : null;
  const history = server?.reviews ? server.history_pct : localHits.map((_, i) => Math.round(localHits.slice(0, i + 1).filter(Boolean).length / (i + 1) * 100));
  const points = (history.length > 1 ? history : [accuracy ?? 0, accuracy ?? 0]).map((value, i, all) => ({ x: i / (all.length - 1) * 340 + 5, y: 100 - value * .9 }));

  function pickPurchase(index: number) { setPurchaseIndex(index); setRating(null); setSpots([]); setNotice(null); }
  async function submit() {
    if (shownRating === null) return;
    setSending(true); setNotice(null);
    const review = { purchaseId: purchase.id, productId: purchase.productId, purchasedSize: purchase.size, rating: shownRating, zones: shownSpots, submittedAt: new Date().toISOString(), predictionId: purchase.predictionId, predictedRating: purchase.predictedRating, synced: false };
    if (purchase.predictionId) {
      try {
        const result = await api.review(purchase.predictionId, shownRating, shownSpots);
        review.synced = true;
        setNotice(result.retrain_triggered ? 'Enough reviews disagreed with us: the fit model is retraining now. It only replaces the old one if it validates better.' : `Saved. ${Math.max(0, result.min_reviews - result.pending_reviews)} more reviews before the next retrain check.`);
        refreshStatus();
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('already has a review')) review.synced = true;
        else setNotice('Saved on this device. The server could not be reached, so this review will not train the model.');
      }
    } else if (!purchase.demo) setNotice('Saved on this device only (bought while offline).');
    addReview(review); setRating(null); setSpots([]); setSending(false);
  }

  return <Screen><Content style={{ paddingTop: 10 }}><Eyebrow>{waiting} WAITING FOR REVIEW</Eyebrow><Hero style={{ marginTop: -8, marginBottom: -8 }}>PURCHASES</Hero>
    <View style={{ marginTop: 18, borderTopWidth: 1.5, borderColor: C.ink }}>{list.map((item, index) => { const logged = !!reviewOf(item.id); const active = item.id === purchase.id; return <Pressable key={item.id} onPress={() => pickPurchase(index)} style={{ borderBottomWidth: 1, borderColor: C.ink, backgroundColor: active ? C.accent : 'transparent', paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><View style={{ flex: 1 }}><Text style={{ fontFamily: F.body, fontSize: 14, fontWeight: '800', color: C.ink }}>{item.name}</Text><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '600', color: active ? C.ink : C.muted, marginTop: 3 }}>SIZE {item.size} · {when(item.purchasedAt)}{item.demo ? ' · SAMPLE' : ''}</Text></View><View style={{ backgroundColor: logged ? 'transparent' : C.accent, borderWidth: 1.5, borderColor: C.ink, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 }}><Text style={{ fontFamily: F.body, fontSize: 10, fontWeight: '800', color: C.ink }}>{logged ? 'REVIEWED' : 'TO REVIEW'}</Text></View></Pressable>; })}</View>
    {purchases.length === 0 ? <BodyText style={{ fontSize: 12, lineHeight: 17, color: C.muted, marginTop: 10 }}>Sample purchases are shown. Tap “I BOUGHT SIZE …” on TRY ON to add your own; their reviews retrain the fit model.</BodyText> : null}
    <Eyebrow style={{ marginTop: 30 }}> {purchase.name} · SIZE {purchase.size}</Eyebrow><Hero>HOW DID{'\n'}IT FIT?</Hero>
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 22 }}>{Array.from({ length: 9 }, (_, index) => index + 1).map(number => <Pressable accessibilityRole="button" key={number} onPress={() => setRating(number)} style={{ flex: 1, height: 56, borderWidth: 1.5, borderRadius: 10, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: shownRating === number ? (number === 5 ? C.ink : C.accent) : 'transparent' }}><Text style={{ fontFamily: F.display, fontSize: 22, color: shownRating === number && number === 5 ? C.paper : C.ink }}>{number}</Text></Pressable>)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><Text style={small}>TOO SMALL</Text><Text style={small}>FITS WELL</Text><Text style={small}>TOO BIG</Text></View>
    <Text style={{ fontFamily: F.body, fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 14 }}>{shownRating ? `${rateWords[shownRating]} · counts as ${ratingToClass(shownRating) === 'fit' ? 'fits well' : ratingToClass(shownRating) === 'small' ? 'too small' : 'too big'}` : 'Tap a number. 5 = perfect fit.'}</Text>
    <Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink, marginTop: 22 }}>ANY TROUBLE SPOTS?</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>{troubleSpots.map(spot => { const active = shownSpots.includes(spot); return <Pressable key={spot} onPress={() => { setRating(shownRating); setSpots(active ? shownSpots.filter(item => item !== spot) : [...shownSpots, spot]); }} style={{ height: 44, borderWidth: 1.5, borderColor: C.ink, borderRadius: 22, backgroundColor: active ? C.accent : 'transparent', paddingHorizontal: 18, justifyContent: 'center' }}><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink }}>{spot}</Text></Pressable>; })}</View>
    {notice ? <BodyText style={{ fontSize: 13, lineHeight: 19, marginTop: 16 }}>{notice}</BodyText> : null}
    {existing ? <View style={{ marginTop: 26, borderTopWidth: 1.5, borderColor: C.ink }}><DataRow label="WE PREDICTED" value={`${purchase.predictedRating} · ${rateWords[purchase.predictedRating].toUpperCase()}`} /><DataRow label="YOU SAID" value={`${existing.rating} · ${rateWords[existing.rating].toUpperCase()}`} /><DataRow label="GAP" value={existing.rating === purchase.predictedRating ? 'SPOT ON' : String(Math.abs(existing.rating - purchase.predictedRating))} /><DataRow label="SENT TO FIT MODEL" value={existing.synced ? 'YES' : purchase.demo ? 'SAMPLE · NO' : 'NO · DEVICE ONLY'} />
      {accuracy !== null ? <><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink, marginTop: 24 }}>PREDICTION ACCURACY · {server?.reviews ? `${server.reviews} REVIEWS` : 'THIS DEVICE'}</Text><View style={{ flexDirection: 'row', alignItems: 'flex-end' }}><Text style={{ fontFamily: F.display, fontSize: 96, color: C.ink }}>{accuracy}</Text><Text style={{ fontFamily: F.body, fontSize: 13, fontWeight: '700', color: C.ink, paddingBottom: 14 }}>% · LEARNING YOU</Text></View>
        <Svg width="100%" height={110} viewBox="0 0 350 110"><Path d={points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')} fill="none" stroke={C.ink} strokeWidth={3} /><Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={8} fill={C.accent} stroke={C.ink} strokeWidth={2.5} /><Line x1={0} y1={104} x2={350} y2={104} stroke={C.ink} strokeWidth={1.5} /></Svg></> : null}
      {status ? <View style={{ marginTop: 12 }}><DataRow label="FIT MODEL VERSION" value={`V${status.reviews.model_version}`} /><DataRow label="REVIEWS UNTIL RETRAIN CHECK" value={String(Math.max(0, status.reviews.min_reviews - status.reviews.pending_reviews))} /><DataRow label="DISAGREEING WITH US" value={`${Math.round(status.reviews.mismatch_rate * 100)}% · RETRAIN AT ${Math.round(status.reviews.mismatch_threshold * 100)}%`} /></View> : null}
    </View> : null}
  </Content><OrangeCta word={existing && rating === null ? 'THANKS' : sending ? 'SENDING' : 'SEND IT'} subtitle={existing && rating === null ? 'NEXT SIZE PICK GETS SHARPER · NEXT ITEM' : shownRating ? 'UPDATE MY FIT MODEL' : 'RATE THE FIT FIRST'} onPress={existing && rating === null ? () => pickPurchase((purchaseIndex + 1) % list.length) : submit} disabled={sending || (!existing && shownRating === null)} /></Screen>;
}

const small = { fontFamily: F.body, fontSize: 10, fontWeight: '800' as const, color: C.ink, letterSpacing: .5 };
