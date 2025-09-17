// VoiceUploadService.js - Simple voice file upload only
import * as FileSystem from 'expo-file-system';

const BASE_URL = 'https://backendaimaintenance.deepvox.ai/api/v1';

export const uploadVoiceFile = async (audioUri, onProgress = null) => {
  try {
    if (!audioUri) throw new Error('No audio file provided');

    const validation = await validateAudioFile(audioUri);
    if (!validation.valid) throw new Error(validation.error);

    if (onProgress) onProgress(25, 'Preparing upload...');

    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    });

    if (onProgress) onProgress(50, 'Uploading to server...');
    const response = await fetch(`${BASE_URL}/upload-voice`, {
      method: 'POST',
      body: formData,
    });

    if (onProgress) onProgress(75, 'Processing response...');
    const resultText = await response.text();
    if (!response.ok) throw new Error(`Upload failed: ${response.status} - ${resultText}`);

    const { success, fileUrl } = processVoiceApiResponse(resultText);
    if (!success || !fileUrl) throw new Error('Server returned success=false or no file URL');

    if (onProgress) onProgress(100, 'Complete!');
    return { success: true, fileUrl, fileInfo: validation.fileInfo };
  } catch (error) {
    if (onProgress) onProgress(0, `Error: ${error.message}`);
    throw new Error(`Voice upload failed: ${error.message}`);
  }
};

export const uploadVoiceFileSimple = async (audioUri) => {
  const validation = await validateAudioFile(audioUri);
  if (!validation.valid) throw new Error(validation.error);

  const formData = new FormData();
  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  });

  const response = await fetch(`${BASE_URL}/upload-voice`, {
    method: 'POST',
    body: formData,
  });
  const resultText = await response.text();
  if (!response.ok) throw new Error(`Upload failed: ${response.status} - ${resultText}`);

  const { success, fileUrl } = processVoiceApiResponse(resultText);
  if (!success || !fileUrl) throw new Error('Server returned success=false or no file URL');
  return { success: true, fileUrl, fileInfo: validation.fileInfo };
};

export const processVoiceApiResponse = (responseData) => {
  try {
    const json = JSON.parse((responseData || '').trim());
    return { success: !!json.success, fileUrl: json.file_url || null };
  } catch (_e) {
    return { success: false, fileUrl: null };
  }
};

export const validateAudioFile = async (audioUri) => {
  if (!audioUri) return { valid: false, error: 'No audio file provided' };
  const info = await FileSystem.getInfoAsync(audioUri);
  if (!info.exists) return { valid: false, error: 'Audio file does not exist' };
  const max = 10 * 1024 * 1024; // 10MB
  const min = 2000; // 2KB
  if (info.size > max) return { valid: false, error: `File too large: ${Math.round(info.size / 1024 / 1024)}MB (max: 10MB)` };
  if (info.size < min) return { valid: false, error: 'File too small - no audio data captured. Please try again.' };
  return { valid: true, fileInfo: { size: info.size, uri: audioUri, sizeFormatted: `${Math.round(info.size / 1024)}KB` } };
};

export const testVoiceAPI = async () => {
  try {
    const res = await fetch(`${BASE_URL}/upload-voice`, { method: 'HEAD' });
    const ok = [200, 204, 401, 404, 405].includes(res.status);
    return { success: ok, status: res.status, message: ok ? 'API is accessible' : `Status ${res.status}` };
  } catch (e) {
    return { success: false, status: 0, message: `API test failed: ${e.message}` };
  }
};


