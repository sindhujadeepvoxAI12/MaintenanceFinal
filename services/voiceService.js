// services/voiceService.js - Wrapper service for voice functionality
import AudioRecordingService from './AudioRecordingService';
import { uploadVoiceForTranscription, uploadVoiceWithProgress } from './BackendVoiceUploadService';

class VoiceService {
  constructor() {
    this.isRecording = false;
    this.isTranscribing = false;
    this.onTranscriptCallback = null;
    this.onErrorCallback = null;
  }

  async startRecording(onTranscript, onError) {
    try {
      console.log('[VoiceService] Starting recording...');
      this.onTranscriptCallback = onTranscript;
      this.onErrorCallback = onError;
      
      const result = await AudioRecordingService.startRecording();
      
      if (result.success) {
        this.isRecording = true;
        console.log('[VoiceService] Recording started successfully');
        return true;
      } else {
        console.log('[VoiceService] Failed to start recording:', result.error);
        if (onError) onError(result.error);
        return false;
      }
    } catch (error) {
      console.error('[VoiceService] Error starting recording:', error);
      if (onError) onError(error.message);
      return false;
    }
  }

  async stopRecording() {
    try {
      console.log('[VoiceService] Stopping recording...');
      
      const result = await AudioRecordingService.stopRecording();
      this.isRecording = false;
      
      if (result.success && result.uri) {
        console.log('[VoiceService] Recording stopped, starting transcription...');
        this.isTranscribing = true;
        
        // Start transcription
        const transcriptionResult = await uploadVoiceForTranscription(result.uri);
        
        this.isTranscribing = false;
        
        if (transcriptionResult.success && transcriptionResult.transcription) {
          console.log('[VoiceService] Transcription successful:', transcriptionResult.transcription);
          
          if (this.onTranscriptCallback) {
            this.onTranscriptCallback(transcriptionResult.transcription, true);
          }
          
          return {
            success: true,
            transcription: transcriptionResult.transcription,
            audioUrl: transcriptionResult.audioUrl
          };
        } else {
          console.log('[VoiceService] Transcription failed');
          if (this.onErrorCallback) {
            this.onErrorCallback('Transcription failed');
          }
          return { success: false, error: 'Transcription failed' };
        }
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
      this.isTranscribing = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error.message);
      }
      return { success: false, error: error.message };
    }
  }

  async cancelRecording() {
    try {
      console.log('[VoiceService] Cancelling recording...');
      
      const result = await AudioRecordingService.cancelRecording();
      this.isRecording = false;
      this.isTranscribing = false;
      
      return result;
    } catch (error) {
      console.error('[VoiceService] Error cancelling recording:', error);
      this.isRecording = false;
      this.isTranscribing = false;
      return { success: false, error: error.message };
    }
  }

  getCurrentStatus() {
    return {
      isRecording: this.isRecording,
      isTranscribing: this.isTranscribing,
      recordingDuration: AudioRecordingService.getRecordingDuration()
    };
  }

  cleanup() {
    this.isRecording = false;
    this.isTranscribing = false;
    this.onTranscriptCallback = null;
    this.onErrorCallback = null;
  }
}

export default new VoiceService();