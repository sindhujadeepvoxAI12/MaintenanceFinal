// BackendVoiceUploadService.js - FIXED to match your EXACT API format
import * as FileSystem from 'expo-file-system';

/**
 * Upload audio file to voice API and get transcription - EXACT API format match
 */
export const uploadVoiceForTranscription = async (audioUri) => {
  try {
    console.log('[VoiceAPI] Starting upload for URI:', audioUri);
    
    if (!audioUri) {
      throw new Error('No audio file to upload');
    }

    // Validate file size (10MB limit)
    const validation = await validateAudioFile(audioUri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log('[VoiceAPI] File validation passed:', validation.fileInfo);

    // Create FormData EXACTLY like your API format
    const formData = new FormData();
    
    // EXACT format: formData.append("audio", fileInput.files[0], filename)
    // React Native equivalent with proper filename
    const filename = `voice_recording_${Date.now()}.m4a`;
    formData.append("audio", {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    });

    console.log('[VoiceAPI] FormData created with file:', filename);
    console.log('[VoiceAPI] File size:', validation.fileInfo.sizeFormatted);

    // EXACT request format from your API - no redirect in React Native
    const requestOptions = {
      method: "POST",
      body: formData,
      // Note: Don't set Content-Type header - React Native sets it automatically with boundary
    };

    console.log('[VoiceAPI] Making request to voice API...');
    
    const response = await fetch('https://backendaimaintenance.deepvox.ai/api/v1/upload-voice', requestOptions);
    
    console.log('[VoiceAPI] Response status:', response.status);
    console.log('[VoiceAPI] Response headers:', response.headers);

    // Handle response as TEXT (like your API example)
    const resultText = await response.text();
    console.log('[VoiceAPI] Raw response:', resultText);

    if (!response.ok) {
      throw new Error(`Voice API failed with status ${response.status}: ${resultText}`);
    }
    
    // Process the transcription result
    const transcriptionResult = processVoiceApiResponse(resultText);
    console.log('[VoiceAPI] Processed transcription:', transcriptionResult.transcription);
    
    return {
      success: true,
      transcription: transcriptionResult.transcription,
      audioUrl: transcriptionResult.audioUrl,
      originalResponse: resultText,
      fileInfo: validation.fileInfo
    };

  } catch (error) {
    console.error('[VoiceAPI] Upload failed:', {
      message: error.message,
      stack: error.stack,
      audioUri
    });
    
    throw new Error(`Voice API upload failed: ${error.message}`);
  }
};

/**
 * Process voice API response - handles both JSON and plain text transcriptions
 */
export const processVoiceApiResponse = (responseText) => {
  console.log('[VoiceAPI] Processing response:', responseText);
  
  // Handle empty response
  if (!responseText || responseText.trim() === '') {
    return {
      transcription: 'Empty response from voice API',
      audioUrl: null
    };
  }
  
  const trimmedResponse = responseText.trim();
  
  // Try parsing as JSON first
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
      transcription: transcription || 'No transcription found in response',
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
};

/**
 * Upload with real-time progress tracking
 */
export const uploadVoiceWithProgress = async (audioUri, onProgress) => {
  try {
    console.log('[VoiceAPI] Starting upload with progress tracking...');
    
    if (onProgress) onProgress(0, 'Validating audio file...');
    
    // Validate file first
    const validation = await validateAudioFile(audioUri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    if (onProgress) onProgress(25, 'Preparing upload...');
    
    // Create FormData exactly like the API format
    const formData = new FormData();
    const filename = `voice_recording_${Date.now()}.m4a`;
    formData.append("audio", {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    });
    
    if (onProgress) onProgress(50, 'Uploading to voice API...');
    
    const requestOptions = {
      method: "POST",
      body: formData,
    };
    
    const response = await fetch('https://backendaimaintenance.deepvox.ai/api/v1/upload-voice', requestOptions);
    
    if (onProgress) onProgress(75, 'Processing transcription...');
    
    const resultText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Voice API failed: ${response.status} - ${resultText}`);
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
    
    const minSizeBytes = 1024; // 1KB minimum
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
 * Test voice API connection
 */
export const testVoiceAPI = async () => {
  try {
    console.log('[VoiceAPI] Testing API connection...');
    
    const response = await fetch('https://backendaimaintenance.deepvox.ai/api/v1/upload-voice', {
      method: 'OPTIONS',
    });
    
    console.log('[VoiceAPI] Test response status:', response.status);
    const isWorking = response.status === 200 || response.status === 405; // 405 is OK for OPTIONS
    
    console.log('[VoiceAPI] API is', isWorking ? 'working' : 'not responding');
    return isWorking;
    
  } catch (error) {
    console.error('[VoiceAPI] API test failed:', error);
    return false;
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