/**
 * B2S Design System — Design Tokens (TypeScript)
 * Version: 1.0.0
 *
 * Usage:
 *   import { tokens, lightTheme, darkTheme, b2sTheme } from './tokens';
 *   // or for Tailwind:
 *   import { tailwindExtend } from './tokens';
 */

// ============================================================
// CORE PRIMITIVES
// ============================================================

export const color = {
  blue: {
    600: '#0077b6',
    500: '#0096c7',
    400: '#00b4d8',
    300: '#48cae4',
    200: '#90e0ef',
    100: '#caf0f8',
    50:  '#e8f7fa',
  },
  green: {
    600: '#059669',
    500: '#10b981',
    400: '#34d399',
    100: '#d1fae5',
    50:  '#ecfdf5',
  },
  red: {
    600: '#dc2626',
    500: '#ef4444',
    400: '#f87171',
    100: '#fee2e2',
    50:  '#fef2f2',
  },
  amber: {
    600: '#d97706',
    500: '#f59e0b',
    400: '#fbbf24',
    100: '#fef3c7',
    50:  '#fffbeb',
  },
  neutral: {
    900: '#0f1419',
    800: '#1a2028',
    700: '#1a2b3c',
    600: '#242d38',
    500: '#2d3748',
    400: '#5c6b7a',
    300: '#8899a8',
    200: '#9aa5b1',
    100: '#e2e8f0',
    75:  '#f0f4f7',
    50:  '#f7f9fb',
    0:   '#ffffff',
  },
  b2s: {
    warmRed: {
      600: '#c41e1e',
      500: '#f93f26',
      400: '#ff5c45',
      100: '#ffe5e2',
      50:  '#fff5f4',
    },
    petroGray: {
      600: '#3d4448',
      500: '#5a6268',
      400: '#6c757d',
      100: '#e2e5e7',
      50:  '#f4f5f6',
    },
  },
} as const;

export const font = {
  family: {
    base: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'SF Mono', ui-monospace, monospace",
  },
  size: {
    xs:   '11px',
    sm:   '12px',
    md:   '13px',
    base: '14px',
    body: '15px',
    lg:   '16px',
    xl:   '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '28px',
    '5xl': '32px',
  },
  weight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },
  lineHeight: {
    tight:   1,
    snug:    1.3,
    normal:  1.6,
    relaxed: 1.7,
  },
  letterSpacing: {
    normal: '0',
    wide:   '0.5px',
  },
} as const;

export const space = {
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radius = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '20px',
  full: '9999px',
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 12px rgba(0,0,0,0.08)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
} as const;

export const duration = {
  fast:   '150ms',
  normal: '200ms',
  slow:   '300ms',
} as const;

export const sizing = {
  icon: { sm: '14px', md: '18px', base: '20px', lg: '22px', xl: '24px', '2xl': '28px' },
  layout: { sidebarWidth: '280px', headerHeight: '70px', contentMaxWidth: '1400px' },
  component: {
    statIcon:      '56px',
    alertIcon:     '44px',
    sectionIcon:   '40px',
    logoIcon:      '44px',
    toggleWidth:   '48px',
    toggleHeight:  '28px',
    toggleKnob:    '22px',
    zoneBadgeH:    '28px',
    zoneBadgeMinW: '40px',
  },
} as const;

export const borderWidth = {
  default: '1px',
  thick:   '2px',
  accent:  '4px',
} as const;


// ============================================================
// ICONOGRAPHY — Lucide Icons (https://lucide.dev)
// ============================================================

