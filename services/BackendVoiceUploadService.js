// BackendVoiceUploadService.js - Fixed to match your API requirements
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
  
      // Create FormData EXACTLY like your API example
      const formData = new FormData();
      
      // Match your exact FormData structure
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a', // or 'audio/wav' depending on what AudioRecordingService produces
        name: `voice_recording_${Date.now()}.m4a`, // or .wav
      });

      console.log('[BackendVoiceUpload] FormData created:', {
        audioUri,
        fileName: `voice_recording_${Date.now()}.m4a`
      });
  
      console.log('[BackendVoiceUpload] Making API call to:', 'https://backendaimaintenance.deepvox.ai/api/v1/upload-voice');
  
      // Match your exact fetch structure
      const requestOptions = {
        method: "POST",
        body: formData,
        // NOTE: Don't set Content-Type header for FormData in React Native
        // React Native will set it automatically with boundary
      };

      const response = await fetch('https://backendaimaintenance.deepvox.ai/api/v1/upload-voice', requestOptions);
  
      console.log('[BackendVoiceUpload] Response status:', response.status);
      console.log('[BackendVoiceUpload] Response ok:', response.ok);
  
      // Get response as text first (like your API example)
      const result = await response.text();
      console.log('[BackendVoiceUpload] Raw response text:', result);

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}: ${result}`);
      }
      
      // Try to parse the response
      let parsedResult;
      try {
        // Try parsing as JSON first
        parsedResult = JSON.parse(result);
        console.log('[BackendVoiceUpload] Parsed as JSON:', parsedResult);
      } catch (parseError) {
        console.log('[BackendVoiceUpload] Response is not JSON, treating as plain text transcription');
        // If it's not JSON, treat the entire response as transcription text
        parsedResult = {
          transcription: result.trim(),
          success: true
        };
      }
  
      // Process the result
      const processedResult = processBackendResponse(parsedResult);
      console.log('[BackendVoiceUpload] Final processed result:', processedResult);
      
      return {
        success: true,
        transcription: processedResult.transcription,
        audioUrl: processedResult.audioUrl,
        originalResponse: parsedResult
      };
  
    } catch (error) {
      console.error('[BackendVoiceUpload] Detailed upload error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        audioUri
      });
      
      // For development/testing - return mock transcription
      if (__DEV__) {
        console.log('[BackendVoiceUpload] DEV MODE: Returning mock transcription due to error');
        return {
          success: true,
          transcription: 'Mock transcription: The voice recording was successful but API failed.',
          audioUrl: `mock://voice_upload_${Date.now()}.m4a`,
          message: 'Mock transcription (development mode - API error)'
        };
      }
      
      throw new Error(`Voice upload failed: ${error.message}`);
    }
  };
  
  /**
   * Process backend response to extract transcription
   * Updated to handle your API's response format
   */
  export const processBackendResponse = (backendResponse) => {
    console.log('[BackendVoiceUpload] Processing backend response:', backendResponse);
    
    // If the response is already a string, treat it as transcription
    if (typeof backendResponse === 'string') {
      return {
        transcription: backendResponse.trim(),
        audioUrl: null
      };
    }
    
    // If it's an object, look for common transcription fields
    if (typeof backendResponse === 'object' && backendResponse !== null) {
      
      // Check for direct transcription fields
      const transcriptionFields = [
        'transcription', 
        'text', 
        'transcript', 
        'result', 
        'content', 
        'speech_to_text',
        'message',
        'data'
      ];
      
      let transcription = '';
      
      for (const field of transcriptionFields) {
        if (backendResponse[field] && typeof backendResponse[field] === 'string') {
          transcription = backendResponse[field];
          break;
        }
      }
      
      // If still no transcription found, try nested data
      if (!transcription && backendResponse.data && typeof backendResponse.data === 'object') {
        for (const field of transcriptionFields) {
          if (backendResponse.data[field] && typeof backendResponse.data[field] === 'string') {
            transcription = backendResponse.data[field];
            break;
          }
        }
      }
      
      // Look for audio URL
      const audioUrlFields = ['audioUrl', 'file_url', 'url', 'audio_url', 'file_path', 'download_url'];
      let audioUrl = '';
      
      for (const field of audioUrlFields) {
        if (backendResponse[field]) {
          audioUrl = backendResponse[field];
          break;
        }
      }
      
      return {
        transcription: transcription || 'No transcription found in response',
        audioUrl: audioUrl || ''
      };
    }
    
    // Fallback
    return {
      transcription: 'Unable to parse transcription from response',
      audioUrl: ''
    };
  };
  
  /**
   * Upload with progress callback - updated for your API
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
      
      if (onProgress) onProgress(25, 'Uploading to server...');
      
      const requestOptions = {
        method: "POST",
        body: formData,
      };
      
      const response = await fetch('https://backendaimaintenance.deepvox.ai/api/v1/upload-voice', requestOptions);
      
      if (onProgress) onProgress(75, 'Processing transcription...');
      
      const result = await response.text();
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} - ${result}`);
      }
      
      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        parsedResult = { transcription: result.trim() };
      }
      
      const processedResult = processBackendResponse(parsedResult);
      
      if (onProgress) onProgress(100, 'Transcription complete!');
      
      return {
        success: true,
        transcription: processedResult.transcription,
        audioUrl: processedResult.audioUrl,
        fileInfo: validation.fileInfo,
        originalResponse: parsedResult
      };
      
    } catch (error) {
      if (onProgress) onProgress(0, `Error: ${error.message}`);
      console.error('[BackendVoiceUpload] Upload with progress error:', error);
      throw error;
    }
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