import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const C = { outer: '#D9D2C5', paper: '#E9E3D8', ink: '#161513', orange: '#FF5F0F', muted: '#6E6A62', track: '#D3CCBF' };
export const F = { display: 'Anton', body: 'Archivo' };

export function Screen({ children }: { children: React.ReactNode }) {
  return <ScrollView style={{ backgroundColor: C.outer }} contentContainerStyle={{ alignItems: 'center', flexGrow: 1 }} keyboardShouldPersistTaps="handled"><View style={{ width: '100%', maxWidth: 440, minHeight: '100%', backgroundColor: C.paper, paddingBottom: 100 }}><BrandHeader />{children}</View></ScrollView>;
}

export function BrandHeader() {
  const insets = useSafeAreaInsets();
  return <View style={[styles.header, { paddingTop: 18 + insets.top }]}><Text style={{ fontFamily: F.display, fontSize: 22, color: C.ink }}>FITTED</Text><View style={styles.headerStatus}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.orange }} /><Text style={styles.headerStatusText}>PROFILE 96% COMPLETE</Text></View></View>;
}

export function Content({ children, style }: { children: React.ReactNode; style?: ViewStyle }) { return <View style={[styles.content, style]}>{children}</View>; }
export function Eyebrow({ children, style }: { children: React.ReactNode; style?: TextStyle }) { return <Text style={[styles.eyebrow, style]}>{children}</Text>; }
export function Hero({ children, style }: { children: React.ReactNode; style?: TextStyle }) { return <Text style={[styles.hero, style]}>{children}</Text>; }
export function BodyText({ children, style }: { children: React.ReactNode; style?: TextStyle }) { return <Text style={[styles.body, style]}>{children}</Text>; }

export function SizeSelector({ sizes, selected, onSelect, plain = false }: { sizes: readonly string[]; selected: string; onSelect: (size: string) => void; plain?: boolean }) {
  return <View style={{ flexDirection: 'row', gap: plain ? 0 : 6, marginTop: plain ? 6 : 20 }}>{sizes.map(size => <Pressable accessibilityRole="button" accessibilityLabel={`Select size ${size}`} onPress={() => onSelect(size)} key={size} style={{ flex: 1, height: plain ? 44 : 48, borderRadius: plain ? 0 : 24, borderWidth: plain ? 0 : 1.5, borderColor: C.ink, backgroundColor: !plain && size === selected ? C.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: F.display, fontSize: 20, color: size === selected ? (plain ? C.orange : C.paper) : C.ink }}>{size}</Text></Pressable>)}</View>;
}

export function DataRow({ label, value, valueColor = C.ink }: { label: string; value: string; valueColor?: string }) { return <View style={styles.dataRow}><Text style={styles.dataText}>{label}</Text><Text style={[styles.dataText, { color: valueColor, textAlign: 'right', flexShrink: 1 }]}>{value}</Text></View>; }

export function OrangeCta({ word, subtitle, detail, onPress, disabled }: { word: string; subtitle: string; detail?: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ backgroundColor: disabled ? '#CFC8BB' : C.orange, marginTop: 28, overflow: 'hidden', paddingBottom: 18 }}><Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 132, lineHeight: 116, marginLeft: -6, color: C.ink }}>{word}</Text>{detail ? <BodyText style={{ marginHorizontal: 20, marginTop: 2 }}>{detail}</BodyText> : null}<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 }}><Text style={[styles.dataText, { flex: 1 }]}>{subtitle}</Text><Text style={{ fontFamily: F.body, fontSize: 24, fontWeight: '800', color: C.ink }}>→</Text></View></Pressable>; }

export const styles = StyleSheet.create({ header: { paddingTop: 18, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 }, headerStatusText: { color: C.ink, fontFamily: F.body, fontSize: 11, fontWeight: '700', letterSpacing: .6 }, content: { paddingHorizontal: 20, paddingTop: 22 }, eyebrow: { fontFamily: F.body, fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: .6 }, hero: { fontFamily: F.display, fontSize: 58, lineHeight: 54, color: C.ink, marginTop: 8 }, body: { color: C.ink, fontFamily: F.body, fontSize: 15, lineHeight: 22, fontWeight: '500' }, dataRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.ink, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, dataText: { color: C.ink, fontFamily: F.body, fontSize: 13, fontWeight: '800', letterSpacing: .4 } });