export const iconography = {
  /** Library metadata */
  library: 'lucide',
  version: '>=0.460',
  packages: {
    react:    'lucide-react',
    vue:      'lucide-vue-next',
    svelte:   'lucide-svelte',
    vanilla:  'lucide',
    static:   'lucide-static',
  },

  /** SVG defaults — these match the existing B2S icon style exactly */
  defaults: {
    viewBox:        '0 0 24 24',
    strokeWidth:    2,
    strokeLinecap:  'round' as const,
    strokeLinejoin: 'round' as const,
    fill:           'none' as const,
  },

  /** Size scale — maps to sizing.icon tokens */
  size: {
    sm:   sizing.icon.sm,     // 14px — badges
    md:   sizing.icon.md,     // 18px — buttons
    base: sizing.icon.base,   // 20px — nav items
    lg:   sizing.icon.lg,     // 22px — section headers
    xl:   sizing.icon.xl,     // 24px — standalone, alerts
    '2xl': sizing.icon['2xl'],// 28px — stat cards
  },

  /** Semantic colors for icons */
  color: {
    default:   color.neutral[400],
    muted:     color.neutral[200],
    primary:   color.blue[600],
    success:   color.green[600],
    warning:   color.amber[500],
    danger:    color.red[600],
    onPrimary: '#ffffff',
  },

  /**
   * Icon name mapping — canonical Lucide names per UI concept.
   * Import example: import { LayoutDashboard, MapPin } from 'lucide-react';
   */
  mapping: {
    navigation: {
      dashboard:    'layout-dashboard',
      zones:        'map-pin',
      valves:       'circle-dot',
      schedules:    'calendar-clock',
      history:      'history',
      analytics:    'trending-up',
      settings:     'settings',
      alerts:       'bell-ring',
      users:        'users',
      help:         'circle-help',
      menu:         'menu',
      search:       'search',
    },
    domain: {
      water:        'droplets',
      sensor:       'activity',
      temperature:  'thermometer-sun',
      humidity:     'cloud-drizzle',
      pressure:     'gauge',
      flow:         'waves',
      pump:         'power',
      battery:      'battery-medium',
      signal:       'wifi',
      waste:        'trash-2',
      recycle:      'recycle',
      rfid:         'scan-line',
      truck:        'truck',
      container:    'package',
    },
    status: {
      success:      'circle-check',
      warning:      'triangle-alert',
      error:        'circle-x',
      info:         'info',
      online:       'circle',
      offline:      'circle-off',
      loading:      'loader-circle',
    },
    action: {
      add:          'plus',
      edit:         'pencil',
      delete:       'trash-2',
      save:         'save',
      close:        'x',
      filter:       'sliders-horizontal',
      export:       'download',
      refresh:      'refresh-cw',
      expand:       'maximize-2',
      collapse:     'minimize-2',
      chevronDown:  'chevron-down',
      chevronRight: 'chevron-right',
      externalLink: 'external-link',
      copy:         'copy',
      logout:       'log-out',
    },
    theme: {
      light:        'sun',
      dark:         'moon',
      system:       'monitor',
    },
    product: {
      bee2waste:    'recycle',
      bee2water:    'droplets',
      bee2crop:     'sprout',
      bee2green:    'leafy-green',
      bee2lighting: 'lightbulb',
      bee2energy:   'zap',
    },
  },

  /** Product icon container specs */
  productIcon: {
    background:   '#f93f26',
    foreground:   '#ffffff',
    viewBox:      '0 0 200 200',
    borderRadius: 40,
    iconScale:    6.25,
    iconOffset:   25,
    strokeWidth:  2,
  },
} as const;

/** Utility type: all mapped icon names */
export type B2SIconName = typeof iconography.mapping[keyof typeof iconography.mapping][keyof typeof iconography.mapping[keyof typeof iconography.mapping]];

/** Product definitions with metadata */
export const products = {
  bee2waste:    { name: 'Bee2Waste',    description: 'Gestão de Recolha de Resíduos',                icon: 'recycle'     as const, lucideImport: 'Recycle' },
  bee2water:    { name: 'Bee2Water',    description: 'Gestão de Consumo de Água',                    icon: 'droplets'    as const, lucideImport: 'Droplets' },
  bee2crop:     { name: 'Bee2Crop',     description: 'Rega e Fertilização Inteligente',              icon: 'sprout'      as const, lucideImport: 'Sprout' },
  bee2green:    { name: 'Bee2Green',    description: 'Gestão de Água e Espaços Verdes',              icon: 'leafy-green' as const, lucideImport: 'LeafyGreen' },
  bee2lighting: { name: 'Bee2Lighting', description: 'Gestão de Iluminação Pública',                 icon: 'lightbulb'   as const, lucideImport: 'Lightbulb' },
  bee2energy:   { name: 'Bee2Energy',   description: 'Gestão de Eficiência Energética',              icon: 'zap'         as const, lucideImport: 'Zap' },
} as const;

export type B2SProductKey = keyof typeof products;


// ============================================================
// SEMANTIC THEMES
// ============================================================

export const lightTheme = {
  bg: {
    body:      color.neutral[75],
    sidebar:   color.neutral[0],
    card:      color.neutral[0],
    secondary: color.neutral[50],
    hover:     color.neutral[75],
  },
  text: {
    primary:   color.neutral[700],
    secondary: color.neutral[400],
    muted:     color.neutral[200],
  },
  border: color.neutral[100],
  primary: {
    default: color.blue[500],
    hover:   color.blue[600],
    accent:  color.blue[400],
    subtle:  color.blue[100],
    surface: color.blue[50],
  },
  success: {
    default: color.green[500],
    hover:   color.green[600],
    subtle:  color.green[100],
    surface: color.green[50],
  },
  danger: {
    default: color.red[500],
    hover:   color.red[600],
    subtle:  color.red[100],
    surface: color.red[50],
  },
  warning: {
    default: color.amber[500],
    hover:   color.amber[600],
    subtle:  color.amber[100],
    surface: color.amber[50],
  },
  shadow: {
    sm: shadow.sm,
    md: shadow.md,
    lg: shadow.lg,
  },
} as const;

