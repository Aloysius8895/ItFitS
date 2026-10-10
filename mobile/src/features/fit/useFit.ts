import { useEffect, useMemo, useState } from 'react';
import { api, FitResponse, SimilarBodies, toApiBody, toApiGarment } from '../api/client';
import { Product } from '../catalog/products';
import { useApp } from '../state/AppState';
import { assessAll, FitResult } from './fit';

const cache = new Map<string, FitResponse>();
const inflight = new Map<string, Promise<FitResponse>>();

function fetchFit(key: string, product: Product, profile: Parameters<typeof api.fit>[1]) {
  let pending = inflight.get(key);
  if (!pending) {
    pending = api.fit(product, profile).then(data => { cache.set(key, data); return data; }).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

export type FitView = {
  results: FitResult[];
  recommended: FitResult;
  resultFor: (size: string) => FitResult;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'OFFLINE';
  note: string;
  similar: SimilarBodies | null;
  source: 'model' | 'local';
  loading: boolean;
};

// Per-size fit from the backend, with the on-device size-chart calculation shown until it answers (or if it can't).
export function useFit(product: Product): FitView {
  const { profile, setOnline } = useApp();
  const local = useMemo(() => assessAll(product, profile), [product, profile]);
  const requestKey = JSON.stringify([toApiGarment(product), toApiBody(profile), profile.preference]);
  const [remote, setRemote] = useState<{ key: string; data: FitResponse } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    if (cache.has(requestKey)) return;
    let alive = true;
    const timer = setTimeout(() => {
      fetchFit(requestKey, product, profile)
        .then(data => { setOnline(true); if (alive) setRemote({ key: requestKey, data }); })
        .catch(() => { setOnline(false); if (alive) setFailedKey(requestKey); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
    // requestKey captures every product/profile field the request sends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const data = cache.get(requestKey) ?? (remote?.key === requestKey ? remote.data : undefined);
  if (data) {
    const recommended = data.sizes.find(s => s.size === data.recommended_size) ?? data.sizes[0];
    return { results: data.sizes, recommended, resultFor: size => data.sizes.find(s => s.size === size) ?? recommended, confidence: data.confidence, note: data.note, similar: data.similar, source: 'model', loading: false };
  }
  return {
    results: local.results, recommended: local.recommended, resultFor: size => local.results.find(s => s.size === size) ?? local.recommended,
    confidence: 'OFFLINE', note: 'Backend offline: verdict from the size chart only on this device.', similar: null, source: 'local', loading: failedKey !== requestKey,
  };
}

export function useSelectedSize(view: FitView) {
  const { selectedSize, setSelectedSize, product } = useApp();
  const size = selectedSize && product.sizes.includes(selectedSize) ? selectedSize : view.recommended.size;
  return [size, setSelectedSize] as const;
}
