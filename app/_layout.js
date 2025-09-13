import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider } from '../contexts/AuthContext';
import { MachineProvider } from '../contexts/MachineContext';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <AuthProvider>
          <MachineProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="auto" />
          </MachineProvider>
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
