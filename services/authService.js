import { apiClient } from './apiClient';
import { saveAccessToken, saveUser, clearAuthStorage } from './storage';

export async function loginApi({ email, password, site = 'user' }) {
  const payload = { email, password, site };
  const data = await apiClient.post('/login', payload);
  // expected: { accessToken: string, user: object }
  if (data?.accessToken) {
    await saveAccessToken(data.accessToken);
    try {
      const tokenPreview = String(data.accessToken).slice(0, 8);
      // Log only a safe preview
      console.log(`[Auth] accessToken saved (preview: ${tokenPreview}...)`);
    } catch (_e) {
      console.log('[Auth] accessToken saved');
    }
  }
  if (data?.user) {
    await saveUser(data.user);
  }
  return data;
}

export async function logoutApi() {
  await clearAuthStorage();
}


