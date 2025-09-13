import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

export async function saveAccessToken(token) {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (_e) {
    // noop
  }
}

export async function getAccessToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (_e) {
    return null;
  }
}

export async function deleteAccessToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (_e) {
    // noop
  }
}

export async function saveUser(user) {
  try {
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (_e) {
    // noop
  }
}

export async function getUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

export async function clearAuthStorage() {
  await deleteAccessToken();
  await AsyncStorage.removeItem(USER_KEY);
}


