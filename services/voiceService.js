// services/voiceService.js - Updated wrapper service for voice functionality
import AudioRecordingService from './AudioRecordingService';
import { uploadVoiceForTranscription, uploadVoiceWithProgress, testVoiceAPI } from './BackendVoiceUploadService';

class VoiceService {
  constructor() {
    this.isRecording = false;
    this.isTranscribing = false;
    this.recordingUri = null;
    this.recordingDuration = 0;
    this.onDurationUpdateCallback = null;
    this.onTranscriptCallback = null;
    this.onErrorCallback = null;
    this.voiceApiStatus = 'unknown'; // 'working', 'failed', 'unknown'
  }

  // Test voice API connection
  async checkVoiceAPI() {
    try {
      const isWorking = await testVoiceAPI();
      this.voiceApiStatus = isWorking ? 'working' : 'failed';
      console.log('[VoiceService] API status:', this.voiceApiStatus);
      return isWorking;
    } catch (error) {
      this.voiceApiStatus = 'failed';
      console.error('[VoiceService] API test error:', error);
      return false;
    }
  }

  // Start recording with real-time duration updates
  async startRecording(onDurationUpdate = null, onError = null) {
    try {
      console.log('[VoiceService] Starting recording...');
      
      // Store callbacks
      this.onDurationUpdateCallback = onDurationUpdate;
      this.onErrorCallback = onError;
      
      // Reset states
      this.recordingUri = null;
      this.recordingDuration = 0;
      
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

  // Stop recording (does NOT upload automatically)
  async stopRecording() {
    try {
      console.log('[VoiceService] Stopping recording...');
      
      const result = await AudioRecordingService.stopRecording();
      this.isRecording = false;
      
      if (result.success && result.uri) {
        this.recordingUri = result.uri;
        console.log('[VoiceService] Recording stopped successfully');
        console.log('[VoiceService] Duration:', result.duration, 'seconds');
        console.log('[VoiceService] File size:', result.fileSizeFormatted);
        
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

  // Cancel recording and cleanup
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
      this.isRecording = false;
      this.isTranscribing = false;
      this.recordingUri = null;
      this.recordingDuration = 0;
      
      return { success: true };
    } catch (error) {
      console.error('[VoiceService] Error cancelling recording:', error);
      this.isRecording = false;
      this.isTranscribing = false;
      this.recordingUri = null;
      return { success: false, error: error.message };
    }
  }

  // Upload and transcribe recorded audio (separate from stopping)
  async uploadAndTranscribe(audioUri = null, onProgress = null) {
    try {
      console.log('[VoiceService] Starting upload and transcription...');
      
      const uriToUse = audioUri || this.recordingUri;
      
      if (!uriToUse) {
        throw new Error('No recording to upload');
      }
      
      // Check API status first
      if (this.voiceApiStatus === 'failed') {
        throw new Error('Voice API is currently unavailable');
      }
      
      this.isTranscribing = true;
      
      // Upload with progress tracking
      const result = await uploadVoiceWithProgress(uriToUse, onProgress);
      
      this.isTranscribing = false;
      
      if (result.success && result.transcription) {
        const transcribedText = result.transcription.trim();
        console.log('[VoiceService] Transcription successful:', transcribedText);
        
        // Call transcript callback if provided
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(transcribedText, true);
        }
        
        // Clean up recording file
        if (this.recordingUri) {
          await AudioRecordingService.deleteRecording(this.recordingUri);
          this.recordingUri = null;
        }
        
        return {
          success: true,
          transcription: transcribedText,
          audioUrl: result.audioUrl,
          fileInfo: result.fileInfo
        };
      } else {
        console.log('[VoiceService] Transcription failed:', result);
        if (this.onErrorCallback) {
          this.onErrorCallback('Transcription failed');
        }
        return { success: false, error: 'Transcription failed' };
      }
    } catch (error) {
      console.error('[VoiceService] Upload/transcription error:', error);
      this.isTranscribing = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message);
      }
      return { success: false, error: error.message };
    }
  }

  // Upload without progress tracking (simpler version)
  async uploadAndTranscribeSimple(audioUri = null) {
    try {
      console.log('[VoiceService] Starting simple upload and transcription...');
      
      const uriToUse = audioUri || this.recordingUri;
      
      if (!uriToUse) {
        throw new Error('No recording to upload');
      }
      
      // Check API status first
      if (this.voiceApiStatus === 'failed') {
        throw new Error('Voice API is currently unavailable');
      }
      
      this.isTranscribing = true;
      
      // Upload without progress tracking
      const result = await uploadVoiceForTranscription(uriToUse);
      
      this.isTranscribing = false;
      
      if (result.success && result.transcription) {
        const transcribedText = result.transcription.trim();
        console.log('[VoiceService] Transcription successful:', transcribedText);
        
        // Call transcript callback if provided
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(transcribedText, true);
        }
        
        // Clean up recording file
        if (this.recordingUri) {
          await AudioRecordingService.deleteRecording(this.recordingUri);
          this.recordingUri = null;
        }
        
        return {
          success: true,
          transcription: transcribedText,
          audioUrl: result.audioUrl
        };
      } else {
        console.log('[VoiceService] Transcription failed:', result);
        if (this.onErrorCallback) {
          this.onErrorCallback('Transcription failed');
        }
        return { success: false, error: 'Transcription failed' };
      }
    } catch (error) {
      console.error('[VoiceService] Upload/transcription error:', error);
      this.isTranscribing = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message);
      }
      return { success: false, error: error.message };
    }
  }

  // Get current status
  getCurrentStatus() {
    return {
      isRecording: this.isRecording,
      isTranscribing: this.isTranscribing,
      recordingDuration: this.recordingDuration,
      hasRecording: !!this.recordingUri,
      voiceApiStatus: this.voiceApiStatus
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

  // Check if currently transcribing
  isCurrentlyTranscribing() {
    return this.isTranscribing;
  }

  // Check if has a recorded file ready for upload
  hasRecordedAudio() {
    return !!this.recordingUri;
  }

  // Get the recorded audio URI
  getRecordedAudioUri() {
    return this.recordingUri;
  }

  // Set transcript callback
  setTranscriptCallback(callback) {
    this.onTranscriptCallback = callback;
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

  // Complete workflow: record → stop → upload → transcribe
  async startRecordingWorkflow(onDurationUpdate = null, onTranscript = null, onError = null) {
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;
    
    return await this.startRecording(onDurationUpdate, onError);
  }

  async stopRecordingWorkflow() {
    return await this.stopRecording();
  }

  async completeWorkflow(onProgress = null) {
    if (!this.recordingUri) {
      return { success: false, error: 'No recording available' };
    }
    
    return await this.uploadAndTranscribe(this.recordingUri, onProgress);
  }

  // Cleanup all states
  cleanup() {
    this.isRecording = false;
    this.isTranscribing = false;
    this.recordingUri = null;
    this.recordingDuration = 0;
    this.onDurationUpdateCallback = null;
    this.onTranscriptCallback = null;
    this.onErrorCallback = null;
  }
}

export default new VoiceService();