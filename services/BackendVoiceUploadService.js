// BackendVoiceUploadService.js - Upload audio to backend for transcription
/**
 * Upload audio file to backend and get transcription
 * @param {string} audioUri - Local file URI of the audio recording
 * @returns {Promise<Object>} Upload result with transcription and audio URL
 */
export const uploadVoiceForTranscription = async (audioUri) => {
    try {
      console.log('[BackendVoiceUpload] Uploading audio file:', audioUri);
      
      if (!audioUri) {
        throw new Error('No audio file to upload');
      }
  
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add the audio file to FormData
      // Note: The file extension should match your recording format (.m4a, .wav, .mp3)
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a', // Expo records in m4a format by default
        name: `voice_recording_${Date.now()}.m4a`,
      });
  
      // Add additional metadata if your backend needs it
      formData.append('timestamp', new Date().toISOString());
      formData.append('type', 'voice_transcription');
  
      console.log('[BackendVoiceUpload] Uploading to backend...');
  
      const response = await fetch('https://backendaimaintenance.deepvox.ai/api/v1/upload-voice', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          // Add authentication headers if needed
          // 'Authorization': `Bearer ${token}`,
        },
      });
  
      console.log('[BackendVoiceUpload] Response status:', response.status);
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
      }
  
      const result = await response.json();
      console.log('[BackendVoiceUpload] Upload successful:', result);
  
      // Process the backend response
      const processedResult = processBackendResponse(result);
      
      return {
        success: true,
        transcription: processedResult.transcription,
        audioUrl: processedResult.audioUrl,
        originalResponse: result
      };
  
    } catch (error) {
      console.error('[BackendVoiceUpload] Upload error:', error);
      
      // For development/testing - return mock transcription
      if (__DEV__) {
        console.log('[BackendVoiceUpload] DEV MODE: Returning mock transcription');
        return {
          success: true,
          transcription: 'This is a mock transcription for development testing.',
          audioUrl: `mock://voice_upload_${Date.now()}.m4a`,
          message: 'Mock transcription (development mode)'
        };
      }
      
      throw new Error(`Voice upload failed: ${error.message}`);
    }
  };
  
  /**
   * Process backend response to extract transcription and audio URL
   * Adjust based on your actual backend API response structure
   */
  export const processBackendResponse = (backendResponse) => {
    console.log('[BackendVoiceUpload] Processing backend response:', backendResponse);
    
    // Example backend response formats you might receive:
    
    // Format 1: Direct transcription as string
    if (typeof backendResponse === 'string') {
      return {
        transcription: backendResponse,
        audioUrl: null
      };
    }
    
    // Format 2: Object with transcription field
    if (backendResponse.transcription) {
      return {
        transcription: backendResponse.transcription,
        audioUrl: backendResponse.audioUrl || backendResponse.file_url || backendResponse.url
      };
    }
    
    // Format 3: Object with text field
    if (backendResponse.text) {
      return {
        transcription: backendResponse.text,
        audioUrl: backendResponse.url || backendResponse.file_url || backendResponse.audioUrl
      };
    }
    
    // Format 4: Object with transcript field
    if (backendResponse.transcript) {
      return {
        transcription: backendResponse.transcript,
        audioUrl: backendResponse.audioUrl || backendResponse.file_url || backendResponse.url
      };
    }
    
    // Format 5: Nested data structure
    if (backendResponse.data) {
      return processBackendResponse(backendResponse.data);
    }
    
    // Format 6: Result field
    if (backendResponse.result) {
      return processBackendResponse(backendResponse.result);
    }
    
    // Format 7: Check for common transcription field names
    const transcriptionFields = ['transcription', 'text', 'transcript', 'result', 'content', 'speech_to_text'];
    const audioUrlFields = ['audioUrl', 'file_url', 'url', 'audio_url', 'file_path', 'download_url'];
    
    let transcription = '';
    let audioUrl = '';
    
    // Find transcription
    for (const field of transcriptionFields) {
      if (backendResponse[field]) {
        transcription = backendResponse[field];
        break;
      }
    }
    
    // Find audio URL
    for (const field of audioUrlFields) {
      if (backendResponse[field]) {
        audioUrl = backendResponse[field];
        break;
      }
    }
    
    // Default fallback
    return {
      transcription: transcription || backendResponse.transcript || backendResponse.result || '',
      audioUrl: audioUrl || ''
    };
  };
  
  /**
   * Alternative upload function with retry mechanism
   */
  export const uploadVoiceWithRetry = async (audioUri, maxRetries = 3) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[BackendVoiceUpload] Upload attempt ${attempt}/${maxRetries}`);
        
        const result = await uploadVoiceForTranscription(audioUri);
        
        // If successful, return result
        if (result.success) {
          console.log(`[BackendVoiceUpload] Upload successful on attempt ${attempt}`);
          return result;
        }
        
      } catch (error) {
        lastError = error;
        console.error(`[BackendVoiceUpload] Upload attempt ${attempt} failed:`, error);
        
        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.log(`[BackendVoiceUpload] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    throw new Error(`Voice upload failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  };
  
  /**
   * Validate audio file before upload
   */
  export const validateAudioFile = async (audioUri) => {
    try {
      if (!audioUri) {
        return { valid: false, error: 'No audio file provided' };
      }
      
      // Check if file exists (for Expo/React Native)
      const FileSystem = require('expo-file-system');
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      
      if (!fileInfo.exists) {
        return { valid: false, error: 'Audio file does not exist' };
      }
      
      // Check file size (optional - adjust limits as needed)
      const maxSizeBytes = 50 * 1024 * 1024; // 50MB
      if (fileInfo.size > maxSizeBytes) {
        return { valid: false, error: `File too large: ${Math.round(fileInfo.size / 1024 / 1024)}MB (max: 50MB)` };
      }
      
      const minSizeBytes = 1024; // 1KB
      if (fileInfo.size < minSizeBytes) {
        return { valid: false, error: 'File too small (likely empty recording)' };
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
      console.error('[BackendVoiceUpload] File validation error:', error);
      return { valid: false, error: `Validation failed: ${error.message}` };
    }
  };
  
  /**
   * Upload with progress callback (if your backend supports it)
   */
  export const uploadVoiceWithProgress = async (audioUri, onProgress) => {
    try {
      // Validate file first
      const validation = await validateAudioFile(audioUri);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      if (onProgress) onProgress(0, 'Preparing upload...');
      
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: `voice_recording_${Date.now()}.m4a`,
      });
      
      formData.append('timestamp', new Date().toISOString());
      formData.append('type', 'voice_transcription');
      
      if (onProgress) onProgress(25, 'Uploading to server...');
      
      const response = await fetch('https://backendaimaintenance.deepvox.ai/api/v1/upload-voice', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (onProgress) onProgress(75, 'Processing transcription...');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      const processedResult = processBackendResponse(result);
      
      if (onProgress) onProgress(100, 'Transcription complete!');
      
      return {
        success: true,
        transcription: processedResult.transcription,
        audioUrl: processedResult.audioUrl,
        fileInfo: validation.fileInfo,
        originalResponse: result
      };
      
    } catch (error) {
      if (onProgress) onProgress(0, `Error: ${error.message}`);
      throw error;
    }
  };