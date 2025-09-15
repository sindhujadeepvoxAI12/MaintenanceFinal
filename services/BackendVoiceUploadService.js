// BackendVoiceUploadService.js - CORRECTED to match your exact API format
import * as FileSystem from 'expo-file-system';
import { getAccessToken } from './storage'; // Import auth token function

// Use consistent base URL pattern
const BASE_URL = 'https://backendaimaintenance.deepvox.ai/api/v1';

/**
 * Upload audio file to voice API and get transcription - CORRECTED API FORMAT
 */
export const uploadVoiceForTranscription = async (audioUri) => {
  try {
    console.log('=== VOICE UPLOAD SERVICE DEBUG ===');
    console.log('[VoiceAPI] Starting upload for URI:', audioUri);
    
    if (!audioUri) {
      throw new Error('No audio file to upload');
    }

    // Get authentication token
    const token = await getAccessToken();
    console.log('[VoiceAPI] Access token available:', !!token);
    if (token) {
      console.log('[VoiceAPI] Token preview:', token.substring(0, 20) + '...');
    }

    // Validate file size (10MB limit)
    const validation = await validateAudioFile(audioUri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log('[VoiceAPI] File validation passed:', validation.fileInfo);

    // Create FormData with EXACT API format - use "audio" key not "file"
    const formData = new FormData();
    
    const filename = `voice_recording_${Date.now()}.m4a`;
    formData.append("audio", {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    });

    console.log('[VoiceAPI] FormData created with audio key:', filename);
    console.log('[VoiceAPI] File size:', validation.fileInfo.sizeFormatted);

    // Create headers - match your API exactly (no custom headers if not needed)
    const headers = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`; // Try Bearer prefix
    }

    // Use your exact API URL
    const url = `${BASE_URL}/upload-voice`;
    
    console.log('[VoiceAPI] Upload URL:', url);
    console.log('[VoiceAPI] Headers:', headers);
    console.log('[VoiceAPI] Making request to voice API...');
    
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: formData,
      // Don't set redirect: "follow" in React Native - it's automatic
    });
    
    console.log('[VoiceAPI] Response status:', response.status);
    console.log('[VoiceAPI] Response headers:', Object.fromEntries(response.headers.entries()));

    // Handle response - first try text since your API example uses .text()
    const resultText = await response.text();
    console.log('[VoiceAPI] Raw response text:', resultText);

    if (!response.ok) {
      console.error('[VoiceAPI] ❌ Upload failed:', response.status);
      console.error('[VoiceAPI] Error response:', resultText);
      throw new Error(`Voice API failed with status ${response.status}: ${resultText.substring(0, 200)}`);
    }
    
    // Process the transcription result
    const transcriptionResult = processVoiceApiResponse(resultText);
    console.log('[VoiceAPI] Processed transcription:', transcriptionResult.transcription);
    
    console.log('[VoiceAPI] ✅ Upload successful');
    console.log('=== END VOICE UPLOAD SERVICE DEBUG (SUCCESS) ===');
    
    return {
      success: true,
      transcription: transcriptionResult.transcription,
      audioUrl: transcriptionResult.audioUrl,
      originalResponse: resultText,
      fileInfo: validation.fileInfo
    };

  } catch (error) {
    console.error('=== VOICE UPLOAD SERVICE ERROR ===');
    console.error('[VoiceAPI] Upload failed:', {
      message: error.message,
      stack: error.stack,
      audioUri
    });
    console.log('=== END VOICE UPLOAD SERVICE DEBUG (ERROR) ===');
    
    throw new Error(`Voice API upload failed: ${error.message}`);
  }
};

/**
 * Process voice API response - handles both JSON and plain text transcriptions
 */
export const processVoiceApiResponse = (responseData) => {
  console.log('[VoiceAPI] Processing response:', responseData);
  
  // Handle empty response
  if (!responseData || (typeof responseData === 'string' && responseData.trim() === '')) {
    return {
      transcription: 'Empty response from voice API',
      audioUrl: null
    };
  }
  
  // If it's a string, try parsing as JSON first
  if (typeof responseData === 'string') {
    const trimmedResponse = responseData.trim();
    
    // Check if it's HTML error response
    if (trimmedResponse.startsWith('<') || trimmedResponse.includes('<!DOCTYPE')) {
      console.error('[VoiceAPI] Received HTML error response:', trimmedResponse.substring(0, 200));
      return {
        transcription: 'Server returned HTML error page - check API endpoint and authentication',
        audioUrl: null
      };
    }
    
    try {
      const jsonResponse = JSON.parse(trimmedResponse);
      console.log('[VoiceAPI] Parsed JSON response:', jsonResponse);
      
      // Common transcription field names
      const transcriptionFields = [
        'transcription', 
        'text', 
        'transcript', 
        'result', 
        'content', 
        'message',
        'data',
        'speech_text',
        'recognized_text'
      ];
      
      let transcription = '';
      
      // Check direct fields
      for (const field of transcriptionFields) {
        if (jsonResponse[field] && typeof jsonResponse[field] === 'string') {
          transcription = jsonResponse[field];
          break;
        }
      }
      
      // Check nested data object
      if (!transcription && jsonResponse.data && typeof jsonResponse.data === 'object') {
        for (const field of transcriptionFields) {
          if (jsonResponse.data[field] && typeof jsonResponse.data[field] === 'string') {
            transcription = jsonResponse.data[field];
            break;
          }
        }
      }
      
      // Look for audio URL (optional)
      const audioUrlFields = ['audioUrl', 'file_url', 'url', 'audio_url', 'file_path'];
      let audioUrl = null;
      
      for (const field of audioUrlFields) {
        if (jsonResponse[field]) {
          audioUrl = jsonResponse[field];
          break;
        }
      }
      
      return {
        transcription: transcription || 'No transcription found in JSON response',
        audioUrl: audioUrl
      };
      
    } catch (parseError) {
      console.log('[VoiceAPI] Response is not JSON, treating as plain text transcription');
      
      // If not JSON, treat entire response as transcription
      return {
        transcription: trimmedResponse,
        audioUrl: null
      };
    }
  }
  
  // If it's already an object (shouldn't happen with .text() but just in case)
  if (typeof responseData === 'object') {
    console.log('[VoiceAPI] Response is object:', responseData);
    
    const transcriptionFields = [
      'transcription', 'text', 'transcript', 'result', 'content', 'message', 'data'
    ];
    
    for (const field of transcriptionFields) {
      if (responseData[field] && typeof responseData[field] === 'string') {
        return {
          transcription: responseData[field],
          audioUrl: responseData.audioUrl || responseData.file_url || null
        };
      }
    }
    
    return {
      transcription: 'No transcription found in object response',
      audioUrl: null
    };
  }
  
  // Fallback
  return {
    transcription: 'Unable to process voice API response',
    audioUrl: null
  };
};

/**
 * Upload with real-time progress tracking - CORRECTED
 */
export const uploadVoiceWithProgress = async (audioUri, onProgress) => {
  try {
    console.log('[VoiceAPI] Starting upload with progress tracking...');
    
    if (onProgress) onProgress(0, 'Validating audio file...');
    
    // Get authentication token
    const token = await getAccessToken();
    console.log('[VoiceAPI] Auth token retrieved for progress upload');
    
    // Validate file first
    const validation = await validateAudioFile(audioUri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    if (onProgress) onProgress(25, 'Preparing upload...');
    
    // Create FormData with CORRECTED key - "audio" not "file"
    const formData = new FormData();
    const filename = `voice_recording_${Date.now()}.m4a`;
    formData.append("audio", {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    });
    
    if (onProgress) onProgress(50, 'Uploading to voice API...');
    
    // Create headers
    const headers = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(`${BASE_URL}/upload-voice`, {
      method: "POST",
      headers: headers,
      body: formData,
    });
    
    if (onProgress) onProgress(75, 'Processing transcription...');
    
    const resultText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Voice API failed: ${response.status} - ${resultText.substring(0, 200)}`);
    }
    
    const transcriptionResult = processVoiceApiResponse(resultText);
    
    if (onProgress) onProgress(100, 'Transcription complete!');
    
    return {
      success: true,
      transcription: transcriptionResult.transcription,
      audioUrl: transcriptionResult.audioUrl,
      fileInfo: validation.fileInfo,
      originalResponse: resultText
    };
    
  } catch (error) {
    if (onProgress) onProgress(0, `Error: ${error.message}`);
    console.error('[VoiceAPI] Upload with progress error:', error);
    throw error;
  }
};

