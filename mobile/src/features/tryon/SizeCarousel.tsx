import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View, ViewStyle } from 'react-native';

type Props = { sizes: string[]; selected: string; onSelect: (size: string) => void; height: number; style?: ViewStyle; renderPage: (size: string) => React.ReactNode };

// Swipe left/right between sizes, one page per size. Stays in sync with `selected` both ways.
export function SizeCarousel({ sizes, selected, onSelect, height, style, renderPage }: Props) {
  const ref = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const page = Math.max(0, sizes.indexOf(selected));

  useEffect(() => { if (width) ref.current?.scrollTo({ x: page * width, animated: true }); }, [page, width]);
  useEffect(() => () => { if (settle.current) clearTimeout(settle.current); }, []);

  // Momentum events are not fired on web, so detect the end of a swipe with a short timer.
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = event.nativeEvent.contentOffset.x;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const index = Math.max(0, Math.min(sizes.length - 1, Math.round(x / Math.max(width, 1))));
      if (sizes[index] !== selected) onSelect(sizes[index]);
    }, 140);
  }

  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[{ height }, style]}>
    {width ? <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} contentOffset={{ x: page * width, y: 0 }}>
      {sizes.map(size => <View key={size} style={{ width, height }}>{renderPage(size)}</View>)}
    </ScrollView> : null}
  </View>;
}
