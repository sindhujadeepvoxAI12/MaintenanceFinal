import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
// import { useColorScheme } from '../../hooks/useColorScheme'; // Not needed - using light theme

const { width } = Dimensions.get('window');

const MachineDetails = ({ machine, onBack }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const router = useRouter();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const getScheduleColor = (schedule) => {
    switch (schedule) {
      case 'daily': return '#F59E0B';
      case 'weekly': return '#EC4899';
      case 'monthly': return '#6366F1';
      case 'quarterly': return '#8B5CF6';
      case 'semi-annually': return '#10B981';
      case 'annually': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Machine',
      'Are you sure you want to delete this machine?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // Handle delete logic here
            handleBack();
          }
        }
      ]
    );
  };

  // Helper function to get display text for maintenance schedule
  const getScheduleDisplayText = (schedule) => {
    if (Array.isArray(schedule)) {
      return schedule.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
    }
    // Fallback for old string format
    return schedule ? schedule.charAt(0).toUpperCase() + schedule.slice(1) : 'Not set';
  };

  // Helper function to get schedule description
  const getScheduleDescription = (schedule) => {
    if (Array.isArray(schedule)) {
      if (schedule.length === 1) {
        return `This machine requires maintenance on a ${schedule[0]} basis to ensure optimal performance and longevity.`;
      } else {
        return `This machine requires maintenance on multiple schedules: ${schedule.join(', ')} to ensure optimal performance and longevity.`;
      }
    }
    // Fallback for old string format
    return schedule ? `This machine requires maintenance on a ${schedule} basis to ensure optimal performance and longevity.` : 'Maintenance schedule not set.';
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={[styles.editButton, { backgroundColor: colors.buttonPrimary }]}>
            <Text style={[styles.editButtonText, { color: '#FFFFFF' }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.deleteButton, { backgroundColor: colors.buttonPrimary }]}>
            <Text style={[styles.deleteButtonText, { color: '#FFFFFF' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Machine Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.machineName, { color: colors.glowLight }]}>{machine.machineName || machine.name}</Text>
          <Text style={[styles.machineBrand, { color: colors.tabIconDefault }]}>
            {machine.machineBrand || machine.brand} - {machine.machineModel || machine.model}
          </Text>
          <View style={[styles.scheduleBadge, { backgroundColor: getScheduleColor(Array.isArray(machine.maintenanceSchedule) ? machine.maintenanceSchedule[0] : machine.maintenanceSchedule) }]}>
            <Text style={styles.scheduleText}>{getScheduleDisplayText(machine.maintenanceSchedule)}</Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Basic Information</Text>
          <View style={styles.infoGrid}>
            <View style={[styles.infoItem, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: colors.glowLight }]}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Category</Text>
              <Text style={[styles.infoValue, { color: colors.glowLight }]}>{machine.category || 'Custom'}</Text>
            </View>
            <View style={[styles.infoItem, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: colors.glowLight }]}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Validity</Text>
              <Text style={[styles.infoValue, { color: colors.glowLight }]}>{machine.validity || 'Not specified'}</Text>
            </View>
            <View style={[styles.infoItem, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: colors.glowLight }]}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Brand</Text>
              <Text style={[styles.infoValue, { color: colors.glowLight }]}>{machine.machineBrand || machine.brand || 'Custom'}</Text>
            </View>
            <View style={[styles.infoItem, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: colors.glowLight }]}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Model</Text>
              <Text style={[styles.infoValue, { color: colors.glowLight }]}>{machine.machineModel || machine.model || 'Custom'}</Text>
            </View>
          </View>
        </View>

        {/* Purchase Date and Last Maintenance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Timeline</Text>
          <View style={styles.infoGrid}>
            <View style={[styles.infoItem, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: colors.glowLight }]}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Purchase Date</Text>
              <Text style={[styles.infoValue, { color: colors.glowLight }]}>{machine.purchaseDate || 'Not specified'}</Text>
            </View>
            <View style={[styles.infoItem, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: colors.glowLight }]}>
              <Text style={[styles.infoLabel, { color: colors.tabIconDefault }]}>Last Maintenance</Text>
              <Text style={[styles.infoValue, { color: colors.glowLight }]}>
                {machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString() : 'New machine'}
              </Text>
            </View>
          </View>
        </View>

        {/* Maintenance Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Maintenance Types</Text>
          <View style={styles.maintenanceTypesContainer}>
            {(machine.maintenanceTypes || []).map((type, index) => (
              <View key={index} style={[styles.maintenanceTypeItem, { 
                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                borderColor: colors.glowLight 
              }]}>
                <Text style={[styles.maintenanceTypeText, { color: colors.glowLight }]}>{type}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Maintenance Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Maintenance Schedule</Text>
          <View style={styles.scheduleInfo}>
            <Text style={[styles.scheduleLabel, { color: colors.glowLight }]}>Current Schedule:</Text>
            <View style={[styles.scheduleBadgeLarge, { backgroundColor: getScheduleColor(Array.isArray(machine.maintenanceSchedule) ? machine.maintenanceSchedule[0] : machine.maintenanceSchedule) }]}>
              <Text style={styles.scheduleTextLarge}>{getScheduleDisplayText(machine.maintenanceSchedule)}</Text>
            </View>
          </View>
          <Text style={[styles.scheduleDescription, { 
            color: colors.tabIconDefault,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: colors.glowLight
          }]}>
            {getScheduleDescription(machine.maintenanceSchedule)}
          </Text>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
            style={styles.modalContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.glowLight }]}>Edit Machine</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={[styles.closeButton, { backgroundColor: colors.buttonPrimary }]}
              >
                <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalText, { color: colors.tabIconDefault }]}>Edit functionality coming soon...</Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.buttonPrimary }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: '#FFFFFF' }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark background
  },
  header: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  gradientButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  machineName: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  machineBrand: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
  },
  scheduleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scheduleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  infoItem: {
    padding: 15,
    borderRadius: 12,
    flex: 1,
    minWidth: (width - 70) / 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#1E293B', // Dark blue
    borderColor: '#00B4D8', // Glowing cyan
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  functionalityText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  maintenanceTypesContainer: {
    gap: 10,
  },
  maintenanceTypeItem: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#1E293B', // Dark blue
    borderColor: '#00B4D8', // Glowing cyan
  },
  maintenanceTypeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
  },
  scheduleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleBadgeLarge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  scheduleTextLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  scheduleDescription: {
    fontSize: 14,
    lineHeight: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#1E293B', // Dark blue
    borderColor: '#00B4D8', // Glowing cyan
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MachineDetails;
