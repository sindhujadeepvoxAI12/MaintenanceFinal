import { getAccessToken } from './storage';

// Note: Using a direct fetch here because our apiClient defaults to JSON Content-Type.
// For multipart uploads, we must let fetch set the boundary automatically.
const BASE_URL = 'https://backendaimaintenance.deepvox.ai/api/v1';

export async function uploadImage(fileUri) {
  console.log('=== IMAGE UPLOAD SERVICE DEBUG ===');
  
  if (!fileUri) {
    console.error('[uploadService] No fileUri provided');
    throw new Error('fileUri is required');
  }

  console.log('[uploadService] File URI:', fileUri);
  
  const token = await getAccessToken();
  console.log('[uploadService] Access token available:', !!token);
  if (token) {
    console.log('[uploadService] Token preview:', token.substring(0, 20) + '...');
  }
  
  const filename = fileUri.split('/').pop() || `upload-${Date.now()}.jpg`;
  const match = /\.([0-9a-zA-Z]+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  console.log('[uploadService] Filename:', filename);
  console.log('[uploadService] File extension:', ext);
  console.log('[uploadService] MIME type:', type);

  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    name: filename,
    type,
  });

  const headers = {
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `${token}`; // raw token, no Bearer prefix
  }

  const url = `${BASE_URL}/upload-machine-image`;
  console.log('[uploadService] Upload URL:', url);
  console.log('[uploadService] Headers:', headers);
  console.log('[uploadService] FormData prepared, making request...');

  try {
    console.log('[uploadService] Making fetch request...');
    console.log('[uploadService] FormData keys:', Array.from(form.keys()));
    
    const res = await fetch(url, { method: 'POST', headers, body: form });
    console.log('[uploadService] Response status:', res.status);
    console.log('[uploadService] Response headers:', Object.fromEntries(res.headers.entries()));
    
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    console.log('[uploadService] Response is JSON:', isJson);
    
    const data = isJson ? await res.json() : await res.text();
    console.log('[uploadService] Response data:', data);
    
    if (!res.ok) {
      const message = (data && data.message) || res.statusText || 'Upload failed';
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      console.error('[uploadService] ❌ Upload failed:', res.status, message);
      console.error('[uploadService] Error data:', data);
      console.log('=== END IMAGE UPLOAD SERVICE DEBUG (ERROR) ===');
      throw err;
    }

    // Check for backend errors even with 200 status
    if (data && data.message && data.message.includes('Cannot read properties of undefined')) {
      console.error('[uploadService] ❌ Backend error detected:', data.message);
      throw new Error(`Backend error: ${data.message}`);
    }

    console.log('[uploadService] ✅ Upload successful:', res.status);
    console.log('[uploadService] Returned data:', data);
    console.log('=== END IMAGE UPLOAD SERVICE DEBUG (SUCCESS) ===');
    return data;
  } catch (error) {
    console.error('=== IMAGE UPLOAD SERVICE ERROR ===');
    console.error('[uploadService] Network/Request error:', error);
    console.error('[uploadService] Error message:', error.message);
    console.error('[uploadService] Error stack:', error.stack);
    console.log('=== END IMAGE UPLOAD SERVICE DEBUG (EXCEPTION) ===');
    throw error;
  }
}


