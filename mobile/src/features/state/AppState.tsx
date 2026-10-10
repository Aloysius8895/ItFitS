import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, RulerChart, StatusResponse } from '../api/client';
import { Product, products as catalog, Size } from '../catalog/products';
import { BodyProfile, defaultProfile } from '../fit/fit';
import { Purchase, Review } from '../reviews/types';

type AppState = {
  profile: BodyProfile; setProfile: (value: BodyProfile) => void;
  products: Product[]; product: Product; addProduct: (value: Product) => void; removeProduct: (id: string) => void;
  productId: string; setProductId: (value: string) => void;
  // null = follow the recommendation; a picked size never silently changes back.
  selectedSize: Size | null; setSelectedSize: (value: Size | null) => void;
  // Garment photo picked on TRY ON; the AI try-on is drawn only from this photo.
  garmentPhoto: string | null; setGarmentPhoto: (uri: string | null) => void;
  // Last mock-store hand-off already taken, so each product is only picked up once.
  handoffId: string | null; setHandoffId: (id: string) => void;
  purchases: Purchase[]; addPurchase: (value: Purchase) => void;
  reviews: Review[]; addReview: (value: Review) => void;
  status: StatusResponse | null; online: boolean | null; setOnline: (value: boolean) => void; refreshStatus: () => void;
  ready: boolean;
};
const Context = createContext<AppState | null>(null);
const key = 'fitted-state-v2';
const legacyKey = 'fitted-demo-state-v1';
// A ruler/ size chart as an app product. The garment's look comes from the TRY ON photo, not from here.
function chartToProduct(chart: RulerChart): Product {
  return { id: chart.id, name: chart.name, category: 'TOP', material: chart.file, cut: 'REGULAR', color: '#C6B39A', stretch: 'none', sizes: chart.size_chart.map(row => row.label), chart: Object.fromEntries(chart.size_chart.map(({ label, ...row }) => [label, row])) };
}

const demoReviews: Review[] = [
  { productId: 'wide-leg-chinos', purchasedSize: '30', rating: 6, zones: ['LENGTH'], submittedAt: '2026-10-01T00:00:00.000Z' },
  { productId: 'cropped-puffer', purchasedSize: 'L', rating: 4, zones: ['SLEEVES'], submittedAt: '2026-09-20T00:00:00.000Z' },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<BodyProfile>(defaultProfile);
  const [custom, setCustom] = useState<Product[]>([]);
  // Size charts from the backend's ruler/ folder; cached so the app still has them offline.
  const [rulerCharts, setRulerCharts] = useState<Product[]>([]);
  const [productId, setProductIdState] = useState('merino');
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [garmentPhoto, setGarmentPhoto] = useState<string | null>(null);
  const [handoffId, setHandoffId] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [reviews, setReviews] = useState<Review[]>(demoReviews);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = (await AsyncStorage.getItem(key)) ?? (await AsyncStorage.getItem(legacyKey));
      if (!raw) return;
      const saved = JSON.parse(raw);
      setProfile({ ...defaultProfile, ...(saved.profile ?? {}) });
      setCustom(saved.custom ?? []);
      setRulerCharts(current => current.length ? current : saved.rulerCharts ?? []);
      setProductIdState(saved.productId ?? 'merino');
      // A hand-off from the mock store may already have set these before saved state finished loading.
      setSelectedSize(current => current ?? saved.selectedSize ?? null);
      setGarmentPhoto(current => current ?? saved.garmentPhoto ?? null);
      setHandoffId(current => current ?? saved.handoffId ?? null);
      setPurchases(saved.purchases ?? []);
      setReviews(saved.reviews?.length ? saved.reviews : demoReviews);
    })().catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(key, JSON.stringify({ profile, custom, rulerCharts, productId, selectedSize, garmentPhoto, handoffId, purchases, reviews })).catch(() => {}); }, [profile, custom, rulerCharts, productId, selectedSize, garmentPhoto, handoffId, purchases, reviews, ready]);

  const refreshStatus = useCallback(() => {
    api.status().then(value => { setStatus(value); setOnline(true); }).catch(() => setOnline(false));
  }, []);
  useEffect(() => { refreshStatus(); }, [refreshStatus]);
  useEffect(() => { api.charts().then(value => { if (value.charts.length) setRulerCharts(value.charts.map(chartToProduct)); }).catch(() => {}); }, []);

  const products = useMemo(() => [...rulerCharts, ...catalog, ...custom], [rulerCharts, custom]);
  // The first ruler/ chart is the active size chart; the demo catalog is only a fallback before it loads.
  const product = rulerCharts[0] ?? products.find(p => p.id === productId) ?? products[0];
  const setProductId = (id: string) => { setProductIdState(id); setSelectedSize(null); };
  const addProduct = (value: Product) => { setCustom(items => [...items.filter(item => item.id !== value.id), value]); setProductId(value.id); };
  const removeProduct = (id: string) => { setCustom(items => items.filter(item => item.id !== id)); if (id === productId) setProductId('merino'); };
  const addPurchase = (value: Purchase) => setPurchases(items => [value, ...items]);
  const addReview = (value: Review) => setReviews(items => [value, ...items.filter(item => item.productId !== value.productId || item.purchasedSize !== value.purchasedSize)]);

  return <Context.Provider value={{ profile, setProfile, products, product, addProduct, removeProduct, productId, setProductId, selectedSize, setSelectedSize, garmentPhoto, setGarmentPhoto, handoffId, setHandoffId, purchases, addPurchase, reviews, addReview, status, online, setOnline, refreshStatus, ready }}>{children}</Context.Provider>;
}

export function useApp() { const value = useContext(Context); if (!value) throw new Error('AppProvider missing'); return value; }
