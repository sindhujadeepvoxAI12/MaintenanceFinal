import { getAccessToken } from './storage';

const BASE_URL = 'https://backendaimaintenance.deepvox.ai/api/v1';

async function buildHeaders(extraHeaders = {}) {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) {
    // Backend expects raw token in Authorization header (no "Bearer " prefix)
    headers.Authorization = `${token}`;
    try {
      const preview = String(token).slice(0, 8);
      console.log(`[apiClient] using auth token (preview: ${preview}...)`);
      console.log(`[apiClient] full token length: ${String(token).length}`);
    } catch (_e) {
      console.log('[apiClient] error processing token:', _e);
    }
  } else {
    console.log('[apiClient] No token available');
  }
  return headers;
}

async function request(path, { method = 'GET', headers, body } = {}) {
  const url = `${BASE_URL}${path}`;
  const mergedHeaders = await buildHeaders(headers);
  
  console.log(`[apiClient] ===== ${method} REQUEST START =====`);
  console.log(`[apiClient] URL: ${url}`);
  console.log(`[apiClient] Headers:`, mergedHeaders);
  if (body) {
    console.log('[apiClient] Request body:', body);
    console.log('[apiClient] Request body type:', typeof body);
    console.log('[apiClient] Request body length:', body?.length || 0);
  }
  
  try {
    const res = await fetch(url, { method, headers: mergedHeaders, body });
    
    console.log(`[apiClient] ===== ${method} RESPONSE RECEIVED =====`);
    console.log(`[apiClient] Status: ${res.status} ${res.statusText}`);
    console.log(`[apiClient] Headers:`, Object.fromEntries(res.headers.entries()));
    
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    console.log(`[apiClient] Response is JSON: ${isJson}`);
    
    const data = isJson ? await res.json() : await res.text();
    console.log(`[apiClient] Response data:`, data);
    console.log(`[apiClient] Response data type:`, typeof data);
    
    if (!res.ok) {
      const message = (data && data.message) || res.statusText || 'Request failed';
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      console.log(`[apiClient] ❌ ERROR ${method} ${url} -> ${res.status} ${message}`);
      console.log(`[apiClient] Error data:`, data);
      console.log(`[apiClient] ===== ${method} REQUEST FAILED =====`);
      throw err;
    }
    
    console.log(`[apiClient] ✅ SUCCESS ${method} ${url} -> ${res.status}`);
    console.log(`[apiClient] ===== ${method} REQUEST COMPLETE =====`);
    return data;
  } catch (error) {
    console.error(`[apiClient] ❌ EXCEPTION ${method} ${url}`);
    console.error(`[apiClient] Exception type:`, typeof error);
    console.error(`[apiClient] Exception message:`, error.message);
    console.error(`[apiClient] Exception stack:`, error.stack);
    console.error(`[apiClient] ===== ${method} REQUEST EXCEPTION =====`);
    throw error;
  }
}

export const apiClient = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, payload) => request(path, { method: 'POST', body: JSON.stringify(payload) }),
  put: (path, payload) => request(path, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};