export const darkTheme = {
  bg: {
    body:      color.neutral[900],
    sidebar:   color.neutral[800],
    card:      color.neutral[800],
    secondary: color.neutral[600],
    hover:     color.neutral[500],
  },
  text: {
    primary:   '#e8edf2',
    secondary: '#8899a8',
    muted:     color.neutral[400],
  },
  border: color.neutral[500],
  primary: {
    default: color.blue[500],
    hover:   color.blue[600],
    accent:  color.blue[400],
    subtle:  'rgba(0, 150, 199, 0.15)',
    surface: 'rgba(0, 150, 199, 0.1)',
  },
  success: {
    default: color.green[500],
    hover:   color.green[600],
    subtle:  'rgba(16, 185, 129, 0.15)',
    surface: 'rgba(16, 185, 129, 0.1)',
  },
  danger: {
    default: color.red[500],
    hover:   color.red[600],
    subtle:  'rgba(239, 68, 68, 0.15)',
    surface: 'rgba(239, 68, 68, 0.1)',
  },
  warning: {
    default: color.amber[500],
    hover:   color.amber[600],
    subtle:  'rgba(245, 158, 11, 0.15)',
    surface: 'rgba(245, 158, 11, 0.1)',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.2)',
    md: '0 4px 12px rgba(0,0,0,0.3)',
    lg: '0 8px 24px rgba(0,0,0,0.4)',
  },
} as const;

export const b2sOverrides = {
  primary: {
    default: color.b2s.warmRed[500],
    hover:   color.b2s.warmRed[600],
    accent:  color.b2s.warmRed[400],
    subtle:  color.b2s.warmRed[100],
    surface: color.b2s.warmRed[50],
  },
  success: {
    default: color.b2s.petroGray[500],
    hover:   color.b2s.petroGray[600],
    accent:  color.b2s.petroGray[400],
    subtle:  color.b2s.petroGray[100],
    surface: color.b2s.petroGray[50],
  },
} as const;


// ============================================================
// COMPOSITE TYPOGRAPHY TOKENS
// ============================================================

export const typography = {
  h1:       { fontSize: font.size['4xl'], fontWeight: font.weight.bold,     lineHeight: font.lineHeight.snug },
  h2:       { fontSize: font.size['3xl'], fontWeight: font.weight.bold,     lineHeight: font.lineHeight.snug },
  h3:       { fontSize: font.size.xl,     fontWeight: font.weight.semibold, lineHeight: font.lineHeight.snug },
  h4:       { fontSize: font.size.lg,     fontWeight: font.weight.semibold, lineHeight: font.lineHeight.snug },
  body:     { fontSize: font.size.body,   fontWeight: font.weight.regular,  lineHeight: font.lineHeight.normal },
  label:    { fontSize: font.size.base,   fontWeight: font.weight.medium,   lineHeight: font.lineHeight.normal },
  caption:  { fontSize: font.size.md,     fontWeight: font.weight.regular,  lineHeight: font.lineHeight.normal },
  overline: { fontSize: font.size.xs,     fontWeight: font.weight.semibold, lineHeight: font.lineHeight.normal, letterSpacing: font.letterSpacing.wide, textTransform: 'uppercase' as const },
  stat:     { fontSize: font.size['5xl'], fontWeight: font.weight.bold,     lineHeight: font.lineHeight.tight },
} as const;


// ============================================================
// TAILWIND CSS EXTEND HELPER
// ============================================================

export const tailwindExtend = {
  colors: {
    blue:   color.blue,
    green:   color.green,
    red:     color.red,
    amber:   color.amber,
    neutral: color.neutral,
    b2s: {
      'warm-red':   color.b2s.warmRed,
      'petro-gray': color.b2s.petroGray,
    },
    icon: iconography.color,
  },
  fontFamily: {
    sans: [font.family.base],
    mono: [font.family.mono],
  },
  fontSize: font.size,
  spacing: space,
  borderRadius: radius,
  boxShadow: shadow,
  transitionDuration: duration,
  width: {
    'icon-sm':   iconography.size.sm,
    'icon-md':   iconography.size.md,
    'icon-base': iconography.size.base,
    'icon-lg':   iconography.size.lg,
    'icon-xl':   iconography.size.xl,
    'icon-2xl':  iconography.size['2xl'],
  },
  height: {
    'icon-sm':   iconography.size.sm,
    'icon-md':   iconography.size.md,
    'icon-base': iconography.size.base,
    'icon-lg':   iconography.size.lg,
    'icon-xl':   iconography.size.xl,
    'icon-2xl':  iconography.size['2xl'],
  },
} as const;


// ============================================================
// FULL TOKENS EXPORT
// ============================================================

export const tokens = {
  color,
  font,
  space,
  radius,
  shadow,
  duration,
  sizing,
  borderWidth,
  iconography,
  products,
  typography,
  themes: {
    light: lightTheme,
    dark:  darkTheme,
    b2s:   b2sOverrides,
  },
} as const;

export default tokens;
