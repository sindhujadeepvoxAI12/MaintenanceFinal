import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
 

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];
  const styles = createStyles(colors);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email.trim(), password);
      
      if (success) {
        Alert.alert('Success', 'Login successful!', [
          { text: 'OK', onPress: () => router.replace('/machines') }
        ]);
      } else {
        Alert.alert('Error', 'Invalid email or password');
      }
    } catch (_error) {
      Alert.alert('Error', 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.appName}>Maintenance Tracker</Text>
            <Text style={styles.tagline}>Keep your machines running smoothly</Text>
          </View>

          <Text style={styles.signInTitle}>Sign In</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={colors.tabIconDefault}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.tabIconDefault}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.glowLight,
    marginBottom: 10,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: colors.tabIconDefault,
    textAlign: 'center',
  },
  signInTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.glowLight,
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.glowLight,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.glowLight,
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: colors.text,
    marginBottom: 5,
  },
  signInButton: {
    backgroundColor: colors.buttonPrimary,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
