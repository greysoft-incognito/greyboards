import { useId } from 'react'
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg'

export type SceneTime = 'day' | 'dusk' | 'night'
export type SceneArt = 'brand' | 'empty' | 'dark'

const SKIES: Record<SceneTime, { sky: [string, string, string]; sun: string; sunX: number; far: string; near: string; ground: string; lane: string; pole: string; glow: number }> = {
  day: { sky: ['#bcd3e6', '#d6e1ea', '#e9eef2'], sun: '#fff6dc', sunX: 290, far: '#aeb8c2', near: '#8d97a2', ground: '#5d6168', lane: '#7a7e85', pole: '#2e3034', glow: 0 },
  dusk: { sky: ['#3d2c4d', '#9c4f5c', '#f0a875'], sun: '#ffd29a', sunX: 258, far: '#6b4659', near: '#47313f', ground: '#2a2229', lane: '#4a3b45', pole: '#1b1418', glow: 0.18 },
  night: { sky: ['#0f1020', '#1b1c34', '#262844'], sun: '#e8e9f5', sunX: 60, far: '#262840', near: '#1a1b2e', ground: '#121320', lane: '#2b2c40', pole: '#08080f', glow: 0.25 },
}

const FACES: Record<SceneArt, { a: string; b: string; ink: string }> = {
  brand: { a: '#833b4b', b: '#f8eef1', ink: '#ffffff' },
  empty: { a: '#e4e4e7', b: '#e4e4e7', ink: '#727376' },
  dark: { a: '#2e2f33', b: '#2e2f33', ink: '#ffffff' },
}

/** A drawn street with a billboard on it, at a time of day, carrying an ad or waiting for one. Matches the web's BoardScene. */
export function BoardScene({ time = 'dusk', art = 'brand', headline = art === 'empty' ? 'Your ad here' : 'Summer is here' }: { time?: SceneTime; art?: SceneArt; headline?: string }) {
  const id = useId().replace(/:/g, '')
  const sky = SKIES[time]
  const face = FACES[art]

  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" accessibilityRole="image" accessibilityLabel={`A billboard at ${time} showing ${headline}`}>
      <Defs>
        <LinearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky.sky[0]} />
          <Stop offset="0.5" stopColor={sky.sky[1]} />
          <Stop offset="1" stopColor={sky.sky[2]} />
        </LinearGradient>
      </Defs>
      <Rect width="400" height="260" fill={`url(#${id}sky)`} />
      <Circle cx={sky.sunX + 44} cy="70" r="44" fill={sky.sun} opacity={0.9} />
      <Path d="M0 190 V150 h22 v-18 h16 v30 h18 v-52 h26 v40 h14 v-24 h22 v44 h12 v-64 h30 v58 h16 v-30 h20 v40 h18 v-80 h24 v76 h14 v-36 h22 v28 h18 v-56 h28 v66 h16 v-22 h24 v190 H0z" fill={sky.far} />
      <Path d="M0 210 V176 h30 v-20 h24 v26 h30 v-34 h20 v40 h40 v-18 h26 v22 h30 v-30 h18 v34 h36 v-26 h24 v30 h34 v-22 h28 v28 h24 v-14 h36 v190 H0z" fill={sky.near} />
      <Rect x="0" y="206" width="400" height="54" fill={sky.ground} />
      <Rect x="0" y="222" width="400" height="5" fill={sky.lane} />
      <Rect x="196" y="140" width="9" height="70" fill={sky.pole} />
      <Rect x="160" y="196" width="80" height="6" rx="2" fill={sky.pole} />
      <Polygon points="80,44 324,30 324,154 80,148" fill="#ffd6aa" opacity={sky.glow} />
      <Polygon points="92,52 312,40 312,146 92,140" fill={sky.pole} />
      <Polygon points="98,58 306,47 306,140 98,134" fill={face.b} />
      <Polygon points="98,58 222,51 222,138 98,134" fill={face.a} />
      <SvgText x="112" y="104" fill={face.ink} fontFamily="PlusJakartaSans_800ExtraBold" fontWeight="800" fontSize="22" letterSpacing={-0.5}>
        {headline}
      </SvgText>
    </Svg>
  )
}
