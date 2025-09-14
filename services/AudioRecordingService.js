// AudioRecordingService.js - Record audio files for backend transcription
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

class AudioRecordingService {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.audioUri = null;
    this.recordingDuration = 0;
    this.recordingInterval = null;
  }

  async requestPermissions() {
    try {
      console.log('[AudioRecording] Requesting audio permissions...');
      const permission = await Audio.requestPermissionsAsync();
      console.log('[AudioRecording] Permission result:', permission);
      
      if (permission.status !== 'granted') {
        console.log('[AudioRecording] Audio recording permission denied');
        return false;
      }
      return true;
    } catch (error) {
      console.error('[AudioRecording] Error requesting audio permissions:', error);
      return false;
    }
  }

  async startRecording() {
    try {
      console.log('[AudioRecording] Starting audio recording...');
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Audio recording permission not granted');
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Create recording with high quality settings
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      this.recording = recording;
      this.isRecording = true;
      this.recordingDuration = 0;
      
      // Start duration counter
      this.recordingInterval = setInterval(() => {
        this.recordingDuration += 1;
      }, 1000);
      
      console.log('[AudioRecording] Recording started successfully');
      return { success: true };
      
    } catch (error) {
      console.error('[AudioRecording] Failed to start recording:', error);
      this.isRecording = false;
      this.cleanup();
      return { success: false, error: error.message };
    }
  }

  async stopRecording() {
    try {
      console.log('[AudioRecording] Stopping audio recording...');
      
      if (!this.recording) {
        return { success: false, error: 'No active recording' };
      }

      // Stop recording
      await this.recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = this.recording.getURI();
      this.audioUri = uri;
      
      // Get recording info
      const info = await FileSystem.getInfoAsync(uri);
      const duration = this.recordingDuration;
      
      // Cleanup
      this.cleanup();
      
      console.log('[AudioRecording] Recording stopped. URI:', uri, 'Duration:', duration, 'seconds');
      console.log('[AudioRecording] File info:', info);
      
      return { 
        success: true, 
        uri: uri,
        duration: duration,
        fileSize: info.size || 0
      };
      
    } catch (error) {
      console.error('[AudioRecording] Failed to stop recording:', error);
      this.cleanup();
      return { success: false, error: error.message };
    }
  }

  async cancelRecording() {
    try {
      console.log('[AudioRecording] Cancelling audio recording...');
      
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        
        // Delete the recorded file
        const uri = this.recording.getURI();
        if (uri) {
          await this.deleteRecording(uri);
        }
      }
      
      this.cleanup();
      
      return { success: true };
    } catch (error) {
      console.error('[AudioRecording] Failed to cancel recording:', error);
      this.cleanup();
      return { success: false, error: error.message };
    }
  }

  cleanup() {
    this.recording = null;
    this.isRecording = false;
    this.recordingDuration = 0;
    
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  isCurrentlyRecording() {
    return this.isRecording;
  }

  getRecordingDuration() {
    return this.recordingDuration;
  }

  getLastRecordingUri() {
    return this.audioUri;
  }

  async deleteRecording(uri) {
    try {
      if (uri) {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log('[AudioRecording] Deleted recording:', uri);
        }
      }
    } catch (error) {
      console.error('[AudioRecording] Failed to delete recording:', error);
    }
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export default new AudioRecordingService();