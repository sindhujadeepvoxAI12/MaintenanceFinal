// Voice service for speech recognition functionality
// COMMENTED OUT DUE TO BUILD ISSUES WITH @react-native-voice/voice@3.2.4
/*
let Voice = null;

// Import @react-native-voice/voice for voice-to-text functionality
try {
  Voice = require('@react-native-voice/voice').default || require('@react-native-voice/voice');
} catch (error) {
  console.log('@react-native-voice/voice not available');
  Voice = null;
}
*/

/*
class VoiceService {
  constructor() {
    this.isRecording = false;
    this.isSupported = !!Voice;
    this.mockMode = !Voice;
    this._unbindHandlers = null;
  }

  async requestPermissions() {
    if (this.mockMode) {
      return false;
    }
    // @react-native-voice/voice does not provide a built-in permission API.
    // Assume permissions are declared in app config and handled by the OS.
    // If runtime permission handling is needed, integrate react-native-permissions.
    return true;
  }

  async startRecording(onResult, onError) {
    if (this.mockMode) {
      onError('Voice recording requires a development build. Please build the app to use this feature.');
      return false;
    }

    try {
      // Ensure basic support and (optionally) permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        onError('Speech recognition permission denied');
        return false;
      }

      if (this.isRecording) {
        onError('Already recording');
        return false;
      }

      this.isRecording = true;
      
      // Bind event handlers
      const handleResults = (event) => {
        try {
          const values = event && event.value ? event.value : [];
          if (values.length > 0) {
            onResult(values[0], true);
          }
        } catch (e) {
          onError(e?.message || 'Failed to process speech results');
        }
      };

      const handlePartialResults = (event) => {
        try {
          const values = event && event.value ? event.value : [];
          if (values.length > 0) {
            onResult(values[0], false);
          }
        } catch (e) {
          // Ignore partial parse errors
        }
      };

      const handleError = (event) => {
        this.isRecording = false;
        const message = (event && event.error && event.error.message) || event?.message || 'Speech recognition error';
        onError(message);
      };

      // Newer versions support addListener; older use property assignment
      if (typeof Voice.addListener === 'function') {
        const subs = [
          Voice.addListener('onSpeechResults', handleResults),
          Voice.addListener('onSpeechPartialResults', handlePartialResults),
          Voice.addListener('onSpeechError', handleError)
        ];
        this._unbindHandlers = () => {
          subs.forEach((s) => {
            try { s.remove(); } catch (_) {}
          });
        };
      } else {
        Voice.onSpeechResults = handleResults;
        Voice.onSpeechPartialResults = handlePartialResults;
        Voice.onSpeechError = handleError;
        this._unbindHandlers = () => {
          try { Voice.onSpeechResults = null; } catch (_) {}
          try { Voice.onSpeechPartialResults = null; } catch (_) {}
          try { Voice.onSpeechError = null; } catch (_) {}
        };
      }

      await Voice.start('en-US');
      return true;
    } catch (error) {
      this.isRecording = false;
      onError(error.message || 'Failed to start recording');
      return false;
    }
  }

  async stopRecording() {
    if (this.mockMode) {
      this.isRecording = false;
      return true;
    }

    try {
      if (!this.isRecording) {
        return false;
      }
      await Voice.stop();
      if (this._unbindHandlers) {
        this._unbindHandlers();
        this._unbindHandlers = null;
      }
      this.isRecording = false;
      return true;
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.isRecording = false;
      return false;
    }
  }

  isCurrentlyRecording() {
    return this.isRecording;
  }

  isSpeechSupported() {
    return this.isSupported;
  }
}

export default new VoiceService();
*/

// Mock voice service to prevent build errors - voice functionality commented out
const mockVoiceService = {
  isRecording: false,
  isSupported: false,
  mockMode: true,
  async requestPermissions() { return false; },
  async startRecording() { return false; },
  async stopRecording() { return false; },
  isCurrentlyRecording() { return false; },
  isSpeechSupported() { return false; }
};

export default mockVoiceService;
