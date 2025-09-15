import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useMachine } from '../../contexts/MachineContext';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { getMachinesByUser } from '../../services/machineService';
import { getTasksByWorker, updateTaskHistory } from '../../services/taskService';
import { uploadImage } from '../../services/uploadService';

// Import FIXED voice services
import AudioRecordingService from '../../services/AudioRecordingService';
import { uploadVoiceForTranscription, uploadVoiceWithProgress, testVoiceAPI } from '../../services/BackendVoiceUploadService';

const { width } = Dimensions.get('window');

export default function MaintenanceScreen() {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [currentMachineId, setCurrentMachineId] = useState(null);
  const [noteText, setNoteText] = useState('');
  
  // Animation values for different status categories
  const overdueAnim = useRef(new Animated.Value(0)).current;
  const dueSoonAnim = useRef(new Animated.Value(0)).current;
  const upcomingAnim = useRef(new Animated.Value(0)).current;
  const goodAnim = useRef(new Animated.Value(0)).current;
  
  // Press animation values for interactive cards
  const overduePressAnim = useRef(new Animated.Value(1)).current;
  const dueSoonPressAnim = useRef(new Animated.Value(1)).current;
  const upcomingPressAnim = useRef(new Animated.Value(1)).current;
  const goodPressAnim = useRef(new Animated.Value(1)).current;
  
  // Floating animation values
  const overdueFloatAnim = useRef(new Animated.Value(0)).current;
  const dueSoonFloatAnim = useRef(new Animated.Value(0)).current;
  const upcomingFloatAnim = useRef(new Animated.Value(0)).current;
  const goodFloatAnim = useRef(new Animated.Value(0)).current;
  
  const machineContext = useMachine();
  const { user } = useAuth();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];

  // API-backed machines
  const [apiMachines, setApiMachines] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [noteModal, setNoteModal] = useState({ 
    visible: false, 
    historyId: null, 
    note: '', 
    voiceText: '', 
    image: '',
    recordedAudioUri: '',
    startTime: ''
  });
  const [imageViewer, setImageViewer] = useState({ visible: false, imageUrl: '' });
  
  // COMPLETE Voice recording state management
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState('');
  const [recordingUri, setRecordingUri] = useState('');
  const [showRecordingActions, setShowRecordingActions] = useState(false);
  const [voiceApiStatus, setVoiceApiStatus] = useState('unknown'); // 'working', 'failed', 'unknown'

  const fetchMachines = async () => {
    if (!user?.id) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      console.log('[Maintenance] Fetching data for user ID:', user.id);
      const list = await getMachinesByUser(user.id);
      setApiMachines(Array.isArray(list) ? list : []);
      const taskList = await getTasksByWorker(user.id);
      setTasks(Array.isArray(taskList) ? taskList : []);
      console.log('[Maintenance] Fetched', list?.length || 0, 'machines and', taskList?.length || 0, 'tasks');
    } catch (e) {
      console.error('[Maintenance] Fetch error:', e);
      setFetchError(e?.message || 'Failed to fetch machines');
      setApiMachines([]);
      setTasks([]);
    } finally {
      setIsFetching(false);
    }
  };

  // Test voice API on component mount
  useEffect(() => {
    const checkVoiceAPI = async () => {
      try {
        const isWorking = await testVoiceAPI();
        setVoiceApiStatus(isWorking ? 'working' : 'failed');
        console.log('[Voice] API status:', isWorking ? 'working' : 'failed');
      } catch (error) {
        setVoiceApiStatus('failed');
        console.error('[Voice] API test error:', error);
      }
    };
    
    checkVoiceAPI();
  }, []);

  // ===== COMPLETE VOICE RECORDING SYSTEM =====

  const startVoiceRecording = async () => {
    try {
      console.log('=== STARTING VOICE RECORDING ===');
      
      // Check API status first
      if (voiceApiStatus === 'failed') {
        Alert.alert(
          'Voice API Unavailable',
          'The voice transcription service is currently unavailable. Please try again later or contact support.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Reset all voice states
      setRecordingDuration(0);
      setIsTranscribing(false);
      setTranscriptionProgress('');
      setRecordingUri('');
      setShowRecordingActions(false);
      
      // Start recording with REAL-TIME duration callback
      const result = await AudioRecordingService.startRecording((duration) => {
        console.log('[Voice] Real-time duration update:', duration);
        setRecordingDuration(duration);
      });
      
      if (result.success) {
        setIsRecording(true);
        console.log('[Voice] Recording started successfully');
        
        // Show recording status to user
        setTranscriptionProgress('Recording in progress...');
      } else {
        console.log('[Voice] Failed to start recording:', result.error);
        Alert.alert('Recording Error', result.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('[Voice] Start recording error:', error);
      Alert.alert('Error', 'Failed to start voice recording: ' + error.message);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      console.log('=== STOPPING VOICE RECORDING ===');
      
      const result = await AudioRecordingService.stopRecording();
      setIsRecording(false);
      setTranscriptionProgress('');
      
      if (result.success && result.uri) {
        console.log('[Voice] Recording stopped successfully');
        console.log('[Voice] Final duration:', result.duration, 'seconds');
        console.log('[Voice] File size:', result.fileSizeFormatted);
        console.log('[Voice] File URI:', result.uri);
        
        setRecordingUri(result.uri);
        setShowRecordingActions(true); // Show Cancel/Upload buttons
        
        // Store in modal state for processing
        setNoteModal(prev => ({ 
          ...prev, 
          recordedAudioUri: result.uri 
        }));
        
      } else {
        console.log('[Voice] Recording failed:', result.error);
        Alert.alert('Recording Error', result.error || 'Failed to stop recording');
      }
    } catch (error) {
      console.error('[Voice] Stop recording error:', error);
      Alert.alert('Error', 'Failed to stop voice recording: ' + error.message);
      setIsRecording(false);
    }
  };

  const cancelVoiceRecording = async () => {
    try {
      console.log('=== CANCELLING VOICE RECORDING ===');
      
      if (isRecording) {
        // Cancel active recording
        await AudioRecordingService.cancelRecording();
      } else if (recordingUri) {
        // Delete completed recording
        await AudioRecordingService.deleteRecording(recordingUri);
      }
      
      // Reset all voice states
      setIsRecording(false);
      setRecordingDuration(0);
      setIsTranscribing(false);
      setTranscriptionProgress('');
      setRecordingUri('');
      setShowRecordingActions(false);
      
      // Clear from modal state
      setNoteModal(prev => ({ 
        ...prev, 
        recordedAudioUri: '',
        voiceText: ''
      }));
      
      console.log('[Voice] Recording cancelled and cleaned up');
    } catch (error) {
      console.error('[Voice] Cancel recording error:', error);
      // Reset states anyway to prevent UI getting stuck
      setIsRecording(false);
      setShowRecordingActions(false);
      setTranscriptionProgress('');
    }
  };

  const uploadVoiceRecording = async () => {
    try {
      console.log('=== UPLOADING VOICE TO API ===');
      
      if (!recordingUri) {
        Alert.alert('Error', 'No recording to upload');
        return;
      }
      
      setIsTranscribing(true);
      setTranscriptionProgress('Starting upload...');
      setShowRecordingActions(false);
      
      // Upload ONLY to voice API (not task update yet)
      const result = await uploadVoiceWithProgress(recordingUri, (progress, message) => {
        console.log('[Voice] Upload progress:', progress + '%', message);
        setTranscriptionProgress(message);
      });
      
      console.log('[Voice] Voice API result:', result);
      
      if (result.success && result.transcription) {
        const transcribedText = result.transcription.trim();
        console.log('[Voice] Transcription successful:', transcribedText);
        
        setTranscriptionProgress('Voice transcription complete!');
        
        // Update modal with the transcribed text ONLY (not saving to task yet)
        setNoteModal(prev => ({ 
          ...prev, 
          voiceText: transcribedText,
          note: prev.note + (prev.note ? '\n\n' : '') + transcribedText 
        }));
        
        // Clean up recording file since we got the transcription
        await AudioRecordingService.deleteRecording(recordingUri);
        setRecordingUri('');
        
        // Show success and clear progress after 2 seconds
        setTimeout(() => {
          setTranscriptionProgress('');
        }, 2000);
        
        console.log('[Voice] Transcription added to modal, ready for task save');
        
        Alert.alert(
          'Voice Transcription Complete!', 
          `Successfully transcribed: "${transcribedText.substring(0, 100)}${transcribedText.length > 100 ? '...' : ''}"\n\nThe text has been added to your notes. Click "Save & Complete" to finalize the task.`,
          [{ text: 'OK' }]
        );
        
      } else {
        console.log('[Voice] Transcription failed:', result);
        setTranscriptionProgress('Voice API failed');
        Alert.alert(
          'Transcription Error', 
          'Failed to transcribe audio. Please check your internet connection and try again.',
          [
            { text: 'Cancel', onPress: () => cancelVoiceRecording() },
            { text: 'Retry', onPress: () => uploadVoiceRecording() }
          ]
        );
        setShowRecordingActions(true); // Show buttons again for retry
        
        setTimeout(() => {
          setTranscriptionProgress('');
        }, 3000);
      }
    } catch (error) {
      console.error('[Voice] Upload/transcription error:', error);
      setTranscriptionProgress('Upload failed');
      
      Alert.alert(
        'Upload Error', 
        `Failed to upload audio: ${error.message}\n\nPlease check your internet connection and try again.`,
        [
          { text: 'Cancel', onPress: () => cancelVoiceRecording() },
          { text: 'Retry', onPress: () => uploadVoiceRecording() }
        ]
      );
      setShowRecordingActions(true); // Show buttons again for retry
      
      setTimeout(() => {
        setTranscriptionProgress('');
      }, 3000);
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ===== Task helpers for tabs (Due, Upcoming, History) =====
  const toDate = (value) => {
    if (!value) return null;
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    } catch (_e) {
      return null;
    }
  };

  const now = () => new Date();

  const getDueTasks = () => {
    return (tasks || []).filter((t) => {
      const status = (t.status || '').toLowerCase();
      if (status === 'completed') return false;
      const isDueStatus = ['due', 'incoming', 'inprogress', 'in-progress', 'ongoing'].includes(status);
      const overdue = toDate(t.overdueDate) || toDate(t.dueDate) || toDate(t.endTime);
      const assign = toDate(t.assignDate) || toDate(t.startTime);
      const ref = overdue || assign;
      const isPastOrNow = ref ? ref.getTime() <= now().getTime() : false;
      return isDueStatus || isPastOrNow;
    });
  };

  const getUpcomingTasks = () => {
    return (tasks || []).filter((t) => {
      const status = (t.status || '').toLowerCase();
      if (status === 'completed') return false;
      const isDueStatus = ['due', 'incoming', 'inprogress', 'in-progress', 'ongoing'].includes(status);
      if (isDueStatus) return false;
      const next = toDate(t.overdueDate) || toDate(t.dueDate) || toDate(t.assignDate) || toDate(t.startTime);
      return next ? next.getTime() > now().getTime() : false;
    });
  };

  const getCompletedTasks = () => {
    return (tasks || []).filter((t) => (t.status || '').toLowerCase() === 'completed');
  };

  // ENHANCED task card rendering with COMPLETE details display
  const renderTaskCard = (task) => {
    const machineNameFromObj =
      task && typeof task.machine === 'object' && task.machine
        ? (task.machine.name || task.machine.machineName || '')
        : '';
    const machineNameFromStr =
      task && typeof task.machine === 'string' ? task.machine : '';
    const safeTitle =
      (typeof task?.machineName === 'string' && task.machineName) ||
      machineNameFromStr ||
      machineNameFromObj ||
      (typeof task?.name === 'string' && task.name) ||
      (typeof task?.title === 'string' && task.title) ||
      (typeof task?.subtask?.name === 'string' && task.subtask.name) ||
      'Task';

    const safeSubtitle =
      (typeof task?.note === 'string' && task.note) ||
      (typeof task?.description === 'string' && task.description) ||
      '';
    const assign = toDate(task.assignDate) || toDate(task.startTime);
    const due = toDate(task.overdueDate) || toDate(task.dueDate) || toDate(task.endTime);
    const status = (task.status || '').toString().toUpperCase();
    const isCompleted = task?.startTime && task?.endTime;

    return (
      <View key={String(task.id || `${safeTitle}-${Math.random()}`)} style={[styles.maintenanceCard, { borderColor: colors.border }]}> 
        <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.cardGradient}>
          <View style={styles.cardHeader}>
            <Text style={[styles.machineName, { color: colors.glowLight }]}>{safeTitle}</Text>
            {status ? (
              <View style={[styles.statusBadge, { backgroundColor: '#6B7280' }]}>
                <Text style={styles.statusText}>{status}</Text>
              </View>
            ) : null}
          </View>
          {safeSubtitle ? (
            <Text style={[styles.machineDetails, { color: colors.tabIconDefault }]} numberOfLines={2}>
              {safeSubtitle}
            </Text>
          ) : null}
          <View style={styles.maintenanceInfo}>
            {assign && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Assigned:</Text>
                <Text style={[styles.infoValue, { color: colors.glowLight }]}>{assign.toLocaleString()}</Text>
              </View>
            )}
            {due && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Due:</Text>
                <Text style={[styles.infoValue, { color: colors.glowLight }]}>{due.toLocaleString()}</Text>
              </View>
            )}
          </View>

          {/* ENHANCED: Complete completion details with ALL saved data */}
          {isCompleted && (
            <View style={styles.completionDetails}>
              <Text style={[styles.completionTitle, { color: colors.glowLight }]}>📋 Completion Details</Text>
              
              <View style={styles.timestampRow}>
                <Text style={[styles.timestampLabel, { color: colors.tabIconDefault }]}>Started:</Text>
                <Text style={[styles.timestampValue, { color: colors.text }]}>
                  {task.startTime ? new Date(task.startTime).toLocaleString() : 'N/A'}
                </Text>
              </View>
              <View style={styles.timestampRow}>
                <Text style={[styles.timestampLabel, { color: colors.tabIconDefault }]}>Completed:</Text>
                <Text style={[styles.timestampValue, { color: colors.text }]}>
                  {task.endTime ? new Date(task.endTime).toLocaleString() : 'N/A'}
                </Text>
              </View>
              
              {/* Show text notes */}
              {task.note && (
                <View style={styles.completionNote}>
                  <Text style={[styles.completionNoteLabel, { color: colors.tabIconDefault }]}>📝 Notes:</Text>
                  <Text style={[styles.completionNoteText, { color: colors.text }]}>{task.note}</Text>
                </View>
              )}
              
              {/* Show voice transcription */}
              {task.voiceText && (
                <View style={styles.completionVoice}>
                  <Text style={[styles.completionVoiceLabel, { color: colors.tabIconDefault }]}>🎤 Voice Transcription:</Text>
                  <View style={styles.voiceTextContainer}>
                    <Text style={[styles.completionVoiceText, { color: colors.text }]}>{task.voiceText}</Text>
                  </View>
                </View>
              )}
              
              {/* Show attached images */}
              {task.image && typeof task.image === 'string' && (task.image.startsWith('http') || task.image.startsWith('file://')) && (
                <View style={styles.completionImage}>
                  <Text style={[styles.completionImageLabel, { color: colors.tabIconDefault }]}>📸 Attached Image:</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setImageViewer({ visible: true, imageUrl: task.image });
                    }}
                    style={styles.imageClickableContainer}
                  >
                    <Image 
                      source={{ uri: task.image }} 
                      style={styles.completionImagePreview}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('[Image] Failed to load image:', task.image, error);
                      }}
                      onLoad={() => {
                        console.log('[Image] Successfully loaded image:', task.image);
                      }}
                    />
                    <View style={styles.imageOverlay}>
                      <Text style={styles.imageOverlayText}>Tap to view full size</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            {task.status === 'due' && !isCompleted && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary }]}
                onPress={async () => {
                  try {
                    const startTime = new Date().toISOString();
                    const updateData = { 
                      status: 'inprogress', 
                      startTime
                    };
                    await updateTaskHistory(task.id, updateData);
                    await fetchMachines();
                  } catch (error) {
                    Alert.alert('Error', 'Failed to start task: ' + error.message);
                  }
                }}
              >
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Start Task</Text>
              </TouchableOpacity>
            )}
            
            {task.status === 'inprogress' && !task.endTime && !isCompleted && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary }]}
                onPress={async () => {
                  setNoteModal({ 
                    visible: true, 
                    historyId: task.id, 
                    startTime: task.startTime || '',
                    note: '', 
                    voiceText: '', 
                    image: '',
                    recordedAudioUri: ''
                  });
                }}
              >
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Complete Task</Text>
              </TouchableOpacity>
            )}
            
            {isCompleted && (
              <View style={[styles.actionButton, { borderColor: colors.border, backgroundColor: 'rgba(0,0,0,0.06)' }]}> 
                <Text style={[styles.actionButtonText, { color: colors.text }]}>✓ Completed</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  useEffect(() => {
    fetchMachines();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMachines();
    } catch (_error) {
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Trigger animations when tab changes
  useEffect(() => {
    if (activeTab === 'overview') {
      Animated.sequence([
        Animated.spring(overdueAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
          delay: 50,
        }),
        Animated.spring(dueSoonAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
          delay: 100,
        }),
        Animated.spring(upcomingAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
          delay: 150,
        }),
        Animated.spring(goodAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
          delay: 200,
        }),
      ]).start();

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(overdueFloatAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(overdueFloatAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(dueSoonFloatAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(dueSoonFloatAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(upcomingFloatAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(upcomingFloatAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(goodFloatAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(goodFloatAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
        }, 300);
    } else {
      overdueAnim.setValue(0);
      dueSoonAnim.setValue(0);
      upcomingAnim.setValue(0);
      goodAnim.setValue(0);
      overdueFloatAnim.setValue(0);
      dueSoonFloatAnim.setValue(0);
      upcomingFloatAnim.setValue(0);
      goodFloatAnim.setValue(0);
    }
  }, [activeTab, overdueAnim, dueSoonAnim, upcomingAnim, goodAnim, overdueFloatAnim, dueSoonFloatAnim, upcomingFloatAnim, goodFloatAnim, overduePressAnim, dueSoonPressAnim, upcomingPressAnim, goodPressAnim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        AudioRecordingService.cancelRecording();
      }
    };
  }, [isRecording]);

  if (!machineContext) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Loading machine context...</Text>
      </View>
    );
  }

  if (machineContext.isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Loading machines...</Text>
      </View>
    );
  }

  const userMachines = apiMachines;

  const getMaintenanceStatus = (machine) => {
    const today = new Date();
    const lastMaintenance = machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate) : null;
    const purchaseDate = machine.purchaseDate ? new Date(machine.purchaseDate) : new Date();
    
    let nextMaintenance = null;
    if (machine.nextMaintenanceDate) {
      nextMaintenance = new Date(machine.nextMaintenanceDate);
    } else if (lastMaintenance && machine.maintenanceSchedule && machine.maintenanceSchedule.length > 0) {
      const schedule = machine.maintenanceSchedule[0];
      if (schedule === 'daily') {
        nextMaintenance = new Date(lastMaintenance.getTime() + 24 * 60 * 60 * 1000);
      } else if (schedule === 'weekly') {
        nextMaintenance = new Date(lastMaintenance.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (schedule === 'monthly') {
        nextMaintenance = new Date(lastMaintenance.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else if (schedule === 'quarterly') {
        nextMaintenance = new Date(lastMaintenance.getTime() + 90 * 24 * 60 * 60 * 1000);
      } else if (schedule === 'semi-annually') {
        nextMaintenance = new Date(lastMaintenance.getTime() + 180 * 24 * 60 * 60 * 1000);
      } else if (schedule === 'annually') {
        nextMaintenance = new Date(lastMaintenance.getTime() + 365 * 24 * 60 * 60 * 1000);
      }
    } else {
      nextMaintenance = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const daysUntilMaintenance = nextMaintenance ? Math.ceil((nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    if (daysUntilMaintenance < 0) {
      return { status: 'overdue', days: Math.abs(daysUntilMaintenance), color: colors?.text || '#000000' };
    } else if (daysUntilMaintenance <= 7) {
      return { status: 'due', days: daysUntilMaintenance, color: colors?.text || '#000000' };
    } else if (daysUntilMaintenance <= 30) {
      return { status: 'upcoming', days: daysUntilMaintenance, color: colors?.text || '#000000' };
    } else {
      return { status: 'good', days: daysUntilMaintenance, color: colors?.text || '#000000' };
    }
  };

  const getOverdueMachines = () => {
    return userMachines ? userMachines.filter((machine) => getMaintenanceStatus(machine).status === 'overdue') : [];
  };

  const getDueMachines = () => {
    return userMachines ? userMachines.filter((machine) => getMaintenanceStatus(machine).status === 'due') : [];
  };

  const getUpcomingMachines = () => {
    return userMachines ? userMachines.filter((machine) => getMaintenanceStatus(machine).status === 'upcoming') : [];
  };

  const getGoodMachines = () => {
    return userMachines ? userMachines.filter((machine) => getMaintenanceStatus(machine).status === 'good') : [];
  };

  const handleMaintenanceComplete = async (machineId, notes) => {
    try {
      if (machineContext && machineContext.markMaintenanceComplete) {
        const success = await machineContext.markMaintenanceComplete(machineId, notes);
        if (success) {
          const machine = machineContext.userMachines?.find(m => m.id === machineId);
          const nextMaintenanceDate = machine?.nextMaintenanceDate;
          
          let message = 'Maintenance marked as complete!';
          if (nextMaintenanceDate) {
            const nextDate = new Date(nextMaintenanceDate).toLocaleDateString();
            message += `\n\nNext maintenance scheduled for: ${nextDate}`;
          }
          
          Alert.alert('Success', message, [
            { text: 'OK', onPress: () => onRefresh() }
          ]);
        } else {
          Alert.alert('Error', 'Failed to mark maintenance as complete');
        }
      } else {
        Alert.alert('Error', 'Maintenance context not available');
      }
    } catch (_error) {
      Alert.alert('Error', 'An error occurred');
    }
  };

  const renderMaintenanceCard = (machine) => {
    const status = getMaintenanceStatus(machine);
    const lastMaintenance = machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString() : 'Never';
    const storedNotes = machine.maintenanceNotes || [];
    
    return (
      <TouchableOpacity
        key={machine.id}
        style={[styles.maintenanceCard, { borderColor: status.color }]}
        onPress={() => {
          if (status.status === 'overdue' || status.status === 'due') {
            Alert.alert(
              'Mark Maintenance Complete',
              `Mark maintenance as complete for ${machine.machineName || machine.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Yes', 
                  onPress: () => {
                    setCurrentMachineId(machine.id);
                    setNoteText('');
                    setShowNoteInput(true);
                  }
                }
              ]
            );
          } else {
            Alert.alert('Maintenance Details', `${machine.machineName || machine.name} - ${machine.machineBrand || machine.brand}`);
          }
        }}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.machineName, { color: colors.glowLight }]}>
              {machine.machineName || machine.name}
            </Text>
            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                <Text style={styles.statusText}>
                  {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                </Text>
              </View>
              {(status.status === 'overdue' || status.status === 'due') && (
                <View style={[styles.noteIndicator, { borderColor: colors.border }]}>
                  <Text style={styles.noteIcon}>📝</Text>
                </View>
              )}
              {status.status === 'good' && machine.lastMaintenanceDate && (
                <View style={[styles.completionIndicator, { borderColor: colors.border }]}>
                  <Text style={styles.completionIcon}>✅</Text>
                </View>
              )}
            </View>
          </View>
          
          <Text style={[styles.machineDetails, { color: colors.tabIconDefault }]}>
            {machine.machineBrand || machine.brand} - {machine.machineModel || machine.model}
          </Text>
          
          {(status.status === 'overdue' || status.status === 'due') && (
            <Text style={[styles.noteSubtitle, { color: colors.tabIconDefault }]}> 
              💡 Tap to mark complete & add notes
            </Text>
          )}
          
          {status.status === 'good' && (
            <Text style={[styles.noteSubtitle, { color: colors.tabIconDefault }]}> 
              ✅ Maintenance up to date
            </Text>
          )}
          
          <View style={styles.maintenanceInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Last Maintenance:</Text>
              <Text style={[styles.infoValue, { color: colors.glowLight }]}>{lastMaintenance}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Schedule:</Text>
              <Text style={[styles.infoValue, { color: colors.glowLight }]}>
                {machine.maintenanceSchedule ? machine.maintenanceSchedule.join(', ') : 'Not specified'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>
                {status.status === 'overdue' ? 'Overdue by:' : 'Next in:'}
              </Text>
              <Text style={[styles.infoValue, { color: status.color }]}>
                {status.days} {status.days === 1 ? 'day' : 'days'}
              </Text>
            </View>
            
            {machine.nextMaintenanceDate && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Next Maintenance:</Text>
                <Text style={[styles.infoValue, { color: colors.glowLight }]}>
                  {new Date(machine.nextMaintenanceDate).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            <View style={styles.maintenanceTypesRow}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Types:</Text>
              <View style={styles.typesContainer}>
                {machine.maintenanceTypes ? (
                  <>
                    {machine.maintenanceTypes.slice(0, 3).map((type, index) => (
                      <View key={index} style={[styles.typeChip, { backgroundColor: colors.glowLight }]}>
                        <Text style={[styles.typeChipText, { color: colors.background }]}>{type}</Text>
                      </View>
                    ))}
                    {machine.maintenanceTypes.length > 3 && (
                      <Text style={[styles.moreTypesText, { color: colors.tabIconDefault }]}>
                        +{machine.maintenanceTypes.length - 3} more
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={[styles.noDataText, { color: colors.tabIconDefault }]}>No types specified</Text>
                )}
              </View>
            </View>
            
            {storedNotes && storedNotes.length > 0 && (
              <View style={styles.notesSection}>
                <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Notes:</Text>
                {storedNotes.slice(-2).map((note, index) => (
                  <View key={index} style={styles.noteItem}>
                    <Text style={[styles.noteText, { color: colors.glowLight }]}>
                      • {note.text || note}
                    </Text>
                    <View style={styles.noteDateContainer}>
                      <Text style={[styles.noteDate, { color: colors.tabIconDefault }]}>
                        {note.date ? new Date(note.date).toLocaleDateString() : 'Recent'}
                      </Text>
                      {note.timestamp && (
                        <Text style={[styles.noteTime, { color: colors.tabIconDefault }]}>
                          {new Date(note.timestamp).toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                {storedNotes.length > 2 && (
                  <Text style={[styles.moreNotesText, { color: colors.tabIconDefault }]}>
                    +{storedNotes.length - 2} more notes
                  </Text>
                )}
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Voice API Status Indicator */}
      {voiceApiStatus === 'failed' && (
        <View style={styles.apiStatusWarning}>
          <Text style={styles.apiStatusText}>⚠️ Voice transcription service is currently unavailable</Text>
        </View>
      )}
      
      <View style={styles.statsGrid}>
        <Animated.View 
          style={[
            styles.statCard, 
            { 
              borderColor: colors.border,
              transform: [
                {
                  translateX: overdueAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-width, 0],
                  })
                },
                {
                  scale: overdueAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  })
                },
                {
                  translateY: overdueFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  })
                }
              ],
              opacity: overdueAnim,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.statCardTouchable}
            onPressIn={() => {
              Animated.spring(overduePressAnim, {
                toValue: 0.95,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(overduePressAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }}
            onPress={() => {
              setActiveTab('due');
            }}
          >
            <Animated.View
              style={{
                transform: [{ scale: overduePressAnim }]
              }}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                  <Text style={styles.statIcon}>⚠️</Text>
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{getOverdueMachines().length}</Text>
                <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Overdue</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.statCard, 
            { 
              borderColor: colors.border,
              transform: [
                {
                  translateX: dueSoonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [width, 0],
                  })
                },
                {
                  scale: dueSoonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  })
                },
                {
                  translateY: dueSoonFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  })
                }
              ],
              opacity: dueSoonAnim,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.statCardTouchable}
            onPressIn={() => {
              Animated.spring(dueSoonPressAnim, {
                toValue: 0.95,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(dueSoonPressAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }}
            onPress={() => {
              setActiveTab('due');
            }}
          >
            <Animated.View
              style={{
                transform: [{ scale: dueSoonPressAnim }]
              }}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                  <Text style={styles.statIcon}>⏰</Text>
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{getDueMachines().length}</Text>
                <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Due Soon</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.statCard, 
            { 
              borderColor: colors.border,
              transform: [
                {
                  translateY: upcomingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  })
                },
                {
                  scale: upcomingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  })
                },
                {
                  translateY: upcomingFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  })
                }
              ],
              opacity: upcomingAnim,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.statCardTouchable}
            onPressIn={() => {
              Animated.spring(upcomingPressAnim, {
                toValue: 0.95,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(upcomingPressAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }}
            onPress={() => {
              setActiveTab('upcoming');
            }}
          >
            <Animated.View
              style={{
                transform: [{ scale: upcomingPressAnim }]
              }}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                  <Text style={styles.statIcon}>📅</Text>
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{getUpcomingMachines().length}</Text>
                <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Upcoming</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.statCard, 
            { 
              borderColor: colors.border,
              transform: [
                {
                  translateY: goodAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  })
                },
                {
                  scale: goodAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  })
                },
                {
                  translateY: goodFloatAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  })
                }
              ],
              opacity: goodAnim,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.statCardTouchable}
            onPressIn={() => {
              Animated.spring(goodPressAnim, {
                toValue: 0.95,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(goodPressAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            }}
            onPress={() => {
              setActiveTab('last');
            }}
          >
            <Animated.View
              style={{
                transform: [{ scale: goodPressAnim }]
              }}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                  <Text style={styles.statIcon}>✅</Text>
                </View>
                <Text style={[styles.statNumber, { color: colors.text }]}>{getGoodMachines().length}</Text>
                <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Good</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>🧰 Your Tasks</Text>
        {tasks && tasks.length > 0 ? (
          tasks.slice(0, 5).map(renderTaskCard)
        ) : (
          <Text style={[styles.noDataText, { color: colors.tabIconDefault }]}>No tasks assigned.</Text>
        )}
      </View>

      {getOverdueMachines().length > 0 && (
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: overdueAnim,
              transform: [
                {
                  translateX: overdueAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Overdue Maintenance</Text>
          {getOverdueMachines().map(renderMaintenanceCard)}
        </Animated.View>
      )}

      {getOverdueMachines().length === 0 && getDueMachines().length === 0 && getUpcomingMachines().length === 0 && getGoodMachines().length === 0 && (
        <View style={styles.section}>
          <Text style={[styles.noDataText, { color: colors.tabIconDefault }]}>
            No machines found. Add some machines to get started with maintenance tracking.
          </Text>
        </View>
      )}

      {getDueMachines().length > 0 && (
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: dueSoonAnim,
              transform: [
                {
                  translateX: dueSoonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Due This Week</Text>
          {getDueMachines().map(renderMaintenanceCard)}
        </Animated.View>
      )}

      {getGoodMachines().length > 0 && (
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: goodAnim,
              transform: [
                {
                  translateY: goodAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>✅ All Good</Text>
          {getGoodMachines().map(renderMaintenanceCard)}
        </Animated.View>
      )}
    </View>
  );

  const renderDueMaintenance = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Due Tasks</Text>
        {getDueTasks().length > 0 ? (
          getDueTasks().map(renderTaskCard)
        ) : (
          <Text style={[styles.noDataText, { color: colors.tabIconDefault }]}>No due tasks.</Text>
        )}
      </View>
    </View>
  );

  const renderUpcoming = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Upcoming Tasks</Text>
        {getUpcomingTasks().length > 0 ? (
          getUpcomingTasks().map(renderTaskCard)
        ) : (
          <Text style={[styles.noDataText, { color: colors.tabIconDefault }]}>No upcoming tasks.</Text>
        )}
      </View>
    </View>
  );

  const renderLastMaintenance = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.tabIconDefault }]}>History</Text>
        {getCompletedTasks().length > 0 ? (
          getCompletedTasks().map(renderTaskCard)
        ) : (
          <Text style={[styles.noDataText, { color: colors.tabIconDefault }]}>No completed tasks yet.</Text>
        )}
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.glowLight }]}>Maintenance</Text>
              <Text style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}>
                {isFetching ? 'Fetching from server…' : fetchError ? `Error: ${fetchError}` : 'Manage your machine maintenance'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'due', label: 'Due', icon: '⚠️' },
            { key: 'upcoming', label: 'Upcoming', icon: '📅' },
            { key: 'last', label: 'History', icon: '📋' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && { backgroundColor: colors.buttonPrimary }
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? colors.background : colors.text }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'due' && renderDueMaintenance()}
          {activeTab === 'upcoming' && renderUpcoming()}
          {activeTab === 'last' && renderLastMaintenance()}
        </ScrollView>
        
        <Modal
          visible={showNoteInput}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowNoteInput(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.glowLight }]}>
                Mark Maintenance Complete
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.tabIconDefault }]}>
                This will record the completion date/time and schedule the next maintenance. Enter any notes about this maintenance (optional):
              </Text>
              <TextInput
                style={[styles.noteInput, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.glowLight 
                }]}
                placeholder="Enter notes here..."
                placeholderTextColor={colors.tabIconDefault}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowNoteInput(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.tabIconDefault }]}>
                    Skip
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.glowLight }]}
                  onPress={() => {
                    if (currentMachineId) {
                      handleMaintenanceComplete(currentMachineId, noteText);
                    }
                    setShowNoteInput(false);
                    setNoteText('');
                    setCurrentMachineId(null);
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.background }]}>
                    Submit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* COMPLETE Task Completion Modal with FULL Voice Functionality */}
        <Modal
          visible={noteModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            // Clean up any recording in progress
            if (isRecording) {
              cancelVoiceRecording();
            }
            setNoteModal({ 
              visible: false, 
              historyId: null, 
              note: '', 
              voiceText: '', 
              image: '',
              recordedAudioUri: '',
              startTime: ''
            });
          }}
        >
          <View style={styles.modalOverlay}>
            <ScrollView 
              contentContainerStyle={styles.modalScrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <Text style={[styles.modalTitle, { color: colors.glowLight }]}>
                  Complete Task
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.tabIconDefault }]}>
                  Add completion details for this task:
                </Text>
                
                {/* Text Notes Input */}
                <View style={styles.inputSection}>
                  <Text style={[styles.sectionLabel, { color: colors.tabIconDefault }]}>📝 Written Notes</Text>
                  <TextInput
                    style={[styles.noteInput, { 
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.glowLight 
                    }]}
                    placeholder="Enter notes about task completion..."
                    placeholderTextColor={colors.tabIconDefault}
                    value={noteModal.note}
                    onChangeText={(text) => setNoteModal(prev => ({ ...prev, note: text }))}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* COMPLETE Voice Recording Section */}
                <View style={styles.voiceSection}>
                  <Text style={[styles.sectionLabel, { color: colors.tabIconDefault }]}>
                    🎤 Voice Note {voiceApiStatus === 'working' ? '(Available)' : '(Unavailable)'}
                  </Text>
                  
                  {/* Voice API Status */}
                  {voiceApiStatus === 'failed' && (
                    <View style={styles.apiStatusContainer}>
                      <Text style={[styles.apiStatusText, { color: '#FF6B6B' }]}>
                        ⚠️ Voice transcription service unavailable
                      </Text>
                    </View>
                  )}
                  
                  {/* Main Voice Button */}
                  {!showRecordingActions && voiceApiStatus !== 'failed' && (
                    <TouchableOpacity 
                      style={[
                        styles.voiceButton, 
                        { 
                          borderColor: isRecording ? '#FF6B6B' : colors.glowLight,
                          backgroundColor: isRecording ? '#FF6B6B' : isTranscribing ? '#FFA500' : 'transparent'
                        }
                      ]} 
                      onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
                      disabled={isTranscribing}
                    >
                      <Text style={[styles.voiceButtonText, { color: isRecording ? '#FFFFFF' : colors.glowLight }]}>
                        {isRecording ? '🛑 Stop Recording' : 
                         isTranscribing ? '⏳ Processing...' : 
                         '🎤 Record Voice Note'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* REAL-TIME Recording Indicator */}
                  {isRecording && (
                    <View style={styles.recordingIndicator}>
                      <View style={[styles.recordingDot, { backgroundColor: '#FF6B6B' }]} />
                      <Text style={[styles.recordingText, { color: colors.text }]}>
                        Recording: {formatDuration(recordingDuration)}
                      </Text>
                      <Text style={[styles.recordingHint, { color: colors.tabIconDefault }]}>
                        Tap "Stop Recording" when finished
                      </Text>
                    </View>
                  )}

                  {/* Cancel/Upload Buttons After Recording */}
                  {showRecordingActions && !isTranscribing && (
                    <View style={styles.recordingActionsContainer}>
                      <TouchableOpacity 
                        style={[styles.recordingActionButton, styles.cancelRecordingButton]}
                        onPress={cancelVoiceRecording}
                      >
                        <Text style={styles.cancelRecordingText}>🗑️ Delete Recording</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.recordingActionButton, styles.uploadRecordingButton]}
                        onPress={uploadVoiceRecording}
                      >
                        <Text style={styles.uploadRecordingText}>📤 Upload & Transcribe</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Transcription Progress */}
                  {isTranscribing && transcriptionProgress && (
                    <View style={styles.transcriptionIndicator}>
                      <Text style={[styles.transcriptionText, { color: colors.text }]}>
                        {transcriptionProgress}
                      </Text>
                    </View>
                  )}

                  {/* Voice Text Display */}
                  {!isRecording && !isTranscribing && noteModal.voiceText && (
                    <View style={styles.voiceTextDisplayContainer}>
                      <Text style={[styles.voiceTextLabel, { color: colors.tabIconDefault }]}>
                        🎤 Transcribed Voice Note:
                      </Text>
                      <View style={styles.voiceTextBox}>
                        <Text style={[styles.voiceTextDisplay, { color: colors.text }]}>
                          {noteModal.voiceText}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Image Upload Section */}
                <View style={styles.imageSection}>
                  <Text style={[styles.sectionLabel, { color: colors.tabIconDefault }]}>📸 Photo Attachment</Text>
                  
                  <TouchableOpacity 
                    style={[
                      styles.imageButton, 
                      { 
                        borderColor: noteModal.image ? colors.buttonPrimary : colors.glowLight,
                        backgroundColor: noteModal.image ? colors.buttonPrimary : 'rgba(255, 255, 255, 0.1)'
                      }
                    ]} 
                    onPress={async () => {
                      try {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (perm.status !== 'granted') {
                          Alert.alert('Permission Required', 'Please allow media library access to select an image.');
                          return;
                        }
                        
                        const result = await ImagePicker.launchImageLibraryAsync({ 
                          mediaTypes: ImagePicker.MediaTypeOptions.Images, 
                          quality: 0.8,
                          allowsEditing: false
                        });
                        
                        if (result.canceled) return;
                        
                        const asset = result.assets && result.assets[0];
                        if (!asset?.uri) return;
                        
                        // Check file size (10MB limit)
                        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
                          Alert.alert('File Too Large', 'Please select an image smaller than 10MB.');
                          return;
                        }
                        
                        console.log('[Image] Uploading image...', asset.uri);
                        const uploadRes = await uploadImage(asset.uri);
                        console.log('[Image] Upload response:', uploadRes);
                        
                        let imageUrl = null;
                        if (uploadRes?.file_url) {
                          imageUrl = uploadRes.file_url;
                        } else if (uploadRes?.url) {
                          imageUrl = uploadRes.url;
                        } else if (uploadRes?.data?.file_url) {
                          imageUrl = uploadRes.data.file_url;
                        } else if (uploadRes?.data?.url) {
                          imageUrl = uploadRes.data.url;
                        } else if (typeof uploadRes === 'string' && uploadRes.startsWith('http')) {
                          imageUrl = uploadRes;
                        }
                        
                        if (imageUrl && imageUrl.startsWith('http')) {
                          setNoteModal(prev => ({ ...prev, image: imageUrl }));
                          console.log('[Image] Image URL saved:', imageUrl);
                          Alert.alert('Success', 'Image uploaded successfully!');
                        } else {
                          console.log('[Image] Failed to get valid URL from response:', uploadRes);
                          Alert.alert('Upload Failed', 'Image upload failed. Please try again.');
                        }
                      } catch (e) {
                        console.error('[Image] Upload error:', e);
                        Alert.alert('Upload Failed', e?.message || 'Could not upload image');
                      }
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: noteModal.image ? '#FFFFFF' : colors.glowLight }]}>
                      {noteModal.image ? '✅ Image Attached' : '📸 Add Image (10MB max)'}
                    </Text>
                  </TouchableOpacity>

                  {/* Image Preview */}
                  {noteModal.image && (
                    <View style={styles.imagePreviewContainer}>
                      <Text style={[styles.imagePreviewLabel, { color: colors.tabIconDefault }]}>📸 Attached Image:</Text>
                      <TouchableOpacity
                        onPress={() => setImageViewer({ visible: true, imageUrl: noteModal.image })}
                      >
                        <Image 
                          source={{ uri: noteModal.image }} 
                          style={styles.imagePreview}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log('[Image] Failed to load preview:', noteModal.image, error);
                          }}
                          onLoad={() => {
                            console.log('[Image] Successfully loaded preview:', noteModal.image);
                          }}
                        />
                        <View style={styles.imagePreviewOverlay}>
                          <Text style={styles.imagePreviewOverlayText}>Tap to view</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      if (isRecording) {
                        cancelVoiceRecording();
                      }
                      setNoteModal({ 
                        visible: false, 
                        historyId: null, 
                        note: '', 
                        voiceText: '', 
                        image: '',
                        recordedAudioUri: '',
                        startTime: ''
                      });
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.tabIconDefault }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.glowLight }]}
                    disabled={isRecording || isTranscribing}
                    onPress={async () => {
                      try {
                        const endTime = new Date().toISOString();
                        const finalNote = noteModal.note || '';

                        // CRITICAL: Only pass voiceText to task update, not audio file
                        const updateData = {
                          status: 'completed',
                          startTime: noteModal.startTime,
                          endTime: endTime,
                          note: finalNote,
                          voiceText: noteModal.voiceText || '', // ONLY the transcribed text
                          image: noteModal.image || ''
                        };
                        
                        console.log('[TaskComplete] Saving task with data:', updateData);
                        await updateTaskHistory(noteModal.historyId, updateData);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await fetchMachines();
                        
                        setNoteModal({ 
                          visible: false, 
                          historyId: null, 
                          note: '', 
                          voiceText: '', 
                          image: '',
                          recordedAudioUri: '',
                          startTime: ''
                        });
                        
                        Alert.alert('Success', 'Task completed successfully! All data has been saved and will appear in the history section.');
                      } catch (error) {
                        console.error('[TaskComplete] Error:', error);
                        Alert.alert('Error', 'Failed to complete task: ' + error.message);
                      }
                    }}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.background }]}>
                      {isRecording || isTranscribing ? 'Please Wait...' : 'Save & Complete Task'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ENHANCED Full-Screen Image Viewer Modal */}
        <Modal
          visible={imageViewer.visible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setImageViewer({ visible: false, imageUrl: '' })}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity 
              style={styles.imageViewerCloseArea}
              activeOpacity={1}
              onPress={() => setImageViewer({ visible: false, imageUrl: '' })}
            />
            
            <View style={styles.imageViewerContainer}>
              <View style={styles.imageViewerHeader}>
                <Text style={[styles.imageViewerTitle, { color: colors.glowLight }]}>Image Preview</Text>
                <TouchableOpacity 
                  style={styles.imageViewerCloseButton}
                  onPress={() => setImageViewer({ visible: false, imageUrl: '' })}
                >
                  <Text style={[styles.imageViewerCloseText, { color: colors.text }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.imageViewerContent}>
                {imageViewer.imageUrl ? (
                  <Image 
                    source={{ uri: imageViewer.imageUrl }} 
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.log('[ImageViewer] Failed to load:', imageViewer.imageUrl, error);
                    }}
                    onLoad={() => {
                      console.log('[ImageViewer] Successfully loaded:', imageViewer.imageUrl);
                    }}
                  />
                ) : (
                  <Text style={[styles.noImageText, { color: colors.text }]}>No image to display</Text>
                )}
                <Text style={[styles.imageViewerUrl, { color: colors.tabIconDefault }]} numberOfLines={2}>
                  {imageViewer.imageUrl}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
    paddingVertical: 15,
    borderRadius: 15,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  tabContent: {
    paddingBottom: 30,
  },
  apiStatusWarning: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  apiStatusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
    gap: 12,
    paddingTop: 12,
  },
  statCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  statCardTouchable: {
    flex: 1,
  },
  statCardGradient: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  maintenanceCard: {
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  machineName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  machineDetails: {
    fontSize: 14,
    marginBottom: 15,
  },
  maintenanceInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  maintenanceTypesRow: {
    marginTop: 10,
  },
  typesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreTypesText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
    alignSelf: 'center',
  },
  notesSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  noteItem: {
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  noteDate: {
    fontSize: 12,
  },
  noteTime: {
    fontSize: 11,
    opacity: 0.8,
  },
  moreNotesText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    padding: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteIndicator: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  noteIcon: {
    fontSize: 12,
  },
  completionIndicator: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  completionIcon: {
    fontSize: 12,
  },
  noteSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxHeight: '95%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Input sections
  inputSection: {
    width: '100%',
    marginBottom: 20,
  },
  voiceSection: {
    width: '100%',
    marginBottom: 20,
  },
  imageSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  noteInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Voice recording styles
  apiStatusContainer: {
    padding: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: 10,
    alignItems: 'center',
  },
  voiceButton: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordingIndicator: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recordingHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  recordingActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  recordingActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelRecordingButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderColor: '#FF6B6B',
  },
  uploadRecordingButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderColor: '#4CAF50',
  },
  cancelRecordingText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 14,
  },
  uploadRecordingText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  transcriptionIndicator: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
    marginBottom: 10,
  },
  transcriptionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  voiceTextDisplayContainer: {
    marginBottom: 10,
  },
  voiceTextLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  voiceTextBox: {
    padding: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  voiceTextDisplay: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Image styles
  imageButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreviewContainer: {
    marginTop: 15,
    padding: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  imagePreviewLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 100,
    borderRadius: 6,
  },
  imagePreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  imagePreviewOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Modal buttons
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    borderColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#6B7280',
    borderColor: '#6B7280',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Completion details styles
  completionDetails: {
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  timestampLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestampValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  completionNote: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  completionNoteLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 5,
  },
  completionNoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Voice text in completed tasks
  completionVoice: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  completionVoiceLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 5,
  },
  voiceTextContainer: {
    padding: 10,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.2)',
  },
  completionVoiceText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Image display in completed tasks
  completionImage: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  completionImageLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  completionImagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  imageClickableContainer: {
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Full-screen image viewer
  imageViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: '95%',
    height: '85%',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  imageViewerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageViewerCloseButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  imageViewerCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  imageViewerContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    flex: 1,
    maxHeight: '90%',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  imageViewerUrl: {
    fontSize: 10,
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.7,
  },
  noImageText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});