import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '../features/Icon';
import { discount, products } from '../features/products';
import { M } from '../features/theme';

const categories: [IconName, string][] = [['supermarket', 'Supermarket'], ['cashback', 'Daily Cashback'], ['budget', 'Budget Shop'], ['pay', 'Pay Rewards'], ['bundle', 'Bundle Deals'], ['shipping', 'Free Shipping'], ['live', 'Live'], ['prizes', 'Prizes'], ['vouchers', 'Daily Vouchers'], ['more', 'See More']];
const promos = [{ title: 'RM 10 off fashion', cta: 'Claim now ›', bg: M.yellow, fg: M.ink }, { title: 'Hoodie season', cta: 'Shop now ›', bg: M.teal, fg: '#FFFFFF' }, { title: 'New arrivals', cta: 'Sneak peek ›', bg: M.card, fg: M.ink }];
const nav: [IconName, string][] = [['home', 'Discover'], ['prizes', 'Prizes'], ['mall', 'Mall'], ['bell', 'Notifications'], ['me', 'Me']];

export default function Home() {
  const router = useRouter(); const insets = useSafeAreaInsets();
  return <View style={[s.screen, { paddingTop: insets.top }]}>
    <View style={s.frame}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.row}>
            <View style={s.search}><Icon name="search" size={20} color={M.muted} /><TextInput placeholder="Search Mock Store" placeholderTextColor={M.muted} accessibilityLabel="Search products" style={s.searchInput} /></View>
            {(['camera', 'cart', 'chat'] as IconName[]).map(name => <Pressable key={name} accessibilityLabel={name} style={s.iconButton}><Icon name={name} color="#FFFFFF" /></Pressable>)}
          </View>
          <View style={[s.row, { justifyContent: 'space-between', gap: 12 }]}>
            <View style={{ gap: 4, flexShrink: 1 }}>
              <Text style={s.countdown}>3 DAYS TO GO</Text>
              <Text style={s.saleName}>11.11 Mega Sale</Text>
              <Text style={s.saleDates}>1–11 Nov · Up to 50% off fashion</Text>
            </View>
            <Image source={products[0].image} resizeMode="cover" style={s.hero} />
          </View>
        </View>

        <View style={s.wallet}>
          <Pressable accessibilityLabel="Scan code" style={s.scan}><Icon name="scan" size={26} color={M.teal} /></Pressable>
          {[['RM 25.00', 'Top up wallet'], ['120 coins', 'Daily check-in'], ['3', 'Vouchers']].map(([value, label]) => <Pressable key={label} style={s.walletCell}><Text style={s.walletValue}>{value}</Text><Text style={s.walletLabel}>{label}</Text></Pressable>)}
        </View>

        <View style={s.categories}>{categories.map(([icon, label]) => <Pressable key={label} style={s.category}><View style={s.categoryIcon}><Icon name={icon} color={M.teal} /></View><Text style={s.categoryLabel}>{label}</Text></Pressable>)}</View>

        <View style={s.promos}>{promos.map(promo => <Pressable key={promo.title} style={[s.promo, { backgroundColor: promo.bg }]}><Text style={[s.promoTitle, { color: promo.fg }]}>{promo.title}</Text><Text style={[s.promoCta, { color: promo.fg }]}>{promo.cta}</Text></Pressable>)}</View>

        <View style={s.flash}>
          <View style={[s.row, { gap: 10 }]}>
            <Text style={s.flashTitle}>Flash Sale</Text>
            <View accessibilityLabel="Time left" style={[s.row, { gap: 4 }]}>{['02', '15', '40'].map(part => <Text key={part} style={s.timer}>{part}</Text>)}</View>
            <Text style={s.seeAll}>See all deals ›</Text>
          </View>
          <View style={s.grid}>{products.map(product => <Pressable key={product.id} accessibilityRole="link" onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })} style={s.card}>
            <View style={s.cardImage}><Image source={product.image} resizeMode="contain" style={{ width: '100%', height: '100%' }} /><Text style={s.off}>{discount(product)}% OFF</Text></View>
            <Text numberOfLines={2} style={s.cardName}>{product.name}</Text>
            <Text style={s.cardPrice}>RM {product.price}</Text>
          </Pressable>)}</View>
        </View>
      </ScrollView>

      <View style={[s.nav, { paddingBottom: Math.max(insets.bottom - 14, 4) }]}>{nav.map(([icon, label], index) => <Pressable key={label} style={s.navItem}><Icon name={icon} color={index === 0 ? M.teal : M.muted} strokeWidth={index === 0 ? 2.4 : 2} /><Text style={[s.navLabel, { color: index === 0 ? M.teal : M.muted, fontWeight: index === 0 ? '800' : '500' }]}>{label}</Text></Pressable>)}</View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: M.header, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 440, backgroundColor: M.page },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: { backgroundColor: M.header, padding: 16, paddingBottom: 56, gap: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  search: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 14, color: M.ink, minWidth: 0 },
  iconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  countdown: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: M.yellow, color: M.ink, fontSize: 11, fontWeight: '700', letterSpacing: .4, overflow: 'hidden' },
  saleName: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  saleDates: { fontSize: 13, color: M.headerSoft },
  hero: { width: 104, height: 84, borderRadius: 14, backgroundColor: '#FFFFFF' },
  wallet: { marginTop: -36, marginHorizontal: 16, backgroundColor: M.card, borderRadius: 16, flexDirection: 'row', shadowColor: M.teal, shadowOpacity: .1, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  scan: { width: 52, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  walletCell: { flex: 1, minHeight: 64, padding: 8, justifyContent: 'center', gap: 2, borderLeftWidth: 1, borderLeftColor: M.line },
  walletValue: { fontSize: 14, fontWeight: '700', color: M.ink },
  walletLabel: { fontSize: 11, color: M.muted },
  categories: { paddingHorizontal: 12, paddingTop: 16, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  category: { width: '20%', alignItems: 'center', gap: 6 },
  categoryIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: M.card, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center', color: M.ink },
  promos: { paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', gap: 8 },
  promo: { flex: 1, height: 92, padding: 10, borderRadius: 14, justifyContent: 'space-between' },
  promoTitle: { fontSize: 13, fontWeight: '800' },
  promoCta: { fontSize: 11, fontWeight: '700' },
  flash: { marginTop: 16, backgroundColor: M.card, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 },
  flashTitle: { fontSize: 16, fontWeight: '800', color: M.red },
  timer: { paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, backgroundColor: M.ink, color: '#FFFFFF', fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  seeAll: { marginLeft: 'auto', fontSize: 13, fontWeight: '600', color: M.muted },
  grid: { flexDirection: 'row', gap: 8 },
  card: { width: '31.5%', gap: 6 },
  cardImage: { height: 120, borderRadius: 12, backgroundColor: M.page, overflow: 'hidden' },
  off: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: M.red, color: '#FFFFFF', fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  cardName: { fontSize: 12, fontWeight: '500', color: M.ink },
  cardPrice: { fontSize: 13, fontWeight: '800', color: M.red },
  nav: { flexDirection: 'row', backgroundColor: M.card, borderTopWidth: 1, borderTopColor: M.line, paddingTop: 6 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 50 },
  navLabel: { fontSize: 11 },
});
