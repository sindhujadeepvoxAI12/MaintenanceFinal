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

// Import voice services
import AudioRecordingService from '../../services/AudioRecordingService';
import { uploadVoiceForTranscription, uploadVoiceWithProgress } from '../../services/BackendVoiceUploadService';

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
  const [noteModal, setNoteModal] = useState({ visible: false, historyId: null, note: '', voiceText: '', image: '' });
  const [imageViewer, setImageViewer] = useState({ visible: false, imageUrl: '' });
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceText, setVoiceText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState('');
  const [recordingUri, setRecordingUri] = useState('');

  // Recording timer
  const recordingTimer = useRef(null);

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

  // Voice recording functions using AudioRecordingService
  const startVoiceRecording = async () => {
    try {
      console.log('=== STARTING VOICE RECORDING ===');
      setVoiceText('');
      setIsTranscribing(false);
      setTranscriptionProgress('');
      setRecordingDuration(0);
      
      const result = await AudioRecordingService.startRecording();
      
      if (result.success) {
        setIsRecording(true);
        setRecordingUri('');
        
        // Start timer for recording duration
        recordingTimer.current = setInterval(() => {
          setRecordingDuration(AudioRecordingService.getRecordingDuration());
        }, 1000);
        
        console.log('[Voice] Recording started successfully');
      } else {
        console.log('[Voice] Failed to start recording:', result.error);
        Alert.alert('Recording Error', result.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      Alert.alert('Error', 'Failed to start voice recording: ' + error.message);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      console.log('=== STOPPING VOICE RECORDING ===');
      
      // Clear timer
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      const result = await AudioRecordingService.stopRecording();
      setIsRecording(false);
      
      if (result.success && result.uri) {
        console.log('[Voice] Recording stopped successfully, URI:', result.uri);
        console.log('[Voice] Recording duration:', result.duration, 'seconds');
        console.log('[Voice] File size:', result.fileSize, 'bytes');
        
        setRecordingUri(result.uri);
        
        // Start transcription process
        await transcribeAudio(result.uri);
      } else {
        console.log('[Voice] Recording failed:', result.error);
        Alert.alert('Recording Error', result.error || 'Failed to stop recording');
      }
    } catch (error) {
      console.error('Failed to stop voice recording:', error);
      Alert.alert('Error', 'Failed to stop voice recording: ' + error.message);
      setIsRecording(false);
    }
  };

  const cancelVoiceRecording = async () => {
    try {
      console.log('=== CANCELLING VOICE RECORDING ===');
      
      // Clear timer
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      const result = await AudioRecordingService.cancelRecording();
      setIsRecording(false);
      setRecordingDuration(0);
      setVoiceText('');
      setIsTranscribing(false);
      setTranscriptionProgress('');
      setRecordingUri('');
      
      console.log('[Voice] Recording cancelled');
    } catch (error) {
      console.error('Failed to cancel voice recording:', error);
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioUri) => {
    try {
      console.log('=== STARTING TRANSCRIPTION ===');
      console.log('[Voice] Audio URI:', audioUri);
      
      setIsTranscribing(true);
      setTranscriptionProgress('Uploading audio...');
      
      // Use the backend voice upload service with progress tracking
      const result = await uploadVoiceWithProgress(audioUri, (progress, message) => {
        console.log('[Voice] Upload progress:', progress + '%', message);
        setTranscriptionProgress(message);
      });
      
      console.log('[Voice] Transcription result:', result);
      
      if (result.success && result.transcription) {
        const transcribedText = result.transcription;
        console.log('[Voice] Transcription successful:', transcribedText);
        
        setVoiceText(transcribedText);
        setTranscriptionProgress('Transcription complete!');
        
        // Update the note modal with the transcribed text
        setNoteModal(prev => ({ 
          ...prev, 
          voiceText: transcribedText,
          note: prev.note + (prev.note ? ' ' : '') + transcribedText 
        }));
        
        // Show success feedback
        setTimeout(() => {
          setTranscriptionProgress('');
        }, 2000);
        
        console.log('[Voice] Voice text added to notes field');
      } else {
        console.log('[Voice] Transcription failed:', result);
        setTranscriptionProgress('Transcription failed');
        Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again.');
        
        setTimeout(() => {
          setTranscriptionProgress('');
        }, 3000);
      }
    } catch (error) {
      console.error('[Voice] Transcription error:', error);
      setTranscriptionProgress('Transcription failed');
      Alert.alert('Transcription Error', error.message || 'Failed to transcribe audio');
      
      setTimeout(() => {
        setTranscriptionProgress('');
      }, 3000);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleVoiceButtonPress = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else if (isTranscribing) {
      // If currently transcribing, show option to cancel
      Alert.alert(
        'Transcription in Progress',
        'Audio transcription is currently in progress. Please wait for it to complete.',
        [{ text: 'OK' }]
      );
    } else {
      startVoiceRecording();
    }
  };

  const handleVoiceLongPress = () => {
    if (isRecording) {
      Alert.alert(
        'Cancel Recording',
        'Do you want to cancel the current recording?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: cancelVoiceRecording, style: 'destructive' }
        ]
      );
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

  // Consider a task due if it is not completed and its overdueDate/assignDate is now or in the past
  const getDueTasks = () => {
    return (tasks || []).filter((t) => {
      const status = (t.status || '').toLowerCase();
      if (status === 'completed') return false;
      // Explicit due-like statuses should always show under Due
      const isDueStatus = ['due', 'incoming', 'inprogress', 'in-progress', 'ongoing'].includes(status);
      const overdue = toDate(t.overdueDate) || toDate(t.dueDate) || toDate(t.endTime);
      const assign = toDate(t.assignDate) || toDate(t.startTime);
      const ref = overdue || assign;
      const isPastOrNow = ref ? ref.getTime() <= now().getTime() : false;
      return isDueStatus || isPastOrNow;
    });
  };

  // Consider a task upcoming if it is not completed and its next date is in the future
  const getUpcomingTasks = () => {
    return (tasks || []).filter((t) => {
      const status = (t.status || '').toLowerCase();
      if (status === 'completed') return false;
      // Only future items, not explicitly due-like
      const isDueStatus = ['due', 'incoming', 'inprogress', 'in-progress', 'ongoing'].includes(status);
      if (isDueStatus) return false;
      const next = toDate(t.overdueDate) || toDate(t.dueDate) || toDate(t.assignDate) || toDate(t.startTime);
      return next ? next.getTime() > now().getTime() : false;
    });
  };

  // History: tasks with status completed
  const getCompletedTasks = () => {
    return (tasks || []).filter((t) => (t.status || '').toLowerCase() === 'completed');
  };

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
      'Task';

    const safeSubtitle =
      (typeof task?.note === 'string' && task.note) ||
      (typeof task?.description === 'string' && task.description) ||
      '';
    const assign = toDate(task.assignDate) || toDate(task.startTime);
    const due = toDate(task.overdueDate) || toDate(task.dueDate) || toDate(task.endTime);
    const status = (task.status || '').toString().toUpperCase();
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
        </LinearGradient>
      </View>
    );
  };

  useEffect(() => {
    fetchMachines();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Staggered animations for different status categories - faster timing
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

      // Start floating animations after entrance animations - faster start
      setTimeout(() => {
        // Continuous floating animations
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
      // Reset animations when switching tabs
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
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      // Cancel any ongoing recording
      if (isRecording) {
        AudioRecordingService.cancelRecording();
      }
    };
  }, [isRecording]);

  // Safety check - ensure machine context is available
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
    
    // Use stored nextMaintenanceDate if available, otherwise calculate it
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
      // If no last maintenance or schedule, use purchase date + 1 month as default
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
          // Find the machine to show next maintenance date
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
            
            {/* Display stored maintenance notes */}
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
      <View style={styles.statsGrid}>
        {/* Overdue - Slide in from left */}
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
        
        {/* Due Soon - Slide in from right */}
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
        
        {/* Upcoming - Slide in from top */}
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
        
        {/* Good - Slide in from bottom */}
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

      {/* Your Tasks */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>🧰 Your Tasks</Text>
        {tasks && tasks.length > 0 ? (
          tasks.slice(0, 5).map((t, idx) => {
            const title = t?.subtask?.name || t?.task?.task || t?.task?.name || 'Task';
            const due = t?.assignDate ? new Date(t.assignDate).toLocaleDateString() : 'N/A';
            // Determine status: if both start and end times exist, consider it completed
            const isCompleted = t?.startTime && t?.endTime;
            const status = isCompleted ? 'completed' : (t?.status || 'pending').toString();
            const machineName = t?.machine?.name || t?.task?.machine?.name;
            
            // Debug logging for task data
            console.log('[Maintenance] Task data for rendering:', {
              id: t.id,
              title,
              status,
              isCompleted,
              startTime: t.startTime,
              endTime: t.endTime,
              note: t.note || '',
              voiceText: t.voiceText || '',
              image: t.image || '',
              imageType: typeof t.image,
              imageLength: t.image?.length || 0
            });
            return (
              <View key={idx} style={[styles.maintenanceCard, { borderColor: colors.border }]}> 
                <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.cardGradient}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.machineName, { color: colors.glowLight }]}>{title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: colors.border }]}> 
                      <Text style={[styles.statusText, { color: colors.text }]}>{status.toUpperCase()}</Text>
                    </View>
                  </View>
                  {machineName ? (
                    <Text style={[styles.machineDetails, { color: colors.tabIconDefault }]}>{machineName}</Text>
                  ) : null}
                  <Text style={[styles.machineDetails, { color: colors.tabIconDefault }]}>Due: {due}</Text>
                  
                  {/* Show completion details for completed tasks */}
                  {isCompleted && (
                    <View style={styles.completionDetails}>
                      <Text style={[styles.completionTitle, { color: colors.glowLight }]}>📋 Completion Details</Text>
                      
                      {/* Show completion timestamps */}
                      <View style={styles.timestampRow}>
                        <Text style={[styles.timestampLabel, { color: colors.tabIconDefault }]}>Started:</Text>
                        <Text style={[styles.timestampValue, { color: colors.text }]}>
                          {t.startTime ? new Date(t.startTime).toLocaleString() : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.timestampRow}>
                        <Text style={[styles.timestampLabel, { color: colors.tabIconDefault }]}>Completed:</Text>
                        <Text style={[styles.timestampValue, { color: colors.text }]}>
                          {t.endTime ? new Date(t.endTime).toLocaleString() : 'N/A'}
                        </Text>
                      </View>
                      
                      {/* Show note if available */}
                      {t.note && (
                        <View style={styles.completionNote}>
                          <Text style={[styles.completionNoteLabel, { color: colors.tabIconDefault }]}>📝 Note:</Text>
                          <Text style={[styles.completionNoteText, { color: colors.text }]}>{t.note}</Text>
                        </View>
                      )}
                      
                      {/* Voice text section */}
                      {t.voiceText && (
                        <View style={styles.completionVoice}>
                          <Text style={[styles.completionVoiceLabel, { color: colors.tabIconDefault }]}>🎤 Voice Note:</Text>
                          <Text style={[styles.completionVoiceText, { color: colors.text }]}>{t.voiceText}</Text>
                        </View>
                      )}
                      
                      {/* Show image if available and valid */}
                      {t.image && typeof t.image === 'string' && t.image.startsWith('http') && (() => {
                        console.log('[Maintenance] Rendering image for task:', t.id, 'Image URL:', t.image, 'Type:', typeof t.image);
                        return (
                          <View style={styles.completionImage}>
                          <Text style={[styles.completionImageLabel, { color: colors.tabIconDefault }]}>📸 Image:</Text>
                          <TouchableOpacity 
                            onPress={() => {
                              console.log('[Maintenance] Image clicked, URL:', t.image);
                              console.log('[Maintenance] Image URL type:', typeof t.image);
                              console.log('[Maintenance] Image URL length:', t.image?.length || 0);
                              setImageViewer({ visible: true, imageUrl: t.image });
                            }}
                            style={styles.imageClickableContainer}
                          >
                            <Image 
                              source={{ uri: t.image }} 
                              style={styles.completionImagePreview}
                              resizeMode="cover"
                              onError={(error) => {
                                console.error('[Maintenance] Image load error:', error);
                                console.error('[Maintenance] Image URL that failed:', t.image);
                              }}
                              onLoad={() => {
                                console.log('[Maintenance] Image loaded successfully:', t.image);
                              }}
                            />
                            <View style={styles.imageOverlay}>
                              <Text style={styles.imageOverlayText}>Tap to view</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                        );
                      })()}
                      
                      {/* Show error message for invalid image URLs */}
                      {t.image && typeof t.image === 'string' && !t.image.startsWith('http') && (
                        <View style={styles.completionImage}>
                          <Text style={[styles.completionImageLabel, { color: colors.tabIconDefault }]}>📸 Image:</Text>
                          <View style={styles.imageErrorContainer}>
                            <Text style={[styles.imageErrorText, { color: colors.tabIconDefault }]}>
                              ⚠️ Image upload failed - invalid URL
                            </Text>
                            <Text style={[styles.imageErrorUrl, { color: colors.tabIconDefault }]}>
                              {t.image}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                  
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    {/* Only show Start button for tasks with status "due" and not completed */}
                    {t.status === 'due' && !isCompleted && (
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary }]}
                        onPress={async () => {
                          try {
                            const startTime = new Date().toISOString();
                            console.log('=== STARTING TASK DEBUG ===');
                            console.log('[Maintenance] Task ID:', t.id);
                            console.log('[Maintenance] Task Name:', t?.subtask?.name || t?.task?.task);
                            console.log('[Maintenance] Machine:', t?.machine?.name);
                            console.log('[Maintenance] Start Time:', startTime);
                            
                            const updateData = { 
                              status: 'inprogress', 
                              startTime
                            };
                            console.log('[Maintenance] Update payload:', JSON.stringify(updateData, null, 2));
                            
                            console.log('[Maintenance] Calling updateTaskHistory API...');
                            const result = await updateTaskHistory(t.id, updateData);
                            console.log('[Maintenance] Update API Response:', result);
                            
                            console.log('[Maintenance] Refreshing data...');
                            await fetchMachines();
                            console.log('[Maintenance] ✅ Task started successfully!');
                            console.log('=== END STARTING TASK DEBUG ===');
                          } catch (error) {
                            console.error('[Maintenance] Error starting task:', error);
                            Alert.alert('Error', 'Failed to start task: ' + error.message);
                          }
                        }}
                      >
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Start</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Show End button for tasks with status "inprogress" and no endTime */}
                    {t.status === 'inprogress' && !t.endTime && !isCompleted && (
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary }]}
                        onPress={async () => {
                          setNoteModal({ 
                            visible: true, 
                            historyId: t.id, 
                            startTime: t.startTime || '',
                            note: '', 
                            voiceText: '', 
                            image: '' 
                          });
                        }}
                      >
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>End</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Show completion status for completed tasks */}
                    {isCompleted && (
                      <View style={[styles.actionButton, { borderColor: colors.border, backgroundColor: 'rgba(0,0,0,0.06)' }]}> 
                        <Text style={[styles.actionButtonText, { color: colors.text }]}>✓ Completed</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
            );
          })
        ) : (
          <Text style={[styles.noDataText, { color: colors.tabIconDefault }]}>No tasks assigned.</Text>
        )}
      </View>

      {/* Animated sections with staggered card animations */}
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
          {getOverdueMachines().map((machine, index) => (
            <Animated.View
              key={machine.id}
              style={{
                opacity: overdueAnim,
                transform: [
                  {
                    translateX: overdueAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 0],
                    })
                  },
                  {
                    scale: overdueAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }
                ]
              }}
            >
              {renderMaintenanceCard(machine)}
            </Animated.View>
          ))}
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
          {getDueMachines().map((machine, index) => (
            <Animated.View
              key={machine.id}
              style={{
                opacity: dueSoonAnim,
                transform: [
                  {
                    translateX: dueSoonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    })
                  },
                  {
                    scale: dueSoonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }
                ]
              }}
            >
              {renderMaintenanceCard(machine)}
            </Animated.View>
          ))}
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
          {getGoodMachines().map((machine, index) => (
            <Animated.View
              key={machine.id}
              style={{
                opacity: goodAnim,
                transform: [
                  {
                    translateY: goodAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [80, 0],
                    })
                  },
                  {
                    scale: goodAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    })
                  }
                ]
              }}
            >
              {renderMaintenanceCard(machine)}
            </Animated.View>
          ))}
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
        
        {/* Note Input Modal */}
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

        {/* Task Completion Modal with Voice Integration */}
        <Modal
          visible={noteModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setNoteModal({ visible: false, historyId: null, note: '', voiceText: '', image: '' });
            setIsRecording(false);
            setVoiceText('');
            setIsTranscribing(false);
            if (recordingTimer.current) {
              clearInterval(recordingTimer.current);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.glowLight }]}>
                Complete Task
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.tabIconDefault }]}>
                Enter any notes about this task (optional):
              </Text>
              <TextInput
                style={[styles.noteInput, { 
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.glowLight 
                }]}
                placeholder="Enter notes here..."
                placeholderTextColor={colors.tabIconDefault}
                value={noteModal.note}
                onChangeText={(text) => setNoteModal(prev => ({ ...prev, note: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Advanced Voice Recording Section */}
              <View style={styles.voiceSection}>
                <TouchableOpacity 
                  style={[
                    styles.voiceButton, 
                    { 
                      borderColor: isRecording ? '#FF6B6B' : colors.glowLight,
                      backgroundColor: isRecording ? '#FF6B6B' : isTranscribing ? '#FFA500' : 'transparent'
                    }
                  ]} 
                  onPress={handleVoiceButtonPress}
                  onLongPress={handleVoiceLongPress}
                  disabled={isTranscribing}
                >
                  <Text style={[styles.voiceButtonText, { color: isRecording ? '#FFFFFF' : colors.glowLight }]}>
                    {isRecording ? '🛑 Stop Recording' : 
                     isTranscribing ? '⏳ Processing...' : 
                     '🎤 Add Voice Note'}
                  </Text>
                </TouchableOpacity>

                {/* Recording Duration */}
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <View style={[styles.recordingDot, { backgroundColor: '#FF6B6B' }]} />
                    <Text style={[styles.recordingText, { color: colors.text }]}>
                      Recording: {formatDuration(recordingDuration)}
                    </Text>
                    <Text style={[styles.recordingHint, { color: colors.tabIconDefault }]}>
                      Tap to stop, long press to cancel
                    </Text>
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

                {/* Live Voice Text Preview */}
                {!isRecording && !isTranscribing && voiceText && (
                  <View style={styles.voiceTextContainer}>
                    <Text style={[styles.voiceTextLabel, { color: colors.tabIconDefault }]}>
                      🎤 Voice Note:
                    </Text>
                    <Text style={[styles.voiceTextDisplay, { color: colors.text }]}>
                      {voiceText}
                    </Text>
                  </View>
                )}
              </View>

              {/* Image Upload Button */}
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
                    console.log('=== IMAGE UPLOAD DEBUG ===');
                    console.log('[Maintenance] Requesting media library permissions...');
                    
                    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (perm.status !== 'granted') {
                      console.log('[Maintenance] Permission denied');
                      Alert.alert('Permission required', 'Please allow media library access to pick an image.');
                      return;
                    }
                    
                    console.log('[Maintenance] Permission granted, launching image picker...');
                    const result = await ImagePicker.launchImageLibraryAsync({ 
                      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
                      quality: 0.8 
                    });
                    
                    if (result.canceled) {
                      console.log('[Maintenance] Image picker canceled');
                      return;
                    }
                    
                    const asset = result.assets && result.assets[0];
                    if (!asset?.uri) {
                      console.log('[Maintenance] No asset URI found');
                      return;
                    }
                    
                    console.log('[Maintenance] Selected image URI:', asset.uri);
                    console.log('[Maintenance] Image file name:', asset.fileName);
                    console.log('[Maintenance] Image file size:', asset.fileSize);
                    console.log('[Maintenance] Image type:', asset.type);
                    
                    console.log('[Maintenance] Calling uploadImage API...');
                    const uploadRes = await uploadImage(asset.uri);
                    console.log('[Maintenance] Upload API response:', uploadRes);
                    
                    // Try multiple possible response structures
                    let imageUrl = null;
                    
                    if (uploadRes?.file_url) {
                      imageUrl = uploadRes.file_url;
                    } else if (uploadRes?.url) {
                      imageUrl = uploadRes.url;
                    } else if (uploadRes?.data?.file_url) {
                      imageUrl = uploadRes.data.file_url;
                    } else if (uploadRes?.data?.url) {
                      imageUrl = uploadRes.data.url;
                    } else if (uploadRes?.path) {
                      imageUrl = uploadRes.path;
                    } else if (uploadRes?.fileUrl) {
                      imageUrl = uploadRes.fileUrl;
                    } else if (uploadRes?.data?.path) {
                      imageUrl = uploadRes.data.path;
                    } else if (uploadRes?.data?.fileUrl) {
                      imageUrl = uploadRes.data.fileUrl;
                    } else if (uploadRes?.imageUrl) {
                      imageUrl = uploadRes.imageUrl;
                    } else if (uploadRes?.data?.imageUrl) {
                      imageUrl = uploadRes.data.imageUrl;
                    } else if (typeof uploadRes === 'string' && uploadRes.startsWith('http')) {
                      imageUrl = uploadRes;
                    }
                    
                    console.log('[Maintenance] Final image URL:', imageUrl);
                    
                    // Only store the image URL if it's a valid HTTP URL from the API
                    if (imageUrl && imageUrl.startsWith('http')) {
                      setNoteModal(prev => ({ ...prev, image: imageUrl }));
                      console.log('[Maintenance] ✅ Image uploaded successfully!');
                      Alert.alert('Success', 'Image uploaded and attached to this task!');
                    } else {
                      console.error('[Maintenance] ❌ Image upload failed - no valid URL returned');
                      Alert.alert('Upload Failed', 'Image upload failed. Please check your internet connection and try again.');
                    }
                  } catch (e) {
                    console.error('[Maintenance] Image upload error:', e);
                    Alert.alert('Upload Failed', e?.message || 'Could not upload image');
                  }
                }}
              >
                <Text style={[styles.modalButtonText, { color: noteModal.image ? '#FFFFFF' : colors.glowLight }]}>
                  {noteModal.image ? '✅ Image Attached' : '📸 Add Image'}
                </Text>
              </TouchableOpacity>

              {/* Show image preview if uploaded */}
              {noteModal.image && (
                <View style={styles.imagePreviewContainer}>
                  <Text style={[styles.imagePreviewLabel, { color: colors.tabIconDefault }]}>📸 Uploaded Image:</Text>
                  <Image 
                    source={{ uri: noteModal.image }} 
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setNoteModal({ visible: false, historyId: null, note: '', voiceText: '', image: '' });
                    setIsRecording(false);
                    setVoiceText('');
                    setIsTranscribing(false);
                    if (recordingTimer.current) {
                      clearInterval(recordingTimer.current);
                    }
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.tabIconDefault }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: colors.glowLight }]}
                  onPress={async () => {
                    try {
                      const endTime = new Date().toISOString();
                      console.log('=== TASK COMPLETION DEBUG ===');
                      console.log('[Maintenance] Task ID:', noteModal.historyId);
                      console.log('[Maintenance] Start Time:', noteModal.startTime);
                      console.log('[Maintenance] End Time:', endTime);
                      console.log('[Maintenance] Notes Field (includes voice text):', noteModal.note);
                      console.log('[Maintenance] Voice Text (separate):', noteModal.voiceText);
                      console.log('[Maintenance] Image URL:', noteModal.image);
                      
                      const finalNote = noteModal.note || '';

                      const updateData = {
                        status: 'completed',
                        startTime: noteModal.startTime,
                        endTime: endTime,
                        note: finalNote,
                        voiceText: noteModal.voiceText || '',
                        image: noteModal.image || ''
                      };
                      
                      console.log('[Maintenance] Sending update data to API:', JSON.stringify(updateData, null, 2));
                      const result = await updateTaskHistory(noteModal.historyId, updateData);
                      console.log('[Maintenance] API Response:', result);
                      
                      // Wait for API to process
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      console.log('[Maintenance] Refreshing task list...');
                      await fetchMachines();
                      
                      setNoteModal({ visible: false, historyId: null, note: '', voiceText: '', image: '' });
                      setIsRecording(false);
                      setVoiceText('');
                      setIsTranscribing(false);
                      
                      console.log('[Maintenance] ✅ Task completed successfully!');
                      Alert.alert('Success', 'Task completed successfully! All data has been saved.');
                    } catch (error) {
                      console.error('[Maintenance] Error completing task:', error);
                      Alert.alert('Error', 'Failed to complete task: ' + error.message);
                    }
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.background }]}>
                    Save & Complete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Full-Screen Image Viewer Modal */}
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
            
            <TouchableOpacity 
              style={styles.imageViewerContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
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
                <Image 
                  source={{ uri: imageViewer.imageUrl || '' }} 
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.error('[Maintenance] Full-screen image load error:', error);
                  }}
                  onLoad={() => {
                    console.log('[Maintenance] Full-screen image loaded successfully:', imageViewer.imageUrl);
                  }}
                />
                <Text style={[styles.imageViewerUrl, { color: colors.tabIconDefault }]}>
                  {imageViewer.imageUrl}
                </Text>
              </View>
            </TouchableOpacity>
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
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxHeight: '80%',
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
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  noteInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  
  // Enhanced Voice Recording Styles
  voiceSection: {
    width: '100%',
    marginBottom: 15,
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
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recordingHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  transcriptionIndicator: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  transcriptionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  voiceTextContainer: {
    padding: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  voiceTextLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  voiceTextDisplay: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  imageButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
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
  completionVoiceText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  completionImage: {
    marginTop: 10,
    paddingTop: 0,
    borderTopWidth: 0,
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
  imageErrorContainer: {
    padding: 10,
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.3)',
  },
  imageErrorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  imageErrorUrl: {
    fontSize: 10,
    fontFamily: 'monospace',
    opacity: 0.7,
  },
});