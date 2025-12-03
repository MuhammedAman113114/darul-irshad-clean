import {MD3LightTheme as DefaultTheme} from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#005C83', // Darul Irshad brand blue
    primaryContainer: '#CCE7FF',
    secondary: '#3B82F6',
    secondaryContainer: '#DBEAFE',
    surface: '#FFFFFF',
    surfaceVariant: '#F8FAFC',
    background: '#F1F5F9',
    error: '#DC2626',
    errorContainer: '#FEE2E2',
    success: '#059669',
    successContainer: '#D1FAE5',
    warning: '#D97706',
    warningContainer: '#FED7AA',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#1E293B',
    onBackground: '#1E293B',
    outline: '#CBD5E1',
  },
  fonts: {
    ...DefaultTheme.fonts,
    headlineLarge: {
      ...DefaultTheme.fonts.headlineLarge,
      fontWeight: '600' as '600',
    },
    headlineMedium: {
      ...DefaultTheme.fonts.headlineMedium,
      fontWeight: '600' as '600',
    },
    titleLarge: {
      ...DefaultTheme.fonts.titleLarge,
      fontWeight: '600' as '600',
    },
  },
  roundness: 8,
};