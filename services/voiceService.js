// services/voiceService.js - FIXED for upload-only functionality
import AudioRecordingService from './AudioRecordingService';
import { uploadVoiceFile, uploadVoiceFileSimple, testVoiceAPI } from './VoiceUploadService';

class VoiceService {
  constructor() {
    this.isRecording = false;
    this.isUploading = false;
    this.recordingUri = null;
    this.recordingDuration = 0;
    this.onDurationUpdateCallback = null;
    this.onUploadCompleteCallback = null;
    this.onErrorCallback = null;
    this.voiceApiStatus = 'unknown'; // 'working', 'failed', 'unknown'
    this.isInitialized = false;
    this.lastUploadResult = null;
  }

  // Initialize the voice service
  async initialize() {
    try {
      if (this.isInitialized) return true;
      
      console.log('[VoiceService] Initializing voice service...');
      
      // Initialize audio recording service
      const audioInitialized = await AudioRecordingService.initialize();
      if (!audioInitialized) {
        throw new Error('Failed to initialize audio recording service');
      }
      
      // Test voice API connection
      await this.checkVoiceAPI();
      
      this.isInitialized = true;
      console.log('[VoiceService] Voice service initialized successfully');
      return true;
    } catch (error) {
      console.error('[VoiceService] Failed to initialize:', error);
      this.isInitialized = false;
      return false;
    }
  }

  // Check API status
  async checkVoiceAPI() {
    try {
      console.log('[VoiceService] Checking voice API status...');
      
      const result = await testVoiceAPI();
      this.voiceApiStatus = result.success ? 'working' : 'failed';
      
      console.log('[VoiceService] API status:', this.voiceApiStatus, result.message);
      return result.success;
    } catch (error) {
      this.voiceApiStatus = 'failed';
      console.error('[VoiceService] API test error:', error);
      return false;
    }
  }

  // Start recording with comprehensive initialization and error handling
  async startRecording(onDurationUpdate = null, onError = null) {
    try {
      console.log('[VoiceService] Starting recording...');
      
      // Initialize if not already done
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          const errorMsg = 'Failed to initialize voice service';
          if (onError) onError(errorMsg);
          return { success: false, error: errorMsg };
        }
      }
      
      // Store callbacks
      this.onDurationUpdateCallback = onDurationUpdate;
      this.onErrorCallback = onError;
      
      // Reset states
      this.recordingUri = null;
      this.recordingDuration = 0;
      this.isUploading = false;
      this.lastUploadResult = null;
      
      // Check audio system status
      const audioStatus = await AudioRecordingService.getAudioStatus();
      console.log('[VoiceService] Audio system status:', audioStatus);
      