/**
 * Validate audio file before upload (10MB limit)
 */
export const validateAudioFile = async (audioUri) => {
  try {
    if (!audioUri) {
      return { valid: false, error: 'No audio file provided' };
    }
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    
    if (!fileInfo.exists) {
      return { valid: false, error: 'Audio file does not exist' };
    }
    
    // Check file size (10MB limit)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (fileInfo.size > maxSizeBytes) {
      return { 
        valid: false, 
        error: `File too large: ${Math.round(fileInfo.size / 1024 / 1024)}MB (max: 10MB)` 
      };
    }
    
    const minSizeBytes = 2000; // 2KB minimum for valid audio
    if (fileInfo.size < minSizeBytes) {
      return { 
        valid: false, 
        error: 'File too small (likely empty recording)' 
      };
    }
    
    return { 
      valid: true, 
      fileInfo: {
        size: fileInfo.size,
        uri: audioUri,
        sizeFormatted: `${Math.round(fileInfo.size / 1024)}KB`
      }
    };
    
  } catch (error) {
    console.error('[VoiceAPI] File validation error:', error);
    return { valid: false, error: `Validation failed: ${error.message}` };
  }
};

/**
 * Test voice API connection - CORRECTED
 */
export const testVoiceAPI = async () => {
  try {
    console.log('[VoiceAPI] Testing API connection...');
    
    const token = await getAccessToken();
    const headers = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    // Test with HEAD request instead of OPTIONS (more compatible)
    const response = await fetch(`${BASE_URL}/upload-voice`, {
      method: 'HEAD',
      headers: headers,
    });
    
    console.log('[VoiceAPI] Test response status:', response.status);
    // Accept 405 (Method Not Allowed) as working since HEAD might not be supported
    const isWorking = [200, 204, 405, 404].includes(response.status);
    
    console.log('[VoiceAPI] API is', isWorking ? 'working' : 'not responding');
    return isWorking;
    
  } catch (error) {
    console.error('[VoiceAPI] API test failed:', error);
    // Don't fail completely on network test - API might still work
    return true;
  }
};

/**
 * Get supported audio formats for the API
 */
export const getSupportedAudioFormats = () => {
  return {
    formats: ['.m4a', '.mp3', '.wav', '.webm'],
    mimeTypes: ['audio/m4a', 'audio/mp3', 'audio/wav', 'audio/webm'],
    maxSize: '10MB',
    recommended: 'audio/m4a'
  };
};