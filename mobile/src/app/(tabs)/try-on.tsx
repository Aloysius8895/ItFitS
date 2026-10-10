import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, AppState as RNAppState, Text, View } from 'react-native';
import { api } from '../../features/api/client';
import { downloadAsDataUrl, toDataUrl } from '../../features/api/images';
import { cannotWear } from '../../features/fit/fit';
import { useFit, useSelectedSize } from '../../features/fit/useFit';
import { getSession, resetSession, setSizeRender, updateSession, useSession } from '../../features/tryon/renders';
import { SizeCarousel } from '../../features/tryon/SizeCarousel';
import { useApp } from '../../features/state/AppState';
import { BodyText, C, Content, DataRow, Eyebrow, F, Hero, PillButton, Screen, SizeSelector } from '../../features/ui/Kit';

const fill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;
const overlayText = { color: C.paper, fontFamily: F.body, fontWeight: '800', fontSize: 12, marginTop: 10, textAlign: 'center', paddingHorizontal: 24 } as const;

export default function TryOn() {
  const { profile, setProfile, product, addPurchase, garmentPhoto, setGarmentPhoto, handoffId, setHandoffId, ready } = useApp();
  const fit = useFit(product); const [selectedSize, setSelectedSize] = useSelectedSize(fit); const result = fit.resultFor(selectedSize);
  const [buying, setBuying] = useState(false); const [message, setMessage] = useState<string | null>(null); const [showOriginal, setShowOriginal] = useState(false);
  // One session per person photo + garment photo + body + chart; changing any of them starts fresh.
  const sessionKey = JSON.stringify([product.id, product.chart, garmentPhoto, profile.photoUri, profile.sex, profile.chest, profile.waist, profile.hip, profile.shoulder, profile.height, profile.weight, profile.preference]);
  const session = useSession(sessionKey);
  const anchorSize = session.anchorSize ?? fit.recommended.size;
  const anchorLoading = session.sizes[anchorSize]?.status === 'loading' && !session.anchorImage;
  const tooSmall = (size: string) => cannotWear(fit.resultFor(size));

  async function savePhoto(picked: ImagePicker.ImagePickerResult) { if (!picked.canceled) setProfile({ ...profile, photoUri: picked.assets[0].uri }); }
  async function choosePhoto() { await savePhoto(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: .8 })); }
  // No crop step: the whole garment (hem, sleeves) should stay in the picture.
  async function chooseGarment() { const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .8 }); if (!picked.canceled) { setGarmentNote(null); setGarmentPhoto(picked.assets[0].uri); } }

  // Products from the mock store's TRY ON button. The store posts the product to the backend
  // (POST /api/app/handoff) and switches to this app; TRY ON picks up the newest one whenever it is focused or
  // the app returns to the foreground, because Expo Go does not reliably pass link parameters between projects.
  // ?garment=<photo url> in the link is the fallback when the store could not reach the backend.
  const params = useLocalSearchParams<{ garment?: string; size?: string; name?: string; handoff?: string }>();
  const [garmentNote, setGarmentNote] = useState<string | null>(null);
  const importedFrom = useRef<string | null>(null);
  const checking = useRef(false);

  function applyStoreProduct(photo: string, name?: string | null, size?: string | null) {
    setGarmentPhoto(photo);
    setGarmentNote(`FROM THE STORE · ${(name ?? 'PRODUCT').toUpperCase()}`);
    if (size && product.sizes.includes(size)) setSelectedSize(size);
  }

  async function checkHandoff() {
    if (checking.current) return;
    checking.current = true;
    try {
      const { handoff } = await api.latestHandoff();
      if (handoff && handoff.id !== handoffId) { setHandoffId(handoff.id); applyStoreProduct(handoff.garment_image, handoff.name, handoff.size); }
    } catch {
      // Backend offline: nothing to pick up.
    } finally { checking.current = false; }
  }

  // Wait for saved state (ready) so an already-taken hand-off is not applied twice.
  useFocusEffect(useCallback(() => {
    if (!ready) return;
    checkHandoff();
    const subscription = RNAppState.addEventListener('change', state => { if (state === 'active') checkHandoff(); });
    return () => subscription.remove();
    // checkHandoff reads handoffId; re-subscribe when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, handoffId]));

  useEffect(() => {
    const url = typeof params.garment === 'string' ? params.garment : undefined;
    if (!url || importedFrom.current === url) return;
    importedFrom.current = url;
    (async () => {
      setGarmentNote('LOADING THE PRODUCT FROM THE STORE…');
      try { applyStoreProduct(await downloadAsDataUrl(url), params.name, params.size); }
      catch { setGarmentNote('COULD NOT LOAD THE STORE PHOTO · CHOOSE ONE FROM YOUR ALBUM'); }
    })();
    // Import once per photo URL; name and size come along with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.garment]);

  // Any size other than the anchor is edited from the anchor image, so only the fit changes.
  async function renderSize(size: string) {
    const key = sessionKey; const current = getSession(key); const status = current.sizes[size]?.status;
    if (!current.anchorImage || !current.anchorSize || !current.garmentImage || status === 'loading' || status === 'done') return;
    if (tooSmall(size)) { setSizeRender(key, size, { status: 'too_small' }); return; }
    setSizeRender(key, size, { status: 'loading' });
    try {
      const response = await api.tryOn(product, profile, size, { anchor_image: current.anchorImage, anchor_size: current.anchorSize, garment_image: current.garmentImage });
      setSizeRender(key, size, response.image ? { status: 'done', image: response.image } : { status: response.image_status === 'too_small' ? 'too_small' : 'error', error: response.image_error ?? undefined });
    } catch (error) {
      setSizeRender(key, size, { status: 'error', error: error instanceof Error ? error.message : 'Could not reach the try-on service.' });
    }
  }

  // Decision 1b: render the recommended size first, then the sizes next to it; the rest render when swiped to.
  async function generate() {
    if (!profile.photoUri || !garmentPhoto) return;
    const key = sessionKey; const anchor = fit.recommended.size;
    resetSession(key); setMessage(null); setShowOriginal(false); setSelectedSize(anchor);
    setSizeRender(key, anchor, { status: 'loading' });
    try {
      const [person, garment] = await Promise.all([toDataUrl(profile.photoUri), toDataUrl(garmentPhoto, 512)]);
      updateSession(key, { garmentImage: garment });
      const response = await api.tryOn(product, profile, anchor, { person_image: person, garment_image: garment });
      if (!response.image) {
        setSizeRender(key, anchor, { status: 'error', error: response.image_error ?? undefined });
        setMessage(response.image_status === 'no_api_key' ? `AI try-on is not set up on the server yet. ${response.image_error}` : `The AI image could not be made: ${response.image_error}`);
        return;
      }
      updateSession(key, { anchorSize: anchor, anchorImage: response.image, engine: response.engine });
      setSizeRender(key, anchor, { status: 'done', image: response.image });
      const index = product.sizes.indexOf(anchor);
      for (const size of [product.sizes[index - 1], product.sizes[index + 1]]) if (size) renderSize(size);
    } catch (error) {
      setSizeRender(key, anchor, { status: 'error', error: error instanceof Error ? error.message : undefined });
      setMessage(`Could not reach the try-on service. ${error instanceof Error ? error.message : ''}`);
    }
  }

  // Swiping to a size that has not been rendered yet renders it on demand.
  useEffect(() => {
    if (session.anchorImage && !session.sizes[selectedSize]) renderSize(selectedSize);
    // renderSize reads the latest session from the store; re-run only when the page or anchor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSize, session.anchorImage, sessionKey]);

  async function buy() {
    setBuying(true); setMessage(null);
    const base = { productId: product.id, name: product.name, size: selectedSize, purchasedAt: new Date().toISOString() };
    try {
      const response = await api.purchase(product, profile, selectedSize);
      addPurchase({ ...base, id: response.prediction_id, predictionId: response.prediction_id, predictedRating: response.predicted_rating });
    } catch {
      // Offline: keep the purchase on the device; its review cannot train the model.
      addPurchase({ ...base, id: `local-${base.purchasedAt}`, predictedRating: result.predicted_rating });
    } finally { setBuying(false); }
    router.push('/reviews');
  }

  function page(size: string) {
    const verdict = fit.resultFor(size); const render = session.sizes[size]; const small = cannotWear(verdict);
    const image = !showOriginal && render?.status === 'done' ? render.image : null;
    const reasons = verdict.zones.filter(zone => zone.off && zone.display).map(zone => `${zone.name.toLowerCase()} ${zone.display!.toLowerCase()}`).join(', ');
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.track }}>
      {image ? <Image source={{ uri: image }} resizeMode="cover" style={fill} /> : profile.photoUri ? <Image source={{ uri: profile.photoUri }} resizeMode="cover" style={[fill, { opacity: small ? .3 : 1 }]} /> : <View style={{ alignItems: 'center', padding: 24 }}><View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: C.muted }} /><View style={{ width: 100, height: 160, borderWidth: 2, borderColor: C.muted, borderRadius: 35, marginTop: 8 }} /><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.muted, textAlign: 'center', marginTop: 18 }}>TAKE OR CHOOSE A FULL-BODY PHOTO</Text></View>}
      <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}><View style={{ backgroundColor: C.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }}><Text style={{ color: C.paper, fontFamily: F.body, fontSize: 12, fontWeight: '800' }}>SIZE {size} · {verdict.label} · FIT {verdict.score}</Text></View>{size === fit.recommended.size ? <View style={{ backgroundColor: C.accent, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ color: C.ink, fontFamily: F.body, fontSize: 12, fontWeight: '800' }}>RECOMMENDED</Text></View> : null}</View>
      {small ? <View style={{ backgroundColor: C.paper, borderWidth: 1.5, borderColor: C.ink, borderRadius: 18, padding: 18, marginHorizontal: 28, alignItems: 'center' }}><Text style={{ fontFamily: F.display, fontSize: 30, color: C.ink }}>TOO SMALL FOR YOU</Text><Text style={{ fontFamily: F.body, fontSize: 13, fontWeight: '700', color: C.ink, textAlign: 'center', marginTop: 8 }}>Size {size} won&apos;t fit{reasons ? ` (${reasons})` : ''}, so no try-on is generated. Try {fit.recommended.size}.</Text></View>
        : render?.status === 'loading' ? <View style={[fill, { backgroundColor: '#0006', alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={C.paper} size="large" /><Text style={overlayText}>RENDERING SIZE {size}…{size === anchorSize ? ' UP TO A MINUTE' : ''}</Text></View>
        : !render && anchorLoading ? <View style={[fill, { backgroundColor: '#0004', alignItems: 'center', justifyContent: 'center' }]}><Text style={overlayText}>RENDERS AFTER SIZE {anchorSize}</Text></View>
        : render?.status === 'error' ? <Pressable onPress={() => size === anchorSize && !session.anchorImage ? generate() : renderSize(size)} style={[fill, { backgroundColor: '#0007', alignItems: 'center', justifyContent: 'center' }]}><Text style={overlayText}>COULD NOT RENDER SIZE {size}{render.error ? `\n${render.error.slice(0, 140)}` : ''}{'\n\n'}TAP TO RETRY</Text></Pressable> : null}
      {!small ? <View style={{ position: 'absolute', bottom: 10, backgroundColor: C.paper, paddingHorizontal: 8, paddingVertical: 4 }}><Text style={{ fontFamily: F.body, fontSize: 10, fontWeight: '800', color: C.ink }}>{image ? `AI-GENERATED · ${session.engine?.toUpperCase() ?? ''} · NOT A GUARANTEE OF REAL FIT` : profile.photoUri ? (session.anchorImage ? 'ORIGINAL PHOTO' : 'ORIGINAL PHOTO · TAP GENERATE FOR AI TRY-ON') : 'NO PHOTO YET'}</Text></View> : null}
    </View>;
  }

  const anyRendered = Object.values(session.sizes).some(render => render.status === 'done');
  return <Screen><Content style={{ paddingTop: 10 }}><Eyebrow>VIRTUAL TRY-ON · REFERENCE ONLY</Eyebrow><Hero style={{ marginTop: -8, marginBottom: -8 }}>ON YOU</Hero>
    <SizeCarousel sizes={product.sizes} selected={selectedSize} onSelect={setSelectedSize} height={440} renderPage={page} style={{ marginTop: 18, borderWidth: 1.5, borderColor: C.ink, borderRadius: 22, overflow: 'hidden' }} />
    <SizeSelector sizes={product.sizes} selected={selectedSize} onSelect={setSelectedSize} />
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 }}>{product.sizes.map(size => <View key={size} style={{ width: size === selectedSize ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: size === selectedSize ? C.ink : tooSmall(size) ? C.disabled : C.muted }} />)}</View>
    <Text style={{ fontFamily: F.body, fontSize: 11, fontWeight: '800', color: C.muted, textAlign: 'center', marginTop: 6 }}>← SWIPE TO COMPARE SIZES →</Text>
    {anyRendered ? <Pressable onPress={() => setShowOriginal(value => !value)} style={{ alignSelf: 'center', marginTop: 8 }}><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink, textDecorationLine: 'underline' }}>{showOriginal ? 'SHOW AI TRY-ON' : 'SHOW MY ORIGINAL PHOTO'}</Text></Pressable> : null}
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}><PillButton primary={!profile.photoUri} label={profile.photoUri ? 'RETAKE' : 'TAKE PHOTO'} onPress={() => router.push('/camera')} style={{ flex: 1 }} /><PillButton label="FROM ALBUM" onPress={choosePhoto} style={{ flex: 1 }} /></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, borderWidth: 1.5, borderColor: C.ink, borderRadius: 22, padding: 8 }}>
      <Pressable onPress={chooseGarment} accessibilityLabel="Choose garment photo" style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden', backgroundColor: C.paper, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>{garmentPhoto ? <Image source={{ uri: garmentPhoto }} resizeMode="contain" style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontFamily: F.body, fontSize: 22, fontWeight: '800', color: C.ink }}>+</Text>}</Pressable>
      <Pressable onPress={chooseGarment} style={{ flex: 1 }}><Text style={{ fontFamily: F.body, fontSize: 13, fontWeight: '800', color: C.ink }}>{garmentPhoto ? 'CHANGE GARMENT PHOTO' : 'CHOOSE GARMENT TO TRY ON'}</Text><Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 11, fontWeight: '700', color: C.muted, marginTop: 3 }}>{garmentNote ?? (garmentPhoto ? 'THE AI USES ONLY THIS PHOTO' : 'FROM YOUR ALBUM · NEEDED FOR AI TRY-ON')}</Text></Pressable>
      {garmentPhoto ? <Pressable onPress={() => { setGarmentNote(null); setGarmentPhoto(null); }} accessibilityLabel="Remove garment photo" style={{ paddingHorizontal: 10 }}><Text style={{ fontFamily: F.body, fontSize: 18, fontWeight: '800', color: C.ink }}>×</Text></Pressable> : null}
    </View>
    <Pressable onPress={() => router.push('/')} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingVertical: 6 }}><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink }}>PERSON · {profile.height} CM · {profile.weight} KG · SHOULDER {profile.shoulder} CM</Text><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink, textDecorationLine: 'underline' }}>EDIT</Text></Pressable>
    <PillButton primary={!!profile.photoUri && !!garmentPhoto} disabled={!profile.photoUri || !garmentPhoto || anchorLoading} label={session.anchorImage ? 'START OVER' : anchorLoading ? `RENDERING SIZE ${anchorSize}…` : `GENERATE AI TRY-ON · STARTS AT ${fit.recommended.size}`} onPress={generate} style={{ marginTop: 8 }} />
    {message ? <BodyText style={{ fontSize: 12, lineHeight: 17, color: C.alert, marginTop: 8 }}>{message}</BodyText> : session.anchorImage ? null : <BodyText style={{ fontSize: 12, lineHeight: 17, color: C.muted, marginTop: 8 }}>{!profile.photoUri ? 'Take or choose a full-body photo of the person first.' : !garmentPhoto ? 'Choose the garment photo to try on.' : 'The recommended size renders first, then the sizes next to it.'}</BodyText>}
    <View style={{ borderTopWidth: 1.5, borderColor: C.ink, marginTop: 20 }}>{result.zones.map(zone => <DataRow key={zone.name} label={zone.name} value={zone.display ? `${zone.word} · ${zone.display}` : `${zone.word} · ${zone.ease_cm > 0 ? '+' : ''}${zone.ease_cm} CM`} valueColor={zone.off ? C.alert : C.muted} />)}</View>
    <PillButton primary disabled={buying} label={buying ? 'SAVING…' : `I BOUGHT SIZE ${selectedSize}`} onPress={buy} style={{ marginTop: 18 }} />
  </Content></Screen>;
}