      if (!audioStatus.permissionsGranted) {
        const errorMsg = 'Microphone permission not granted. Please enable microphone access in your device settings.';
        if (onError) onError(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      // Start recording with real-time duration callback
      const result = await AudioRecordingService.startRecording((duration) => {
        this.recordingDuration = duration;
        if (this.onDurationUpdateCallback) {
          this.onDurationUpdateCallback(duration);
        }
      });
      
      if (result.success) {
        this.isRecording = true;
        console.log('[VoiceService] Recording started successfully');
        return { success: true };
      } else {
        console.log('[VoiceService] Failed to start recording:', result.error);
        if (onError) onError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[VoiceService] Error starting recording:', error);
      if (onError) onError(error.message);
      return { success: false, error: error.message };
    }
  }

  // Stop recording with enhanced validation
  async stopRecording() {
    try {
      console.log('[VoiceService] Stopping recording...');
      
      if (!this.isRecording) {
        return { success: false, error: 'No active recording to stop' };
      }
      
      const result = await AudioRecordingService.stopRecording();
      this.isRecording = false;
      
      if (result.success && result.uri) {
        this.recordingUri = result.uri;
        console.log('[VoiceService] Recording stopped successfully');
        console.log('[VoiceService] Duration:', result.duration, 'seconds');
        console.log('[VoiceService] File size:', result.fileSizeFormatted);
        
        // Validate the recording
        const validation = await AudioRecordingService.validateRecording(result.uri);
        if (!validation.valid) {
          console.error('[VoiceService] Recording validation failed:', validation.error);
          await this.cleanup();
          if (this.onErrorCallback) {
            this.onErrorCallback(validation.error);
          }
          return { success: false, error: validation.error };
        }
        
        return {
          success: true,
          uri: result.uri,
          duration: result.duration,
          fileSize: result.fileSize,
          fileSizeFormatted: result.fileSizeFormatted
        };
      } else {
        console.log('[VoiceService] Recording failed:', result.error);
        if (this.onErrorCallback) {
          this.onErrorCallback(result.error || 'Recording failed');
        }
        return { success: false, error: result.error || 'Recording failed' };
      }
    } catch (error) {
      console.error('[VoiceService] Error stopping recording:', error);
      this.isRecording = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message);
      }
      return { success: false, error: error.message };
    }
  }

  // Cancel recording with comprehensive cleanup
  async cancelRecording() {
    try {
      console.log('[VoiceService] Cancelling recording...');
      
      if (this.isRecording) {
        // Cancel active recording
        await AudioRecordingService.cancelRecording();
      } else if (this.recordingUri) {
        // Delete completed recording
        await AudioRecordingService.deleteRecording(this.recordingUri);
      }
      
      // Reset all states
      await this.cleanup();
      
      return { success: true };
    } catch (error) {
      console.error('[VoiceService] Error cancelling recording:', error);
      // Force cleanup even on error
      await this.cleanup();
      return { success: false, error: error.message };
    }
  }

  // Upload voice file using correct function
  async uploadVoiceFile(audioUri = null, onProgress = null, maxRetries = 2) {
    try {
      console.log('[VoiceService] Starting voice file upload...');
      
      const uriToUse = audioUri || this.recordingUri;
      
      if (!uriToUse) {
        throw new Error('No recording to upload');
      }
      
      // Check API status first
      if (this.voiceApiStatus === 'failed') {
        // Try to recheck API status
        const apiWorking = await this.checkVoiceAPI();
        if (!apiWorking) {
          throw new Error('Voice API is currently unavailable. Please check your internet connection and try again.');
        }
      }
      
      // Validate recording before upload
      const validation = await AudioRecordingService.validateRecording(uriToUse);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      this.isUploading = true;
      
      let lastError;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[VoiceService] Upload attempt ${attempt}/${maxRetries}`);
          
          if (onProgress) {
            onProgress(0, `Uploading... (Attempt ${attempt}/${maxRetries})`);
          }
          
          // Use the correct upload function
          const result = onProgress 
            ? await uploadVoiceFile(uriToUse, onProgress)
            : await uploadVoiceFileSimple(uriToUse);
          
          this.isUploading = false;
          
          if (result.success && result.fileUrl) {
            console.log('[VoiceService] Upload successful');
            console.log('[VoiceService] File URL:', result.fileUrl);
            
            // Store the result
            this.lastUploadResult = result;
            
            // Call upload complete callback if provided
            if (this.onUploadCompleteCallback) {
              this.onUploadCompleteCallback(result, true);
            }
            
            // Clean up recording file
            if (this.recordingUri) {
              await AudioRecordingService.deleteRecording(this.recordingUri);
              this.recordingUri = null;
            }
            
            return {
              success: true,
              fileUrl: result.fileUrl,
              fileInfo: result.fileInfo
            };
          } else {
            lastError = new Error(result.error || 'Upload failed - no valid response from server');
          }
        } catch (attemptError) {
          console.error(`[VoiceService] Upload attempt ${attempt} failed:`, attemptError);
          lastError = attemptError;
          
          // Wait before retry (except on last attempt)
          if (attempt < maxRetries) {
            if (onProgress) {
              onProgress(0, `Retrying in 2 seconds... (${attempt}/${maxRetries})`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // All attempts failed
      this.isUploading = false;
      console.log('[VoiceService] All upload attempts failed:', lastError);
      if (this.onErrorCallback) {
        this.onErrorCallback(lastError.message);
      }
      return { success: false, error: lastError.message };
      
    } catch (error) {
      console.error('[VoiceService] Upload error:', error);
      this.isUploading = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message);
      }
      return { success: false, error: error.message };
    }
  }

  // Upload without progress using correct function
  async uploadVoiceFileSimple(audioUri = null, maxRetries = 2) {
    try {
      console.log('[VoiceService] Starting simple voice file upload...');
      
      const uriToUse = audioUri || this.recordingUri;
      
      if (!uriToUse) {
        throw new Error('No recording to upload');
      }
      
      // Check API status first
      if (this.voiceApiStatus === 'failed') {
        const apiWorking = await this.checkVoiceAPI();
        if (!apiWorking) {
          throw new Error('Voice API is currently unavailable');
        }
      }
      
      this.isUploading = true;
      
      let lastError;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[VoiceService] Simple upload attempt ${attempt}/${maxRetries}`);
          
          // Use the correct upload function
          const result = await uploadVoiceFileSimple(uriToUse);
          
          this.isUploading = false;
          
          if (result.success && result.fileUrl) {
            console.log('[VoiceService] Simple upload successful');
            console.log('[VoiceService] File URL:', result.fileUrl);
            
            // Store the result
            this.lastUploadResult = result;
            
            // Call upload complete callback if provided
            if (this.onUploadCompleteCallback) {
              this.onUploadCompleteCallback(result, true);
            }
            
            // Clean up recording file
            if (this.recordingUri) {
              await AudioRecordingService.deleteRecording(this.recordingUri);
              this.recordingUri = null;
            }
            
            return {
              success: true,
              fileUrl: result.fileUrl,
              fileInfo: result.fileInfo
            };
          } else {
            lastError = new Error(result.error || 'Upload failed');
          }
        } catch (attemptError) {
          console.error(`[VoiceService] Simple upload attempt ${attempt} failed:`, attemptError);
          lastError = attemptError;
          
          // Wait before retry (except on last attempt)
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // All attempts failed
      this.isUploading = false;
      console.log('[VoiceService] All simple upload attempts failed:', lastError);
      if (this.onErrorCallback) {
        this.onErrorCallback(lastError.message);
      }
      return { success: false, error: lastError.message };
      
    } catch (error) {
      console.error('[VoiceService] Simple upload error:', error);
      this.isUploading = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message);
      }
      return { success: false, error: error.message };
    }
  }

  // Get current status with enhanced information
  getCurrentStatus() {
    return {
      isInitialized: this.isInitialized,
      isRecording: this.isRecording,
      isUploading: this.isUploading,
      recordingDuration: this.recordingDuration,
      hasRecording: !!this.recordingUri,
      voiceApiStatus: this.voiceApiStatus,
      recordingUri: this.recordingUri,
      lastUploadResult: this.lastUploadResult
    };
  }

  // Get recording duration (real-time)
  getRecordingDuration() {
    return this.recordingDuration;
  }

  // Check if currently recording
  isCurrentlyRecording() {
    return this.isRecording;
  }

  // Check if currently uploading
  isCurrentlyUploading() {
    return this.isUploading;
  }

  // Check if has a recorded file ready for upload
  hasRecordedAudio() {
    return !!this.recordingUri;
  }

  // Get the recorded audio URI
  getRecordedAudioUri() {
    return this.recordingUri;
  }

  // Get last upload result
  getLastUploadResult() {
    return this.lastUploadResult;
  }

  // Set upload complete callback
  setUploadCompleteCallback(callback) {
    this.onUploadCompleteCallback = callback;
  }

  // Set error callback
  setErrorCallback(callback) {
    this.onErrorCallback = callback;
  }

  // Format duration for display
  formatDuration(seconds = null) {
    const duration = seconds !== null ? seconds : this.recordingDuration;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Complete workflow: record → stop → upload
  async startRecordingWorkflow(onDurationUpdate = null, onUploadComplete = null, onError = null) {
    this.onUploadCompleteCallback = onUploadComplete;
    this.onErrorCallback = onError;
    
    return await this.startRecording(onDurationUpdate, onError);
  }

  async stopRecordingWorkflow() {
    return await this.stopRecording();
  }

  async completeUploadWorkflow(onProgress = null) {
    if (!this.recordingUri) {
      return { success: false, error: 'No recording available' };
    }
    
    return await this.uploadVoiceFile(this.recordingUri, onProgress);
  }

  // Enhanced cleanup with comprehensive state reset
  async cleanup() {
    try {
      console.log('[VoiceService] Cleaning up voice service...');
      
      // Stop any active recording
      if (this.isRecording) {
        await AudioRecordingService.cancelRecording();
      }
      
      // Delete any existing recording file
      if (this.recordingUri) {
        await AudioRecordingService.deleteRecording(this.recordingUri);
      }
      
      // Reset all states
      this.isRecording = false;
      this.isUploading = false;
      this.recordingUri = null;
      this.recordingDuration = 0;
      this.onDurationUpdateCallback = null;
      this.onUploadCompleteCallback = null;
      this.onErrorCallback = null;
      this.lastUploadResult = null;
      
      console.log('[VoiceService] Cleanup completed');
    } catch (error) {
      console.error('[VoiceService] Error during cleanup:', error);
      // Force reset states even if cleanup fails
      this.isRecording = false;
      this.isUploading = false;
      this.recordingUri = null;
      this.recordingDuration = 0;
      this.lastUploadResult = null;
    }
  }

  // Get system health status
  async getSystemHealthStatus() {
    try {
      const audioStatus = await AudioRecordingService.getAudioStatus();
      const apiStatus = this.voiceApiStatus;
      
      return {
        overall: audioStatus.permissionsGranted && apiStatus === 'working' ? 'healthy' : 'issues',
        audio: audioStatus,
        api: {
          status: apiStatus,
          lastChecked: new Date().toISOString()
        },
        service: {
          isInitialized: this.isInitialized,
          isRecording: this.isRecording,
          isUploading: this.isUploading,
          hasRecording: this.hasRecordedAudio(),
          lastUploadResult: this.lastUploadResult
        }
      };
    } catch (error) {
      console.error('[VoiceService] Failed to get system health status:', error);
      return {
        overall: 'error',
        error: error.message
      };
    }
  }

  // Reset the service for troubleshooting
  async resetService() {
    try {
      console.log('[VoiceService] Resetting voice service...');
      
      // Cancel any active operations
      if (this.isRecording) {
        await this.cancelRecording();
      }
      
      // Reset audio system
      await AudioRecordingService.resetAudioSystem();
      
      // Reset service state
      this.isInitialized = false;
      this.voiceApiStatus = 'unknown';
      await this.cleanup();
      
      console.log('[VoiceService] Service reset complete');
      return { success: true };
      
    } catch (error) {
      console.error('[VoiceService] Service reset failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new VoiceService();