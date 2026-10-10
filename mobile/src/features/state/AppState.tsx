import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { BodyProfile, defaultProfile } from '../fit/fit';
import { Review } from '../reviews/types';
import { Size } from '../catalog/products';

type AppState = {
  profile: BodyProfile; setProfile: (value: BodyProfile) => void;
  productId: string; setProductId: (value: string) => void;
  selectedSize: Size; setSelectedSize: (value: Size) => void;
  reviews: Review[]; addReview: (value: Review) => void;
  ready: boolean;
};
const Context = createContext<AppState | null>(null);
const key = 'fitted-demo-state-v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<BodyProfile>(defaultProfile);
  const [productId, setProductId] = useState('merino');
  const [selectedSize, setSelectedSize] = useState<Size>('M');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { AsyncStorage.getItem(key).then(raw => {
    if (raw) { const saved = JSON.parse(raw); setProfile(saved.profile ?? defaultProfile); setProductId(saved.productId ?? 'merino'); setSelectedSize(saved.selectedSize ?? 'M'); setReviews(saved.reviews ?? []); }
  }).catch(() => {}).finally(() => setReady(true)); }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(key, JSON.stringify({ profile, productId, selectedSize, reviews })).catch(() => {}); }, [profile, productId, selectedSize, reviews, ready]);
  const addReview = (value: Review) => setReviews(items => [value, ...items]);
  return <Context.Provider value={{ profile, setProfile, productId, setProductId, selectedSize, setSelectedSize, reviews, addReview, ready }}>{children}</Context.Provider>;
}

export function useApp() { const value = useContext(Context); if (!value) throw new Error('AppProvider missing'); return value; }
