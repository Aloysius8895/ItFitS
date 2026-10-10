import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { categories, cuts, Product, SizeRow, Stretch, stretches } from '../features/catalog/products';
import { useApp } from '../features/state/AppState';
import { BodyText, C, Chip, Content, Eyebrow, F, Hero, Label, PillButton, Screen } from '../features/ui/Kit';

const columns = ['chest', 'waist', 'hip', 'shoulder', 'length'] as const;
const colors = ['#161513', '#F2EEE6', '#C6B39A', '#8197A4', '#B6C2A8', '#9B3B2E', '#2F3E5C'];
type DraftRow = { label: string } & Record<(typeof columns)[number], string>;
const emptyRow = (label: string): DraftRow => ({ label, chest: '', waist: '', hip: '', shoulder: '', length: '' });

const input = { borderWidth: 1.5, borderColor: C.ink, borderRadius: 14, padding: 12, fontFamily: F.body, fontSize: 16, color: C.ink } as const;
const cell = { flex: 1, minWidth: 0, borderWidth: 1, borderColor: C.ink, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4, fontFamily: F.body, fontSize: 13, color: C.ink, textAlign: 'center' } as const;

export default function ProductEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { products, addProduct, removeProduct } = useApp();
  const existing = products.find(item => item.id === id && item.custom);
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'TOP');
  const [cut, setCut] = useState(existing?.cut ?? 'REGULAR');
  const [stretch, setStretch] = useState<Stretch>(existing?.stretch ?? 'none');
  const [material, setMaterial] = useState(existing?.material ?? '');
  const [color, setColor] = useState(existing?.color ?? colors[2]);
  const [imageUri, setImageUri] = useState(existing?.imageUri);
  const [rows, setRows] = useState<DraftRow[]>(existing ? existing.sizes.map(label => ({ label, ...Object.fromEntries(columns.map(key => [key, existing.chart[label][key]?.toString() ?? ''])) } as DraftRow)) : ['S', 'M', 'L'].map(emptyRow));

  async function pickImage() {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: .8 });
    if (!picked.canceled) setImageUri(picked.assets[0].uri);
  }
  const update = (index: number, key: keyof DraftRow, value: string) => setRows(items => items.map((row, i) => i === index ? { ...row, [key]: value } : row));

  function save() {
    if (!name.trim()) return Alert.alert('Add a name', 'Give this item a name.');
    const labels = rows.map(row => row.label.trim().toUpperCase());
    if (!rows.length || labels.some(label => !label) || new Set(labels).size !== labels.length) return Alert.alert('Check sizes', 'Every size needs a unique label, such as S, M, L or 30.');
    const chart: Record<string, SizeRow> = {};
    for (const [index, row] of rows.entries()) {
      const entry: Record<string, number> = {};
      for (const key of columns) {
        const raw = row[key].trim();
        if (!raw) continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0 || value > 250) return Alert.alert('Check size chart', `${labels[index]} ${key.toUpperCase()} must be a number of centimetres.`);
        entry[key] = value;
      }
      if (entry.chest === undefined) return Alert.alert('Check size chart', `${labels[index]} needs a chest measurement (garment circumference, cm).`);
      chart[labels[index]] = entry as SizeRow;
    }
    const product: Product = { id: existing?.id ?? `custom-${Date.now()}`, name: name.trim().toUpperCase(), category, cut, stretch, material: material.trim().toUpperCase() || 'UNSPECIFIED FABRIC', color, sizes: labels, chart, imageUri, custom: true };
    addProduct(product);
    router.back();
  }

  function remove() { if (existing) { removeProduct(existing.id); router.back(); } }

  return <Screen><Content><Eyebrow>{existing ? 'EDIT ITEM' : 'NEW ITEM'} · SIZE CHART IN CM</Eyebrow><Hero>{existing ? 'EDIT\nITEM' : 'ADD\nITEM'}</Hero>
    <Pressable onPress={pickImage} style={{ marginTop: 18, height: 180, borderWidth: 1.5, borderColor: C.ink, borderRadius: 22, overflow: 'hidden', backgroundColor: C.track, alignItems: 'center', justifyContent: 'center' }}>{imageUri ? <Image source={{ uri: imageUri }} resizeMode="contain" style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.muted }}>+ PRODUCT PHOTO (OPTIONAL)</Text>}</Pressable>
    <Label style={{ marginTop: 18 }}>NAME</Label><TextInput value={name} onChangeText={setName} placeholder="E.G. OXFORD SHIRT" placeholderTextColor={C.muted} style={input} />
    <Label style={{ marginTop: 16 }}>CATEGORY</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{categories.map(value => <Chip key={value} label={value} active={category === value} onPress={() => setCategory(value)} />)}</View>
    <Label style={{ marginTop: 16 }}>CUT</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{cuts.map(value => <Chip key={value} label={value} active={cut === value} onPress={() => setCut(value)} />)}</View>
    <Label style={{ marginTop: 16 }}>FABRIC STRETCH</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{stretches.map(value => <Chip key={value} label={value.toUpperCase()} active={stretch === value} onPress={() => setStretch(value)} />)}</View>
    <Label style={{ marginTop: 16 }}>FABRIC</Label><TextInput value={material} onChangeText={setMaterial} placeholder="E.G. 95% COTTON · 5% ELASTANE" placeholderTextColor={C.muted} style={input} />
    <Label style={{ marginTop: 16 }}>COLOUR</Label><View style={{ flexDirection: 'row', gap: 10 }}>{colors.map(value => <Pressable key={value} accessibilityLabel={`Colour ${value}`} onPress={() => setColor(value)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: value, borderWidth: color === value ? 3 : 1.5, borderColor: C.ink }} />)}</View>
    <Label style={{ marginTop: 22 }}>SIZE CHART · GARMENT MEASUREMENTS (CM)</Label>
    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>{['SIZE', 'CHEST*', 'WAIST', 'HIP', 'SHLDR', 'LENGTH'].map(title => <Text key={title} style={{ flex: 1, fontFamily: F.body, fontSize: 10, fontWeight: '800', color: C.ink, textAlign: 'center' }}>{title}</Text>)}<View style={{ width: 22 }} /></View>
    {rows.map((row, index) => <View key={index} style={{ flexDirection: 'row', gap: 4, marginBottom: 6, alignItems: 'center' }}><TextInput value={row.label} onChangeText={value => update(index, 'label', value)} autoCapitalize="characters" style={[cell, { fontWeight: '800' }]} />{columns.map(key => <TextInput key={key} value={row[key]} onChangeText={value => update(index, key, value)} keyboardType="decimal-pad" style={cell} />)}<Pressable accessibilityLabel={`Remove size ${row.label}`} onPress={() => setRows(items => items.filter((_, i) => i !== index))} style={{ width: 22, alignItems: 'center' }}><Text style={{ fontFamily: F.body, fontSize: 16, fontWeight: '800', color: C.ink }}>×</Text></Pressable></View>)}
    {rows.length < 12 ? <Pressable onPress={() => setRows(items => [...items, emptyRow('')])} style={{ paddingVertical: 8 }}><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink, textDecorationLine: 'underline' }}>+ ADD SIZE</Text></Pressable> : null}
    <BodyText style={{ fontSize: 12, lineHeight: 17, color: C.muted, marginTop: 6 }}>Use the brand&apos;s garment measurements, not body measurements. Chest is the full circumference (2 × flat width). More columns give a more precise verdict.</BodyText>
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}><PillButton label="CANCEL" onPress={() => router.back()} style={{ flex: 1 }} /><PillButton primary label="SAVE ITEM" onPress={save} style={{ flex: 1 }} /></View>
    {existing ? <PillButton label="DELETE ITEM" onPress={remove} style={{ marginTop: 8 }} /> : null}
    <View style={{ height: 40 }} />
  </Content></Screen>;
}
