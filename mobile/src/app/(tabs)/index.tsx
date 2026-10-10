import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BodyProfile, buildLabel, preferences, Sex } from '../../features/fit/fit';
import { useApp } from '../../features/state/AppState';
import { BodyText, C, Chip, Content, DataRow, Eyebrow, F, Hero, Label, Screen } from '../../features/ui/Kit';

type Field = { key: 'height' | 'weight' | 'chest' | 'waist' | 'hip' | 'shoulder' | 'age'; label: string; unit: string; min: number; max: number; optional?: boolean };
const fields: Field[] = [
  { key: 'height', label: 'HEIGHT', unit: 'CM', min: 100, max: 230 }, { key: 'weight', label: 'WEIGHT', unit: 'KG', min: 25, max: 250 },
  { key: 'chest', label: 'CHEST', unit: 'CM', min: 50, max: 180 }, { key: 'waist', label: 'WAIST', unit: 'CM', min: 40, max: 180 },
  { key: 'hip', label: 'HIP', unit: 'CM', min: 50, max: 190 }, { key: 'shoulder', label: 'SHOULDER', unit: 'CM', min: 25, max: 70 },
  { key: 'age', label: 'AGE', unit: 'YEARS', min: 13, max: 100, optional: true },
];
const sexes: [Sex, string][] = [['female', 'WOMAN'], ['male', 'MAN']];

export default function Body() {
  const { profile, setProfile } = useApp();
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState<Record<string, string>>({});
  function openEditor() { setDraft(Object.fromEntries(fields.map(field => [field.key, profile[field.key] === undefined ? '' : String(profile[field.key])]))); setEditing(true); }
  function save() {
    const next: BodyProfile = { ...profile };
    for (const field of fields) {
      const raw = (draft[field.key] ?? '').trim();
      if (field.optional && raw === '') { next[field.key] = undefined as never; continue; }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < field.min || value > field.max) { Alert.alert('Check measurement', `${field.label} must be between ${field.min} and ${field.max}.`); return; }
      next[field.key] = value;
    }
    setProfile(next); setEditing(false);
  }
  return <Screen><Content style={{ paddingTop: 10 }}><Eyebrow>YOUR MEASUREMENTS + PREFERENCES</Eyebrow><Hero style={{ marginTop: -8, marginBottom: -8 }}>BODY</Hero>
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>{([['HEIGHT', profile.height, 'CM'], ['WEIGHT', profile.weight, 'KG']] as const).map(([label, value, unit]) => <Pressable key={label} onPress={openEditor} style={{ flex: 1, borderWidth: 1.5, borderColor: C.ink, borderRadius: 22, padding: 16 }}><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink }}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 44, color: C.ink, marginTop: 4 }}>{value}<Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '700', color: C.ink }}> {unit}</Text></Text></Pressable>)}</View>
    <Label style={{ marginTop: 20 }}>SIZE FOR</Label><View style={{ flexDirection: 'row', gap: 8 }}>{sexes.map(([value, label]) => <Chip key={value} label={label} active={profile.sex === value} onPress={() => setProfile({ ...profile, sex: value })} />)}</View>
    <Label style={{ marginTop: 16 }}>I LIKE MY CLOTHES</Label><View style={{ flexDirection: 'row', gap: 6 }}>{preferences.map(value => <Chip compact key={value} label={value.toUpperCase()} active={profile.preference === value} onPress={() => setProfile({ ...profile, preference: value })} />)}</View>
    <View style={{ marginTop: 12, borderTopWidth: 1.5, borderColor: C.ink }}><Pressable onPress={openEditor}>{fields.slice(2).map(field => <DataRow key={field.key} label={field.label} value={profile[field.key] === undefined ? 'ADD' : `${profile[field.key]} ${field.unit}`} />)}<DataRow label="BUILD" value={buildLabel(profile)} /></Pressable></View>
    <BodyText style={{ marginTop: 14, fontSize: 13, lineHeight: 19, color: C.muted }}>Measure over light clothing. Tap any value to correct it.</BodyText>
  </Content>
  <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }}><ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, backgroundColor: C.paper, maxHeight: '85%' }} contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 12 }}><Hero>EDIT BODY</Hero>{fields.map(field => <View key={field.key}><Text style={{ fontFamily: F.body, fontSize: 12, fontWeight: '800', color: C.ink, marginBottom: 6 }}>{field.label} · {field.unit}{field.optional ? ' · OPTIONAL' : ''}</Text><TextInput value={draft[field.key]} onChangeText={value => setDraft(old => ({ ...old, [field.key]: value }))} keyboardType="decimal-pad" style={{ borderWidth: 1.5, borderColor: C.ink, borderRadius: 14, padding: 12, fontFamily: F.body, fontSize: 18, color: C.ink }} /></View>)}<Pressable onPress={save} style={{ backgroundColor: C.ink, borderWidth: 1.5, borderRadius: 24, borderColor: C.ink, padding: 16, alignItems: 'center' }}><Text style={{ fontFamily: F.body, fontWeight: '800', color: C.paper }}>SAVE MEASUREMENTS</Text></Pressable><Pressable onPress={() => setEditing(false)} style={{ alignItems: 'center', padding: 10 }}><Text style={{ fontFamily: F.body, fontWeight: '800', color: C.ink }}>CANCEL</Text></Pressable></ScrollView></View></Modal></Screen>;
}
