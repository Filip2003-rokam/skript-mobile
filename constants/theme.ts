// Jedini izvor boja, slova, razmaka i senki. Vrednosti su svetla tema iz demo-ref/theme.css.

export const colors = {
  appBg: '#F6F6F4',
  ink: '#111114',
  onInk: '#FFFFFF',
  text2: '#55555F',
  text3: '#9A9AA5',
  surface: '#FFFFFF',
  surfaceBorder: 'rgba(17, 17, 20, 0.08)',
  hairline: 'rgba(17, 17, 20, 0.07)',
  fillSubtle: 'rgba(17, 17, 20, 0.04)',
  glass: 'rgba(255, 255, 255, 0.8)',
  glassStrong: 'rgba(255, 255, 255, 0.92)',
  scrim: 'rgba(17, 17, 20, 0.28)',
  skriptYellow: '#FFE14D',
  skriptYellowSoft: '#FFF5BF',
  // Zakazan sastanak, isto kao na webu: zelena koja ne zavisi od boje eventa.
  ok: '#2F9E5B',
  okSoft: '#E2F4E8',
  accentRing: 'rgba(255, 225, 77, 0.6)',
  onSignal: '#111114',
  live: '#E5484D',
  destructive: '#D64545',
  avatarBg: '#EEEEF0',
  onPhoto: '#FFFFFF',
  onPhotoDim: 'rgba(255, 255, 255, 0.8)',
  onPhotoGlass: 'rgba(255, 255, 255, 0.15)',
  night: '#111114',
  nightInk: '#F6F6F4',
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  display: 'Fredoka_600SemiBold',
} as const;

export const fontSize = {
  fs11: 11,
  fs12: 12,
  fs13: 13,
  fs15: 15,
  fs17: 17,
  fs19: 19,
  fs20: 20,
  fs22: 22,
  fs30: 30,
} as const;

export const radius = {
  xs: 4,
  control: 18,
  card: 22,
  panel: 28,
  pill: 999,
  logo: 10,
  cover: 24,
  tile: 18,
  mark: 26,
} as const;

export const space = {
  edge: 20,
  gap: 12,
  card: 16,
  tight: 4,
  chip: 12,
  buttonSm: 16,
  buttonMd: 20,
  buttonLg: 24,
} as const;

export const size = {
  border: 1,
  ring: 2,
  dot: 4,
  buttonSm: 44,
  buttonHsm: 36,
  buttonMd: 48,
  buttonLg: 56,
  chip: 32,
  chipSm: 24,
  field: 48,
  segmented: 40,
  logo: 72,
  entryLogo: 96,
  logoSm: 24,
  nav: 56,
  hero: 220,
  emptyIcon: 40,
  emptyText: 260,
  avatar: 36,
  avatarLg: 64,
  qr: 176,
  iconSm: 16,
  iconMd: 18,
  iconLg: 22,
  coverMin: 140,
  speakerTile: 84,
  liveDot: 6,
  tryCardWidth: 164,
  tryCardHeight: 124,
  markBox: 132,
  markAura: 120,
  markTile: 84,
} as const;

export const pressScale = 0.97;
export const pressScaleSurface = 0.98;
export const avatarText = 0.36;
// Logo je slika 433 x 160. Visina je 1.2 puta veličina slova pored kojeg stoji.
export const mark = { height: 1.2, ratio: 433 / 160 } as const;
export const trackingTight = -0.02;
export const trackingWide = 0.6;
export const opacity = { disabled: 0.4, homeIdle: 0.8, cover: 0.35, aura: 0.22, ended: 0.7 } as const;

// Tamni sloj preko naslovne fotografije, da beli tekst bude čitljiv.
export const photoShade = ['rgba(17, 17, 20, 0.15)', 'rgba(17, 17, 20, 0.65)'] as const;
// Pločica govornika: inicijali su 34% visine pločice.
export const tileText = 0.34;

const inkShadow = colors.ink;

export const shadow = {
  card: {
    shadowColor: inkShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  soft: {
    shadowColor: inkShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 4,
  },
  lift: {
    shadowColor: inkShadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 44,
    elevation: 10,
  },
  navigation: {
    shadowColor: inkShadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 36,
    elevation: 8,
  },
} as const;
