/** Greyboards colours and type, matching the web app's tokens in apps/web/app/app.css. */
export const colors = {
  white: '#ffffff',
  black: '#000000',

  canvas: '#f4f4f5',
  surface50: '#ffffff',
  surface100: '#ececee',
  surface200: '#dcdcdf',
  surface300: '#c4c5c9',

  ink500: '#727376',
  ink700: '#46474b',
  ink900: '#1e1f22',

  brand50: '#f8eef1',
  brand100: '#efd6dd',
  brand200: '#dcaab7',
  brand300: '#c27b8e',
  brand400: '#a4566a',
  brand500: '#833b4b',
  brand600: '#6e3040',
  brand700: '#582634',
  brand800: '#421c27',

  available: '#1f7a4d',
  held: '#b26a00',
  booked: '#46474b',

  red50: '#fef2f2',
  red200: '#fecaca',
  red600: '#dc2626',
  red700: '#b91c1c',
  red800: '#991b1b',

  emerald50: '#ecfdf5',
  emerald200: '#a7f3d0',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald900: '#064e3b',

  amber50: '#fffbeb',
  amber200: '#fde68a',
  amber700: '#b45309',
  amber900: '#78350f',
} as const

export const fonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'PlusJakartaSans_700Bold',
  displayHeavy: 'PlusJakartaSans_800ExtraBold',
} as const

export const radius = {
  md: 8,
  field: 14,
  lg: 14,
  xl: 22,
  full: 999,
} as const

/** The wine glow of brand panels, from a lit corner into ink, as gradient stops. */
export const brandSweep = [colors.brand400, colors.brand700, colors.ink900] as const

/** Soft shadows that cards and wine buttons rest on, as on the web. */
export const shadows = {
  card: '0 1px 2px rgba(30,31,34,0.05), 0 8px 24px rgba(30,31,34,0.06)',
  raised: '0 1px 2px rgba(30,31,34,0.08), 0 24px 60px rgba(30,31,34,0.18)',
  glow: '0 10px 24px rgba(131,59,75,0.32)',
  hero: '0 16px 36px rgba(88,38,52,0.35)',
} as const

/** White cards on shadows, and filled fields that ring in wine while focused. */
export const surfaces = {
  panel: { borderWidth: 1, borderColor: colors.surface100, borderRadius: radius.xl, backgroundColor: colors.surface50, boxShadow: shadows.card },
  field: { borderWidth: 1.5, borderColor: 'transparent', borderRadius: radius.field, backgroundColor: colors.canvas },
  fieldFocused: { borderColor: colors.brand500, backgroundColor: colors.surface50, boxShadow: '0 0 0 4px rgba(131,59,75,0.12)' },
  backdrop: 'rgba(30,31,34,0.6)',
} as const
