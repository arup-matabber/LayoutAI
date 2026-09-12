// Design tokens for the app. Centralizes values that were previously
// duplicated (and drifting slightly) across every screen's own StyleSheet.
export const colors = {
  primary: '#66BB6A',
  primaryDark: '#4E9A51',
  primaryLight: '#E8F5E9',
  background: '#FFFFFF',
  surface: '#F4F6F4',
  border: 'rgba(0,0,0,0.08)',
  textPrimary: '#1B1F1C',
  textSecondary: '#9E9E9E',
  textOnPrimary: '#FFFFFF',
  error: '#C20000',
  overlay: 'rgba(0,0,0,0.35)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 16,
  pill: 25,
};

export const typography = {
  heading: {
    fontFamily: 'Roboto',
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    fontFamily: 'Roboto',
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  caption: {
    fontFamily: 'Roboto',
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  brand: {
    fontFamily: 'System-code',
  },
};

export const shadow = {
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  header: {
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
};

export default { colors, spacing, radii, typography, shadow };
