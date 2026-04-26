import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// The floating tab bar sits 24px from bottom and is 68px tall
// Plus safe area inset on iPhone (home indicator ~34px)
export const TAB_BAR_HEIGHT = 68 + 24 + 34; // total bottom clearance needed

export const colors = {
  primary: '#f27d26',
  background: '#000000',
  card: '#1c1c1e',       // iOS grouped bg
  card2: '#2c2c2e',      // iOS secondary grouped bg
  border: '#38383a',
  muted: '#8e8e93',      // iOS secondary label
  foreground: '#ffffff',
  surface: '#1c1c1e',
  separator: '#38383a',
  red: '#ff453a',        // iOS red
  green: '#30d158',      // iOS green
  blue: '#0a84ff',       // iOS blue
  yellow: '#ffd60a',     // iOS yellow
  orange: '#ff9f0a',     // iOS orange
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 20, xl: 28, xxl: 44,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 22, xxl: 30, full: 9999,
};

export const typography = {
  xs: 11, sm: 13, base: 15, lg: 17, xl: 20,
  '2xl': 24, '3xl': 28, '4xl': 34,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 16,
  },
};
