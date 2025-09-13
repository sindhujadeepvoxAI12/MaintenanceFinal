import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMachine } from '../../contexts/MachineContext';
import { Colors } from '../../constants/Colors';
// import { useColorScheme } from '../../hooks/useColorScheme'; // Not needed - using light theme

export default function MaintenanceReminder({ visible, onClose, machine, onMaintenanceComplete }) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const machineContext = useMachine();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];

  // Safety check - ensure machine context is available
  if (!machineContext || machineContext.isLoading) {
    return null;
  }

  const { markMaintenanceComplete } = machineContext;

  const handleComplete = async () => {
    if (!notes.trim()) {
      // No notes, mark as complete directly
      setIsSubmitting(true);
      try {
        const success = await markMaintenanceComplete(machine.id);
        if (success) {
          Alert.alert('Success', 'Maintenance marked as complete!', [
            {
              text: 'OK',
              onPress: () => {
                onMaintenanceComplete();
                onClose();
              }
            }
          ]);
        } else {
          Alert.alert('Error', 'Failed to mark maintenance as complete');
        }
      } catch (_error) {
        Alert.alert('Error', 'An error occurred');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Has notes, mark as complete with notes
      setIsSubmitting(true);
      try {
        const success = await markMaintenanceComplete(machine.id, notes.trim());
        if (success) {
          Alert.alert('Success', 'Maintenance marked as complete with notes!', [
            {
              text: 'OK',
              onPress: () => {
                onMaintenanceComplete();
                onClose();
                setNotes('');
              }
            }
          ]);
        } else {
          Alert.alert('Error', 'Failed to mark maintenance as complete');
        }
      } catch (_error) {
        Alert.alert('Error', 'An error occurred');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={styles.modalContent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={[styles.modalTitle, { color: colors.glowLight }]}>
            Maintenance Reminder
          </Text>
        </View>
        
        {/* Content Section */}
        <View style={styles.contentSection}>
          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.machineInfoCard}>
              <Text style={[styles.reminderText, { color: colors.glowLight }]}>
                {machine.machineName} ({machine.machineBrand} - {machine.machineModel})
              </Text>
              
              <Text style={[styles.scheduleText, { color: colors.tabIconDefault }]}>
                Maintenance Schedule: {machine.maintenanceSchedule.join(', ')}
              </Text>
            </View>
            
            <View style={styles.messageCard}>
              <Text style={[styles.dueText, { color: colors.glowLight }]}>
                Maintenance is due! Please confirm when you&apos;ve completed the maintenance.
              </Text>
            </View>

            <View style={styles.notesContainer}>
              <Text style={[styles.notesLabel, { color: colors.glowLight }]}>
                Notes (Optional):
              </Text>
              <TextInput
                style={[styles.notesInput, { 
                  borderColor: colors.glowLight,
                  color: colors.text,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }]}
                placeholder="Add any notes about the maintenance..."
                placeholderTextColor={colors.tabIconDefault}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.buttonPrimary }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: '#FFFFFF' }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: colors.buttonPrimary }]}
            onPress={handleComplete}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.completeButtonText, { color: '#FFFFFF' }]}>Mark Complete</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerSection: {
    paddingTop: 0,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 10,
  },
  machineInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reminderText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  scheduleText: {
    fontSize: 16,
    marginBottom: 0,
    textAlign: 'center',
    opacity: 0.8,
  },
  messageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dueText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 0,
    textAlign: 'center',
    lineHeight: 24,
  },
  notesContainer: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    padding: 20,
    paddingBottom: 30, // Extra padding for bottom safe area
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  completeButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 16,
  },
});
