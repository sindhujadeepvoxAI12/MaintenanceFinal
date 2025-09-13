import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

// Simple TabBarBackground component that works on all platforms
export default function TabBarBackground() {
  // Return a light gray background for all platforms
  return <View style={{ backgroundColor: '#F5F5F5', flex: 1 }} />;
}

// Re-export the useBottomTabOverflow hook
export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
