import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const screen = { width, height };

export const colors = {
  primary: '#f27d26',
  background: '#000000',
  card: 'rgba(28,28,30,0.95)',
  cardSolid: '#1c1c1e',
  border: 'rgba(255,255,255,0.1)',
  borderSolid: '#2c2c2e',
  muted: '#8e8e93',
  foreground: '#ffffff',
  secondaryLabel: '#ebebf5',
  surface: '#2c2c2e',
  surfaceElevated: '#3a3a3c',
  separator: 'rgba(255,255,255,0.08)',
  red: '#ff453a',
  green: '#30d158',
  blue: '#0a84ff',
  yellow: '#ffd60a',
  orange: '#ff9f0a',
  teal: '#5ac8fa',
  // Liquid glass
  glass: 'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassTint: 'rgba(242,125,38,0.15)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 44,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 13,
  lg: 16,
  xl: 20,
  xxl: 26,
  full: 9999,
};

// iOS Dynamic Type scale
export const typography = {
  caption2: 11,
  caption1: 12,
  footnote: 13,
  subheadline: 15,
  callout: 16,
  body: 17,
  headline: 17,
  title3: 20,
  title2: 22,
  title1: 28,
  largeTitle: 34,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  black: '900' as const,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  colored: {
    shadowColor: '#f27d26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
