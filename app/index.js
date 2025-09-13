// import { Redirect } from 'expo-router';

// export default function Index() {
//   return <Redirect href="/login" />;
// }
// r


import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const colors = Colors.light; // force light theme

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace('/machines'); // ✅ correct path
        } else {
          router.replace('/login');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, user]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.glowLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
