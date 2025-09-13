/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Monochrome palette
const tintColorLight = '#111111';
const tintColorDark = '#FAFAFA';

export const Colors = {
  light: {
    text: '#111111',
    background: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#6B7280', // gray-500
    tabIconSelected: tintColorLight,
    border: '#E5E7EB', // gray-200
    card: '#FFFFFF',
    primary: '#111111',
    secondary: '#111111',
    accent: '#111111',
    success: '#111111',
    warning: '#111111',
    error: '#111111',
    // Gradient colors
    gradientStart: '#FFFFFF',
    gradientMiddle: '#FAFAFA',
    gradientEnd: '#F5F5F5',
    glow: '#111111',
    glowLight: '#111111',
    // Tab colors
    tabActive: '#FFFFFF',
    tabActiveSecondary: '#F5F5F5',
    // Button colors
    buttonPrimary: '#6B7280', // gray-500 - light gray shade
    buttonSecondary: '#6B7280', // gray-500 - light gray shade
  },
  dark: {
    text: '#FAFAFA',
    background: '#0A0A0A',
    tint: tintColorDark,
    tabIconDefault: '#9CA3AF', // gray-400
    tabIconSelected: tintColorDark,
    border: '#262626',
    card: '#0A0A0A',
    primary: '#FAFAFA',
    secondary: '#FAFAFA',
    accent: '#FAFAFA',
    success: '#FAFAFA',
    warning: '#FAFAFA',
    error: '#FAFAFA',
    // Gradient colors
    gradientStart: '#0A0A0A',
    gradientMiddle: '#0F0F0F',
    gradientEnd: '#171717',
    glow: '#FAFAFA',
    glowLight: '#FAFAFA',
    // Tab colors
    tabActive: '#0A0A0A',
    tabActiveSecondary: '#171717',
    // Button colors
    buttonPrimary: '#6B7280', // gray-500 - light gray shade
    buttonSecondary: '#6B7280', // gray-500 - light gray shade
  },
};
