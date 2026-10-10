import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Product, SizeRow } from '../catalog/products';
import { BodyProfile, FitResult } from '../fit/fit';

// Backend: model/backend (FastAPI). Override with EXPO_PUBLIC_API_URL, e.g. http://192.168.1.20:8000
function resolveBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Deployed (e.g. Vercel, default port): the backend is on the same site under /api. Dev server: port 8000.
    if (!window.location.port) return '';
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  // In Expo Go the dev server's LAN address is also where the backend runs.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:8000`;
}

export const API_URL = resolveBaseUrl();

async function request<T>(path: string, body?: unknown, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : `Server error ${response.status}`);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function toApiBody(profile: BodyProfile) {
  const { sex, height, weight, chest, waist, hip, shoulder, age } = profile;
  return { sex, height, weight, chest, waist, hip, shoulder, age };
}

export function toApiGarment(product: Product) {
  return {
    id: product.id, name: product.name, category: product.category, cut: product.cut, stretch: product.stretch,
    material: product.material, color: product.color,
    size_chart: product.sizes.map(label => ({ label, ...product.chart[label] })),
  };
}

const fitPayload = (product: Product, profile: BodyProfile) => ({ body: toApiBody(profile), garment: toApiGarment(product), preference: profile.preference });

export type SimilarBodies =
  | { available: true; neighbours: number; matched_on: string; note: string; sizes: { size: string; kept_pct: number; fit_rate_pct: number | null; reviews: number }[] }
  | { available: false; reason: string };

export type RulerChart = { id: string; name: string; file: string; kind: 'body_range' | 'garment'; size_chart: ({ label: string } & SizeRow)[] };
export type FitResponse = { recommended_size: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; note: string; model_applied: boolean; measurements_used: string[]; sizes: FitResult[]; similar: SimilarBodies };
export type TryOnResponse = { assessment: FitResult; engine: string; image: string | null; image_status: 'ok' | 'no_api_key' | 'failed' | 'too_small'; image_error: string | null };
// Anchor render: person_image. Any other size: anchor_image + anchor_size (edited so only the fit changes).
export type TryOnImages = { garment_image: string } & ({ person_image: string } | { anchor_image: string; anchor_size: string });
// A product handed over by the mock store (see /api/app/handoff in the backend).
export type Handoff = { id: string; garment_image: string; size: string | null; name: string | null; created_at: number };
export type PurchaseResponse = { prediction_id: string; predicted_rating: number; level: string; label: string };
export type Accuracy = { reviews: number; accuracy_pct: number | null; history_pct: number[]; by_sex: Record<string, { reviews: number; matches: number }> };
export type ReviewResponse = { actual_class: string; predicted_class: string; predicted_rating: number | null; match: boolean; model_version: number; pending_reviews: number; mismatch_rate: number; min_reviews: number; retrain_triggered: boolean; accuracy: Accuracy };
export type StatusResponse = {
  model: { loaded: boolean; name: string | null; version: number; training_rows: number | null; accuracy: number | null; trained_on_sexes: string[] };
  tryon: { provider: string; configured: boolean };
  reviews: { model_version: number; total_reviews: number; pending_reviews: number; mismatch_rate: number; mismatch_threshold: number; min_reviews: number; retraining: boolean };
  accuracy: Accuracy;
};

export const api = {
  status: () => request<StatusResponse>('/api/app/status', undefined, 5000),
  charts: () => request<{ charts: RulerChart[]; errors: { file: string; error: string }[] }>('/api/app/charts', undefined, 8000),
  fit: (product: Product, profile: BodyProfile) => request<FitResponse>('/api/app/fit', fitPayload(product, profile)),
  tryOn: (product: Product, profile: BodyProfile, size: string, images: TryOnImages) =>
    request<TryOnResponse>('/api/app/tryon', { ...fitPayload(product, profile), size, ...images }, 180000),
  latestHandoff: () => request<{ handoff: Handoff | null }>('/api/app/handoff/latest', undefined, 8000),
  purchase: (product: Product, profile: BodyProfile, size: string) => request<PurchaseResponse>('/api/app/purchases', { ...fitPayload(product, profile), size }),
  review: (predictionId: string, rating: number, zones: string[]) => request<ReviewResponse>('/api/app/reviews', { prediction_id: predictionId, rating, zones }),
};
