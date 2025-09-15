// AudioRecordingService.js - FIXED for production builds with proper iOS configuration
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

class AudioRecordingService {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.audioUri = null;
    this.recordingDuration = 0;
    this.recordingInterval = null;
    this.onDurationUpdate = null;
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

  async startRecording(onDurationUpdate = null) {
    try {
      console.log('[AudioRecording] Starting audio recording...');
      
      // Store duration callback
      this.onDurationUpdate = onDurationUpdate;
      
      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Audio recording permission not granted');
      }

      // FIXED: Use correct iOS audio mode configuration
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        // FIXED: Use numeric constants instead of long strings
        interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
      });

      // Use COMPATIBLE recording options for both dev and production
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 96000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 96000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 96000,
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      this.recording = recording;
      this.isRecording = true;
      this.recordingDuration = 0;
      
      // Start REAL-TIME duration counter
      this.recordingInterval = setInterval(() => {
        this.recordingDuration += 1;
        // Call duration update callback if provided
        if (this.onDurationUpdate) {
          this.onDurationUpdate(this.recordingDuration);
        }
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
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: true,
        staysActiveInBackground: false,
      });
      
      const uri = this.recording.getURI();
      this.audioUri = uri;
      
      // Get recording info and validate size
      const info = await FileSystem.getInfoAsync(uri);
      const duration = this.recordingDuration;
      
      console.log('[AudioRecording] Recording stopped. URI:', uri, 'Duration:', duration, 'seconds');
      console.log('[AudioRecording] File info:', info);
      
      // Check file size (10MB limit)
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (info.size > maxSizeBytes) {
        // Cleanup large file
        await this.deleteRecording(uri);
        this.cleanup();
        return { 
          success: false, 
          error: `Recording too large: ${Math.round(info.size / 1024 / 1024)}MB (max: 10MB)` 
        };
      }
      
      // Cleanup interval but keep other data
      this.clearDurationInterval();
      
      return { 
        success: true, 
        uri: uri,
        duration: duration,
        fileSize: info.size || 0,
        fileSizeFormatted: `${Math.round((info.size || 0) / 1024)}KB`
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
          playsInSilentModeIOS: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: true,
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

  clearDurationInterval() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  cleanup() {
    this.recording = null;
    this.isRecording = false;
    this.recordingDuration = 0;
    this.onDurationUpdate = null;
    this.clearDurationInterval();
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

  // Validate recording before upload
  async validateRecording(uri) {
    try {
      if (!uri) {
        return { valid: false, error: 'No recording URI provided' };
      }

      const info = await FileSystem.getInfoAsync(uri);
      
      if (!info.exists) {
        return { valid: false, error: 'Recording file does not exist' };
      }

      // Check file size
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (info.size > maxSizeBytes) {
        return { 
          valid: false, 
          error: `File too large: ${Math.round(info.size / 1024 / 1024)}MB (max: 10MB)` 
        };
      }

      const minSizeBytes = 1024; // 1KB
      if (info.size < minSizeBytes) {
        return { 
          valid: false, 
          error: 'Recording too short or corrupted' 
        };
      }

      return {
        valid: true,
        fileInfo: {
          size: info.size,
          uri: uri,
          sizeFormatted: `${Math.round(info.size / 1024)}KB`
        }
      };

    } catch (error) {
      console.error('[AudioRecording] Validation error:', error);
      return { valid: false, error: `Validation failed: ${error.message}` };
    }
  }
}

export default new AudioRecordingService();