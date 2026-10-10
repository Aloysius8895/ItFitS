import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../features/Icon';
import { openInItFitS } from '../../features/itfits';
import { discount, findProduct } from '../../features/products';
import { M } from '../../features/theme';

const infoRows = [['Vouchers', 'RM 5 off · min. spend RM 50'], ['Bundle', 'Buy 2, save 10%'], ['Shipping', 'Free · arrives in 2–4 days'], ['Guarantee', '15-day free returns · Card, e-wallet, COD']];

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = findProduct(id); const router = useRouter(); const insets = useSafeAreaInsets();
  const [colour, setColour] = useState(product.colours[0].label);
  const [size, setSize] = useState('M');
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);

  async function tryOn() {
    try { await openInItFitS(product, size); }
    catch {
      const message = 'Could not open ItFitS. Start it with `npm run app` on the same computer.';
      if (Platform.OS === 'web') window.alert(message); else Alert.alert('ItFitS not running', message);
    }
  }

  return <View style={[s.screen, { paddingTop: insets.top }]}>
    <View style={s.frame}>
      <View style={s.header}>
        <Pressable accessibilityLabel="Back to home" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.headerButton}><Icon name="back" color="#FFFFFF" /></Pressable>
        <Text style={s.headerTitle}>Product details</Text>
        <Pressable accessibilityLabel="Share" style={s.headerButton}><Icon name="share" size={22} color="#FFFFFF" /></Pressable>
        <Pressable accessibilityLabel="Cart" style={s.headerButton}><Icon name="cart" color="#FFFFFF" /></Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 96 }} showsVerticalScrollIndicator={false}>
        <View style={[s.section, { gap: 12, paddingTop: 12 }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityLabel={`Try ${product.name} on with ItFitS`} onPress={tryOn} style={s.gallery}>
              <Image source={product.image} resizeMode="contain" style={{ width: '100%', height: '100%', opacity: photo === 0 ? 1 : .85 }} />
              <View style={s.tryBadge}><Icon name="shirt" size={16} color="#FFFFFF" /><Text style={s.tryBadgeText}>Try on · Check my size</Text></View>
              <View style={s.favourite}><Icon name="heart" color={M.red} /></View>
            </Pressable>
            <View style={{ width: 60, gap: 8 }}>{[0, 1, 2].map(index => <Pressable key={index} accessibilityLabel={`Photo ${index + 1}`} onPress={() => setPhoto(index)} style={[s.thumb, { borderWidth: photo === index ? 2 : 1, borderColor: photo === index ? M.teal : M.border }]}><Image source={product.image} resizeMode="contain" style={{ width: '100%', height: '100%', opacity: index === 0 ? 1 : .55 }} /></Pressable>)}</View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={s.name}>{product.name}</Text>
            <View style={[s.row, { gap: 8 }]}><Icon name="star" size={14} color={M.star} /><Text style={s.rating}>{product.rating.toFixed(1)}</Text><Text style={s.meta}>{product.ratings} ratings · {product.sold} sold</Text></View>
          </View>

          <View style={s.priceBox}>
            <Text style={s.price}>RM {product.price}</Text>
            <Text style={s.was}>RM {product.was}</Text>
            <Text style={s.off}>{discount(product)}% OFF</Text>
            <Text style={s.ends}>Ends in 02:15:40</Text>
          </View>
        </View>

        <View style={[s.section, { gap: 16, paddingTop: 16 }]}>
          <View style={{ gap: 8 }}>
            <View style={[s.row, { gap: 8 }]}><Text style={s.label}>Colour</Text><Text style={s.meta}>{colour}</Text></View>
            <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>{product.colours.map(c => { const on = c.label === colour; return <Pressable key={c.label} accessibilityState={{ selected: on }} onPress={() => setColour(c.label)} style={[s.colour, { borderWidth: on ? 2 : 1, borderColor: on ? M.teal : M.border, backgroundColor: on ? M.selectedBg : '#FFFFFF' }]}><View style={[s.swatch, { backgroundColor: c.swatch }]} /><Text style={s.colourLabel}>{c.label}</Text></Pressable>; })}</View>
          </View>

          <View style={{ gap: 8 }}>
            <View style={[s.row, { gap: 8 }]}><Text style={s.label}>Size</Text><Text style={s.meta}>{size}</Text><Text style={s.sizeGuide}>Size guide ›</Text></View>
            <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>{product.sizes.map(label => { const on = label === size; return <Pressable key={label} accessibilityState={{ selected: on }} onPress={() => setSize(label)} style={[s.size, { borderWidth: on ? 2 : 1, borderColor: on ? M.teal : M.border, backgroundColor: on ? M.teal : '#FFFFFF' }]}><Text style={[s.sizeText, { color: on ? '#FFFFFF' : M.ink }]}>{label}</Text></Pressable>; })}</View>
          </View>

          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.label}>Quantity</Text>
            <View style={s.qty}><Pressable accessibilityLabel="Decrease quantity" onPress={() => setQty(n => Math.max(1, n - 1))} style={s.qtyButton}><Text style={s.qtySign}>−</Text></Pressable><Text style={s.qtyValue}>{qty}</Text><Pressable accessibilityLabel="Increase quantity" onPress={() => setQty(n => n + 1)} style={s.qtyButton}><Text style={s.qtySign}>+</Text></Pressable></View>
          </View>
        </View>

        <View style={[s.section, { paddingVertical: 4 }]}>{infoRows.map(([label, value], index) => <Pressable key={label} style={[s.info, index < infoRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: M.line }]}><Text style={s.infoLabel}>{label}</Text><Text style={s.infoValue}>{value}</Text><Text style={s.meta}>›</Text></Pressable>)}</View>
      </ScrollView>

      <Pressable accessibilityRole="button" accessibilityLabel={`Try size ${size} on in ItFitS`} onPress={tryOn} style={[s.tryOn, { bottom: 84 + Math.max(insets.bottom - 14, 0) }]}>
        <Icon name="star" color={M.ink} />
        <Text style={s.tryOnText}>TRY ON</Text>
      </Pressable>

      <View style={[s.bottom, { paddingBottom: 10 + Math.max(insets.bottom - 14, 0) }]}>
        <Pressable accessibilityLabel="Chat with seller" style={s.chat}><Icon name="chat" size={22} color={M.teal} /></Pressable>
        <Pressable style={s.addToCart}><Text style={s.addToCartText}>Add to cart</Text></Pressable>
        <Pressable style={s.buyNow}><Text style={s.buyNowText}>Buy now</Text></Pressable>
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: M.header, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 440, backgroundColor: M.page },
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingLeft: 4, paddingRight: 8, backgroundColor: M.header },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  section: { backgroundColor: M.card, paddingHorizontal: 16, paddingBottom: 16 },
  gallery: { flex: 1, height: 260, borderRadius: 14, backgroundColor: M.page, overflow: 'hidden' },
  tryBadge: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: M.teal },
  tryBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  favourite: { position: 'absolute', top: 4, right: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  thumb: { height: 81, borderRadius: 10, backgroundColor: M.page, overflow: 'hidden' },
  name: { fontSize: 16, fontWeight: '700', color: M.ink },
  rating: { fontSize: 12, fontWeight: '700', color: M.ink },
  meta: { fontSize: 12, color: M.muted },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: M.priceBg, paddingHorizontal: 12, paddingVertical: 10 },
  price: { fontSize: 22, fontWeight: '800', color: M.red },
  was: { fontSize: 13, color: M.muted, textDecorationLine: 'line-through' },
  off: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: M.red, color: '#FFFFFF', fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  ends: { marginLeft: 'auto', fontSize: 11, fontWeight: '600', color: M.muted },
  label: { fontSize: 13, fontWeight: '700', color: M.ink },
  colour: { minHeight: 44, paddingLeft: 8, paddingRight: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#8A9694' },
  colourLabel: { fontSize: 13, fontWeight: '600', color: M.ink },
  sizeGuide: { marginLeft: 'auto', fontSize: 13, fontWeight: '600', color: M.teal },
  size: { width: '18.2%', height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sizeText: { fontSize: 14, fontWeight: '700' },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: M.border, borderRadius: 10 },
  qtyButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  qtySign: { fontSize: 20, fontWeight: '600', color: M.ink },
  qtyValue: { width: 40, textAlign: 'center', fontSize: 15, fontWeight: '700', color: M.ink },
  info: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { width: 76, fontSize: 12, color: M.muted },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '600', color: M.ink },
  tryOn: { position: 'absolute', right: 12, width: 68, height: 68, borderRadius: 34, backgroundColor: M.yellow, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 1, shadowColor: M.teal, shadowOpacity: .28, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  tryOnText: { fontSize: 10, fontWeight: '800', letterSpacing: .2, color: M.ink },
  bottom: { flexDirection: 'row', gap: 8, backgroundColor: M.card, borderTopWidth: 1, borderTopColor: M.line, paddingTop: 10, paddingHorizontal: 12 },
  chat: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: M.border, alignItems: 'center', justifyContent: 'center' },
  addToCart: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: M.teal, alignItems: 'center', justifyContent: 'center' },
  addToCartText: { color: M.teal, fontSize: 14, fontWeight: '700' },
  buyNow: { flex: 1, height: 48, borderRadius: 12, backgroundColor: M.teal, alignItems: 'center', justifyContent: 'center' },
  buyNowText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
