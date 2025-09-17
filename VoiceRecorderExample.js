// VoiceRecorderExample.js - Example usage of voice recording and upload
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import VoiceService from './services/voiceService';

const VoiceRecorderExample = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [lastUploadResult, setLastUploadResult] = useState(null);
  const [serviceStatus, setServiceStatus] = useState('unknown');

  useEffect(() => {
    initializeService();
    
    // Set up callbacks
    VoiceService.setUploadCompleteCallback((result, success) => {
      console.log('Upload complete:', result);
      setLastUploadResult(result);
      setIsUploading(false);
      
      if (success && result.fileUrl) {
        Alert.alert(
          'Upload Successful!',
          `Voice file uploaded successfully!\n\nFile URL: ${result.fileUrl.substring(0, 50)}...`,
          [{ text: 'OK' }]
        );
      }
    });

    VoiceService.setErrorCallback((error) => {
      console.log('Voice service error:', error);
      Alert.alert('Error', error, [{ text: 'OK' }]);
      setIsRecording(false);
      setIsUploading(false);
    });

    return () => {
      // Cleanup on unmount
      VoiceService.cleanup();
    };
  }, []);

  const initializeService = async () => {
    try {
      const initialized = await VoiceService.initialize();
      setServiceStatus(initialized ? 'ready' : 'failed');
      
      if (!initialized) {
        Alert.alert(
          'Initialization Failed',
          'Failed to initialize voice service. Please check microphone permissions.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Service initialization error:', error);
      setServiceStatus('error');
    }
  };

  const startRecording = async () => {
    try {
      const result = await VoiceService.startRecording(
        (duration) => {
          setRecordingDuration(duration);
        },
        (error) => {
          Alert.alert('Recording Error', error, [{ text: 'OK' }]);
        }
      );

      if (result.success) {
        setIsRecording(true);
        setHasRecording(false);
        setLastUploadResult(null);
        setRecordingDuration(0);
      } else {
        Alert.alert('Recording Failed', result.error, [{ text: 'OK' }]);
      }
    } catch (error) {
      Alert.alert('Recording Error', error.message, [{ text: 'OK' }]);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await VoiceService.stopRecording();

      if (result.success) {
        setIsRecording(false);
        setHasRecording(true);
        Alert.alert(
          'Recording Complete',
          `Recorded ${result.duration} seconds (${result.fileSizeFormatted})`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Stop Recording Failed', result.error, [{ text: 'OK' }]);
        setIsRecording(false);
      }
    } catch (error) {
      Alert.alert('Stop Recording Error', error.message, [{ text: 'OK' }]);
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    try {
      await VoiceService.cancelRecording();
      setIsRecording(false);
      setHasRecording(false);
      setRecordingDuration(0);
      setLastUploadResult(null);
    } catch (error) {
      console.error('Cancel recording error:', error);
    }
  };

  const uploadRecording = async () => {
    if (!hasRecording) {
      Alert.alert('No Recording', 'Please record audio first.', [{ text: 'OK' }]);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress('Starting upload...');
      
      const result = await VoiceService.uploadVoiceFile(
        null, // Use the recorded URI
        (progress, message) => {
          setUploadProgress(`${progress}% - ${message}`);
        }
      );

      setIsUploading(false);
      
      if (result.success) {
        setHasRecording(false); // File is uploaded and deleted
        Alert.alert(
          'Upload Successful!',
          `Voice file uploaded successfully!\n\nFile URL: ${result.fileUrl}`,
          [
            {
              text: 'Copy URL',
              onPress: () => {
                // You can implement clipboard copy here if needed
                console.log('File URL:', result.fileUrl);
              }
            },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Upload Failed', result.error, [{ text: 'OK' }]);
      }
    } catch (error) {
      setIsUploading(false);
      Alert.alert('Upload Error', error.message, [{ text: 'OK' }]);
    }
  };

  const uploadRecordingSimple = async () => {
    if (!hasRecording) {
      Alert.alert('No Recording', 'Please record audio first.', [{ text: 'OK' }]);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress('Uploading...');
      
      const result = await VoiceService.uploadVoiceFileSimple();

      setIsUploading(false);
      setUploadProgress('');
      
      if (result.success) {
        setHasRecording(false);
        setLastUploadResult(result);
        Alert.alert(
          'Upload Successful!',
          `Voice file uploaded!\nFile URL: ${result.fileUrl}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Upload Failed', result.error, [{ text: 'OK' }]);
      }
    } catch (error) {
      setIsUploading(false);
      setUploadProgress('');
      Alert.alert('Upload Error', error.message, [{ text: 'OK' }]);
    }
  };

  const checkSystemHealth = async () => {
    try {
      const health = await VoiceService.getSystemHealthStatus();
      Alert.alert(
        'System Status',
        `Overall: ${health.overall}\n\nAudio: ${health.audio?.permissionsGranted ? 'OK' : 'No permissions'}\nAPI: ${health.api?.status}\nService: ${health.service?.isInitialized ? 'Ready' : 'Not initialized'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Status Check Failed', error.message, [{ text: 'OK' }]);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Recorder</Text>
      
      <Text style={styles.status}>
        Status: {serviceStatus} | {isRecording ? 'Recording' : isUploading ? 'Uploading' : 'Ready'}
      </Text>
      
      {isRecording && (
        <Text style={styles.duration}>
          Duration: {formatDuration(recordingDuration)}
        </Text>
      )}
      
      {isUploading && (
        <Text style={styles.progress}>{uploadProgress}</Text>
      )}

      <View style={styles.buttonContainer}>
        {!isRecording && !isUploading && !hasRecording && (
          <TouchableOpacity 
            style={[styles.button, styles.recordButton]} 
            onPress={startRecording}
          >
            <Text style={styles.buttonText}>Start Recording</Text>
          </TouchableOpacity>
        )}

        {isRecording && (
          <>
            <TouchableOpacity 
              style={[styles.button, styles.stopButton]} 
              onPress={stopRecording}
            >
              <Text style={styles.buttonText}>Stop Recording</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={cancelRecording}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {hasRecording && !isUploading && (
          <>
            <TouchableOpacity 
              style={[styles.button, styles.uploadButton]} 
              onPress={uploadRecording}
            >
              <Text style={styles.buttonText}>Upload with Progress</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.uploadButton]} 
              onPress={uploadRecordingSimple}
            >
              <Text style={styles.buttonText}>Upload Simple</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={cancelRecording}
            >
              <Text style={styles.buttonText}>Discard</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.statusButton]} 
        onPress={checkSystemHealth}
      >
        <Text style={styles.buttonText}>Check System Status</Text>
      </TouchableOpacity>

      {lastUploadResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Upload Result:</Text>
          <Text style={styles.resultText}>
            Success: {lastUploadResult.uploadSuccess ? 'Yes' : 'No'}
          </Text>
          {lastUploadResult.fileUrl && (
            <Text style={styles.resultText} numberOfLines={2}>
              URL: {lastUploadResult.fileUrl}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  duration: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
    fontWeight: '600',
  },
  progress: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginVertical: 5,
    minWidth: 200,
  },
  recordButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  uploadButton: {
    backgroundColor: '#34C759',
  },
  statusButton: {
    backgroundColor: '#FF9500',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1976D2',
  },
  resultText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 2,
  },
});

export default VoiceRecorderExample;