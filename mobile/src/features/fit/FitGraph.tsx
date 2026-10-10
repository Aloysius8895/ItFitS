import React from 'react';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { FitResult } from './fit';
import { C } from '../ui/Kit';

const y = (score: number) => 10 + (1 - score / 100) * 140;

function smooth(points: { x: number; y: number }[]) {
  let path = `M${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[index - 1] ?? points[index]; const p1 = points[index]; const p2 = points[index + 1]; const p3 = points[index + 2] ?? p2;
    path += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
  }
  return path;
}

export function FitGraph({ results, selected, onSelect }: { results: FitResult[]; selected: string; onSelect: (size: string) => void }) {
  const step = results.length > 1 ? 310 / (results.length - 1) : 0;
  const points = results.map((result, index) => ({ x: 20 + index * step, y: y(result.score) }));
  const selectedIndex = Math.max(0, results.findIndex(result => result.size === selected)), point = points[selectedIndex], score = results[selectedIndex].score;
  return <Svg width="100%" height={170} viewBox="0 0 350 170" accessibilityLabel="Fit score by size chart">
    {points.map((p, index) => <Line key={`grid-${index}`} x1={p.x} x2={p.x} y1="0" y2="160" stroke={C.ink} strokeOpacity={.35} strokeDasharray="2 4" />)}
    {points.length > 1 ? <Path d={smooth(points)} fill="none" stroke={C.ink} strokeWidth={3.5} strokeLinecap="round" /> : null}
    {points.map((p, index) => <Circle key={results[index].size} cx={p.x} cy={p.y} r={index === selectedIndex ? 9 : 4.5} fill={index === selectedIndex ? C.accent : C.ink} stroke={index === selectedIndex ? C.ink : 'none'} strokeWidth={2.5} onPress={() => onSelect(results[index].size)} />)}
    <SvgText x={point.x} y={Math.max(12, point.y - 18)} textAnchor="middle" fontFamily="Archivo" fontWeight="800" fontSize="11" fill={C.ink}>{score}</SvgText>
    <Line x1="0" y1="160" x2="350" y2="160" stroke={C.ink} strokeWidth={1.5} />
  </Svg>;
}
