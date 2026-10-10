import React from 'react';
import { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Tab bar icons, drawn from the SVGs in the repository's Icon/ folder. Stroke colour follows the tab tint
// (the source files use a fixed dark stroke, which would disappear on the black tab bar).
type IconProps = { color: ColorValue; size?: number };

function Frame({ color, size = 24, children }: IconProps & { children: React.ReactNode }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">{children}</Svg>;
}

// Icon/icon-body.svg
export function BodyIcon(props: IconProps) {
  return <Frame {...props}><Circle cx={12} cy={4.5} r={2} /><Path d="M8 9h8a1 1 0 0 1 1 1v5h-2v6H9v-6H7v-5a1 1 0 0 1 1-1Z" /><Path d="M12 15.5V21" /></Frame>;
}

// Icon/icon-fit.svg
export function FitIcon(props: IconProps) {
  return <Frame {...props}><Path d="M8 3 L3 6 L5 10 L7 9 V20 H17 V9 L19 10 L21 6 L16 3 C16 5 14 6 12 6 C10 6 8 5 8 3 Z" /><Path d="M9.5 13.5 l2 2 l3.5 -4" /></Frame>;
}

// Icon/icon-try-on.svg
export function TryOnIcon(props: IconProps) {
  return <Frame {...props}>
    <Path d="M4.5 8H6l1.2-2.2h4.6L13 8h6.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
    <Path d="M18.5 5V2.8M20.3 5.6l1.4-1.4M16.7 5.6l-1.4-1.4" strokeWidth={1.5} />
    <Path d="M10.4 10.8 8 12.2l.9 1.9.9-.5v4.9h4.4v-4.9l.9.5.9-1.9-2.4-1.4c0 .9-.7 1.5-1.6 1.5s-1.6-.6-1.6-1.5Z" strokeWidth={1.5} />
  </Frame>;
}

// Icon/icon-compare.svg
export function CompareIcon(props: IconProps) {
  return <Frame {...props}><Rect x={2.5} y={6} width={7} height={12} rx={1.5} /><Rect x={14.5} y={6} width={7} height={12} rx={1.5} /><Path d="M12 3v18" strokeDasharray="2 2.6" /></Frame>;
}

// Icon/icon-review.svg
export function ReviewIcon(props: IconProps) {
  return <Frame {...props}><Path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><Path d="M12 7.1l.82 2.27 2.41.08-1.9 1.48.67 2.32-2-1.35-2 1.35.67-2.32-1.9-1.48 2.41-.08Z" /></Frame>;
}
