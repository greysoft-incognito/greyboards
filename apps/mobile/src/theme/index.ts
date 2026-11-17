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
  field: 10,
  lg: 12,
  xl: 16,
  full: 999,
} as const

/** The wine sweep used on the web's brand panels, as gradient stops. */
export const brandSweep = [colors.brand700, colors.brand500] as const

/** Flat containers and fields: firm 1.5px edges, no shadows. */
export const surfaces = {
  panel: { borderWidth: 1.5, borderColor: colors.surface200, borderRadius: radius.xl, backgroundColor: colors.surface50 },
  field: { borderWidth: 1.5, borderColor: colors.surface300, borderRadius: radius.field, backgroundColor: colors.surface50 },
  fieldFocused: { borderColor: colors.brand500, boxShadow: `inset 0 0 0 1px ${colors.brand500}` },
  backdrop: 'rgba(30,31,34,0.6)',
} as const
