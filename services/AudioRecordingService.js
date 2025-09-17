// AudioRecordingService.js - CLEAN version for recording only
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
    this.isInitialized = false;
  }

  async requestPermissions() {
    try {
      console.log('[AudioRecording] Requesting permissions...');
      
      // Check current permissions
      const currentPerms = await Audio.getPermissionsAsync();
      console.log('[AudioRecording] Current permissions:', currentPerms);
      
      if (currentPerms.status === 'granted') {
        console.log('[AudioRecording] Permissions already granted');
        return true;
      }
      
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      console.log('[AudioRecording] Permission request result:', permission);
      
      if (permission.status === 'granted') {
        console.log('[AudioRecording] Permissions granted successfully');
        return true;
      }
      
      console.log('[AudioRecording] Permissions denied');
      return false;
    } catch (error) {
      console.error('[AudioRecording] Permission request failed:', error);
      return false;
    }
  }

  async setCompatibleAudioMode() {
    try {
      console.log('[AudioRecording] Setting compatible audio mode...');
      
      // Try the most compatible audio mode settings
      const audioModeOptions = [
        // Option 1: Full compatibility mode
        {
          name: 'Full Compatibility',
          config: {
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          }
        },
        // Option 2: Minimal mode
        {
          name: 'Minimal',
          config: {
            allowsRecordingIOS: true,
          }
        }
      ];
      
      for (const { name, config } of audioModeOptions) {
        try {
          console.log(`[AudioRecording] Trying ${name} audio mode...`);
          await Audio.setAudioModeAsync(config);
          console.log(`[AudioRecording] ${name} audio mode set successfully`);
          return true;
        } catch (error) {
          console.error(`[AudioRecording] ${name} audio mode failed:`, error);
        }
      }
      
      throw new Error('All audio mode configurations failed');
    } catch (error) {
      console.error('[AudioRecording] Audio mode setup failed:', error);
      throw error;
    }
  }

  getCompatibleRecordingOptions() {
    // Use the most compatible options that actually capture audio data
    const options = {
      android: {
        extension: '.m4a',
        outputFormat: 2, // MPEG_4
        audioEncoder: 3, // AAC
        sampleRate: 22050, // Lower sample rate for better compatibility
        numberOfChannels: 1,
        bitRate: 64000, // Lower bitrate for better compatibility
      },
      ios: {
        extension: '.m4a',
        outputFormat: 'mp4a', // MPEG4AAC
        audioQuality: 64000, // Medium quality for better compatibility
        sampleRate: 22050, // Lower sample rate
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm;codecs=opus',
        bitsPerSecond: 64000,
      },
    };

    console.log('[AudioRecording] Using recording options for', Platform.OS);
    return options;
  }

  async testRecordingWithDataValidation() {
    try {
      console.log('[AudioRecording] Testing recording with data validation...');
      
      const options = this.getCompatibleRecordingOptions();
      const { recording } = await Audio.Recording.createAsync(options);
      
      // Record for 2 seconds to ensure we get audio data
      console.log('[AudioRecording] Recording test data for 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Stop and check if we got valid data
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        throw new Error('No recording URI generated');
      }
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('[AudioRecording] Test recording file info:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('Test recording file not created');
      }
      
      if (fileInfo.size < 1000) { // Less than 1KB suggests no audio data
        await FileSystem.deleteAsync(uri);
        throw new Error('Test recording contains no valid audio data (file too small)');
      }
      
      // Clean up test file
      await FileSystem.deleteAsync(uri);
      console.log('[AudioRecording] Test recording validation passed');
      return true;
      
    } catch (error) {
      console.error('[AudioRecording] Recording test failed:', error);
      throw error;
    }
  }

  async initialize() {
    try {
      if (this.isInitialized) return true;
      
      console.log('[AudioRecording] Initializing audio system...');
      
      // Step 1: Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted. Please enable microphone access in your device settings.');
      }
      
      // Step 2: Set compatible audio mode
      await this.setCompatibleAudioMode();
      
      // Step 3: Test recording with actual data validation
      await this.testRecordingWithDataValidation();
      
      this.isInitialized = true;
      console.log('[AudioRecording] Audio system initialized successfully');
      return true;
      
    } catch (error) {
      console.error('[AudioRecording] Initialization failed:', error);
      this.isInitialized = false;
      
      // Provide specific error messages for common issues
      if (error.message.includes('permission')) {
        throw new Error('Microphone permission required. Please enable microphone access in your device settings and restart the app.');
      } else if (error.message.includes('no valid audio data')) {
        throw new Error('Microphone not accessible. Please check if another app is using the microphone or if microphone hardware is working properly.');
      } else if (error.message.includes('not created')) {
        throw new Error('Audio recording system not available on this device.');
      } else {
        throw new Error(`Audio system initialization failed: ${error.message}`);
      }
    }
  }

  async startRecording(onDurationUpdate = null) {
    try {
      console.log('[AudioRecording] Starting recording...');
      
      // Initialize if not done
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Store callback
      this.onDurationUpdate = onDurationUpdate;
      
      // Clean up any existing recording
      if (this.recording) {
        await this.cleanup();
      }
      
      // Set audio mode before recording
      await this.setCompatibleAudioMode();
      
      // Create recording
      const options = this.getCompatibleRecordingOptions();
      console.log('[AudioRecording] Creating recording...');
      
      const { recording } = await Audio.Recording.createAsync(options);
      
      this.recording = recording;
      this.isRecording = true;
      this.recordingDuration = 0;
      this.audioUri = null;
      
      // Start duration counter
      this.recordingInterval = setInterval(() => {
        this.recordingDuration += 1;
        if (this.onDurationUpdate) {
          this.onDurationUpdate(this.recordingDuration);
        }
      }, 1000);
      
      console.log('[AudioRecording] Recording started successfully');
      return { success: true };
      
    } catch (error) {
      console.error('[AudioRecording] Failed to start recording:', error);
      this.isRecording = false;
      await this.cleanup();
      
      let errorMessage = error.message;
      if (error.message.includes('busy') || error.message.includes('in use')) {
        errorMessage = 'Microphone is being used by another app. Please close other apps that might be using the microphone and try again.';
      } else if (error.message.includes('not available')) {
        errorMessage = 'Microphone not available. Please check your device microphone permissions and hardware.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async stopRecording() {
    try {
      console.log('[AudioRecording] Stopping recording...');
      
      if (!this.recording) {
        return { success: false, error: 'No active recording' };
      }
      
      // Ensure we recorded for at least 1 second to have valid data
      if (this.recordingDuration < 1) {
        console.log('[AudioRecording] Recording too short, continuing for 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Stop recording
      await this.recording.stopAndUnloadAsync();
      
      const uri = this.recording.getURI();
      this.audioUri = uri;
      
      // Reset audio mode
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
      } catch (resetError) {
        console.warn('[AudioRecording] Audio mode reset failed:', resetError);
      }
      
      // Validate recording
      if (!uri) {
        throw new Error('Recording failed - no file URI generated');
      }
      
      const info = await FileSystem.getInfoAsync(uri);
      const duration = this.recordingDuration;
      
      console.log('[AudioRecording] Recording stopped:', {
        uri,
        duration,
        fileSize: info.size,
        fileExists: info.exists
      });
      
      if (!info.exists) {
        throw new Error('Recording file was not created');
      }
      
      // Check for valid audio data
      const minSize = 2000; // At least 2KB for valid audio
      const maxSize = 10 * 1024 * 1024; // 10MB max
      
      if (info.size < minSize) {
        await this.deleteRecording(uri);
        this.cleanup();
        return { 
          success: false, 
          error: 'Recording failed - no audio data captured. Please check microphone permissions and try speaking closer to the microphone.' 
        };
      }
      
      if (info.size > maxSize) {
        await this.deleteRecording(uri);
        this.cleanup();
        return { 
          success: false, 
          error: `Recording too large: ${Math.round(info.size / 1024 / 1024)}MB (max: 10MB)` 
        };
      }
      
      // Success
      this.clearDurationInterval();
      this.isRecording = false;
      
      return { 
        success: true, 
        uri,
        duration,
        fileSize: info.size,
        fileSizeFormatted: `${Math.round(info.size / 1024)}KB`
      };
      
    } catch (error) {
      console.error('[AudioRecording] Stop recording failed:', error);
      this.cleanup();
      
      if (error.message.includes('no audio data')) {
        return { 
          success: false, 
          error: 'No audio was recorded. Please check microphone permissions and ensure you are speaking into the microphone.' 
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  async cancelRecording() {
    try {
      console.log('[AudioRecording] Cancelling recording...');
      
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
          const uri = this.recording.getURI();
          if (uri) {
            await this.deleteRecording(uri);
          }
        } catch (error) {
          console.warn('[AudioRecording] Error during cancel:', error);
        }
      }
      
      // Reset audio mode
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (error) {
        console.warn('[AudioRecording] Audio mode reset failed during cancel:', error);
      }
      
      this.cleanup();
      return { success: true };
      
    } catch (error) {
      console.error('[AudioRecording] Cancel failed:', error);
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
      console.error('[AudioRecording] Delete failed:', error);
    }
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async validateRecording(uri) {
    try {
      if (!uri) {
        return { valid: false, error: 'No recording URI provided' };
      }

      const info = await FileSystem.getInfoAsync(uri);
      
      if (!info.exists) {
        return { valid: false, error: 'Recording file does not exist' };
      }

      const minSize = 2000; // At least 2KB for valid audio
      const maxSize = 10 * 1024 * 1024; // 10MB max
      
      if (info.size < minSize) {
        return { 
          valid: false, 
          error: 'Recording contains no valid audio data' 
        };
      }

      if (info.size > maxSize) {
        return { 
          valid: false, 
          error: `File too large: ${Math.round(info.size / 1024 / 1024)}MB (max: 10MB)` 
        };
      }

      return {
        valid: true,
        fileInfo: {
          size: info.size,
          uri,
          sizeFormatted: `${Math.round(info.size / 1024)}KB`
        }
      };

    } catch (error) {
      console.error('[AudioRecording] Validation error:', error);
      return { valid: false, error: `Validation failed: ${error.message}` };
    }
  }

  async getAudioStatus() {
    try {
      const permissions = await Audio.getPermissionsAsync();
      return {
        permissionsGranted: permissions.status === 'granted',
        isInitialized: this.isInitialized,
        isRecording: this.isRecording,
        recordingDuration: this.recordingDuration,
        hasRecording: !!this.audioUri,
        platform: Platform.OS,
        permissionDetails: permissions
      };
    } catch (error) {
      console.error('[AudioRecording] Status check failed:', error);
      return {
        permissionsGranted: false,
        isInitialized: false,
        isRecording: false,
        recordingDuration: 0,
        hasRecording: false,
        error: error.message,
        platform: Platform.OS
      };
    }
  }

  // Reset everything for troubleshooting
  async resetAudioSystem() {
    try {
      console.log('[AudioRecording] Resetting audio system...');
      
      // Cancel any active recording
      if (this.isRecording) {
        await this.cancelRecording();
      }
      
      // Reset initialization
      this.isInitialized = false;
      
      // Try to reset audio mode
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
      } catch (error) {
        console.warn('[AudioRecording] Audio mode reset warning:', error);
      }
      
      this.cleanup();
      console.log('[AudioRecording] Audio system reset complete');
      return { success: true };
      
    } catch (error) {
      console.error('[AudioRecording] Reset failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AudioRecordingService();