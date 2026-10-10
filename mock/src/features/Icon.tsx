import { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// Line icons from the original HTML mock (reference/), 24x24.
const paths = {
  search: ['M20 20l-3.5-3.5'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z'],
  cart: ['M3 4h2.5l2.2 11h10.6L20 7H7'],
  chat: ['M4 5h16v11H9l-5 4z', 'M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01'],
  scan: ['M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12h8'],
  supermarket: ['M5 9h14l-1.5 10h-11z', 'M9 9l3-5 3 5'],
  cashback: ['M9 15l6-6M9.5 9.5h.01M14.5 14.5h.01'],
  budget: ['M4 10l1.5-5h13L20 10M5 10v9h14v-9M4 10h16M10 19v-5h4v5'],
  pay: ['M4 7h16v11H4zM4 11h16M15 15h2'],
  bundle: ['M12 3l8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4'],
  shipping: ['M3 7h11v9H3zM14 10h4l3 3v3h-7z'],
  live: ['M3 7h12v10H3zM15 10.5l6-3v9l-6-3'],
  prizes: ['M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2-4-6-3-4 0M12 7c2-4 6-3 4 0'],
  vouchers: ['M3 8h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4zM14 8v10'],
  more: ['M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z'],
  home: ['M4 11l8-7 8 7v9h-5v-6h-6v6H4z'],
  mall: ['M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2'],
  bell: ['M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4'],
  me: ['M4 21c1-5 15-5 16 0'],
  back: ['M15 5l-7 7 7 7'],
  share: ['M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8'],
  heart: ['M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z'],
  shirt: ['M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z'],
  star: ['M12 3l2.5 5.5L20 9.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1z'],
} as const;

// Circles that some icons need in addition to their paths.
const circles: Partial<Record<keyof typeof paths, [number, number, number][]>> = {
  search: [[11, 11, 7]],
  camera: [[12, 13, 3.5]],
  cart: [[9, 19, 1.5], [17, 19, 1.5]],
  cashback: [[12, 12, 8]],
  shipping: [[7.5, 17.5, 1.5], [17.5, 17.5, 1.5]],
  me: [[12, 8, 4]],
  share: [[6, 12, 2.5], [18, 6, 2.5], [18, 18, 2.5]],
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, color, strokeWidth = 2 }: { name: IconName; size?: number; color: ColorValue; strokeWidth?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {(circles[name] ?? []).map(([cx, cy, r]) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
    {paths[name].map(d => <Path key={d} d={d} />)}
  </Svg>;
}
