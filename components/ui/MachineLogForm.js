import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useMachine } from '../../contexts/MachineContext';
import { useAuth } from '../../contexts/AuthContext';
import { machineData, maintenanceTypes } from '../../app/utils/machineData';
import { Colors } from '../../constants/Colors';
// import { useColorScheme } from '../../hooks/useColorScheme.js'; // Not needed - using light theme

export default function MachineLogForm({ visible, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    machineId: null,
    machineName: '',
    machineModel: '',
    machineBrand: '',
    machineImage: null,
    purchaseDate: '',
    validity: '',
    lastMaintenanceDate: '',
    maintenanceTypes: [],
    maintenanceSchedule: [],
    customMaintenanceTypes: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showMachineSelector, setShowMachineSelector] = useState(false);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');

  const machineContext = useMachine();
  const { user } = useAuth();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = machineData.filter(machine =>
        (machine.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (machine.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (machine.model || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMachines(filtered);
    } else {
      setFilteredMachines(machineData);
    }
  }, [searchQuery]);

  // Safety check - ensure machine context is available
  if (!machineContext || machineContext.isLoading) {
    return null;
  }

  const { addUserMachine } = machineContext;

  const handleMachineSelect = (machine) => {
    setFormData({
      ...formData,
      machineId: machine.id,
      machineName: machine.name,
      machineModel: machine.model,
      machineBrand: machine.brand,
      validity: machine.validity,
      maintenanceTypes: machine.maintenanceTypes,
      maintenanceSchedule: [machine.maintenanceSchedule]
    });
    setShowMachineSelector(false);
    setSearchQuery('');
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({
          ...formData,
          machineImage: result.assets[0].uri,
        });
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({
          ...formData,
          machineImage: result.assets[0].uri,
        });
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Add Machine Image',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: handleCameraCapture },
        { text: 'Photo Library', onPress: handleImagePick }
      ]
    );
  };

  const handleAddCustomMaintenanceType = () => {
    if (customTypeInput.trim()) {
      setFormData({
        ...formData,
        customMaintenanceTypes: [...formData.customMaintenanceTypes, customTypeInput.trim()]
      });
      setCustomTypeInput('');
    }
  };

  const handleRemoveCustomMaintenanceType = (index) => {
    const updated = formData.customMaintenanceTypes.filter((_, i) => i !== index);
    setFormData({ ...formData, customMaintenanceTypes: updated });
  };

  const toggleMaintenanceSchedule = (schedule) => {
    const updated = formData.maintenanceSchedule.includes(schedule)
      ? formData.maintenanceSchedule.filter(s => s !== schedule)
      : [...formData.maintenanceSchedule, schedule];
    setFormData({ ...formData, maintenanceSchedule: updated });
  };

  const handleSubmit = async () => {
    if (!formData.machineId) {
      if (!formData.machineName || !formData.machineModel || !formData.machineBrand) {
        Alert.alert('Error', 'Please fill in all machine details (name, model, and brand)');
        return;
      }
    }

    if (!formData.purchaseDate || !formData.validity) {
      Alert.alert('Error', 'Please fill in purchase date and validity');
      return;
    }

    if (formData.maintenanceTypes.length === 0 && formData.customMaintenanceTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one maintenance type');
      return;
    }

    if (formData.maintenanceSchedule.length === 0) {
      Alert.alert('Error', 'Please select at least one maintenance schedule');
      return;
    }

    setIsLoading(true);
    try {
      const allMaintenanceTypes = [...formData.maintenanceTypes, ...formData.customMaintenanceTypes];
      
      const success = await addUserMachine({
        userId: user.id,
        machineId: formData.machineId ? formData.machineId : `custom_${Date.now()}`,
        machineName: formData.machineName,
        machineModel: formData.machineModel,
        machineBrand: formData.machineBrand,
        machineImage: formData.machineImage,
        purchaseDate: formData.purchaseDate,
        validity: formData.validity,
        lastMaintenanceDate: formData.lastMaintenanceDate || null,
        maintenanceTypes: allMaintenanceTypes,
        maintenanceSchedule: formData.maintenanceSchedule
      });

      if (success) {
        Alert.alert('Success', 'Machine added successfully!', [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
              resetForm();
            }
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to add machine');
      }
    } catch (_error) {
      Alert.alert('Error', 'An error occurred while adding the machine');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      machineId: null,
      machineName: '',
      machineModel: '',
      machineBrand: '',
      machineImage: null,
      purchaseDate: '',
      validity: '',
      lastMaintenanceDate: '',
      maintenanceTypes: [],
      maintenanceSchedule: [],
      customMaintenanceTypes: []
    });
    setSearchQuery('');
    setCustomTypeInput('');
  };

  const toggleMaintenanceType = (type) => {
    const updated = formData.maintenanceTypes.includes(type)
      ? formData.maintenanceTypes.filter(t => t !== type)
      : [...formData.maintenanceTypes, type];
    setFormData({ ...formData, maintenanceTypes: updated });
  };

  const renderMachineSelector = () => (
    <Modal
      visible={showMachineSelector}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowMachineSelector(false)}
      statusBarTranslucent={true}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={styles.machineSelectorModal}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
          <View style={styles.modalHeader}>
            <Text style={[styles.machineSelectorTitle, { color: colors.glowLight }]}>Select Machine</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMachineSelector(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={[styles.searchInput, { 
              borderColor: colors.glowLight,
              color: colors.text,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              placeholderTextColor: colors.tabIconDefault
            }]}
            placeholder="Search machines..."
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <ScrollView style={styles.machineList} showsVerticalScrollIndicator={false}>
            {filteredMachines.map((machine) => (
              <TouchableOpacity
                key={machine.id}
                style={[styles.machineItem, { 
                  borderColor: colors.glowLight,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }]}
                onPress={() => handleMachineSelect(machine)}
              >
                <Text style={[styles.machineName, { color: colors.glowLight }]}>{machine.name}</Text>
                <Text style={[styles.machineDetails, { color: colors.tabIconDefault }]}>
                  {machine.brand} - {machine.model}
                </Text>
                <Text style={[styles.machineCategory, { color: colors.tabIconDefault }]}>
                  {machine.category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.buttonPrimary }]}
              onPress={() => setShowMachineSelector(false)}
            >
              <Text style={[styles.cancelButtonText, { color: '#FFFFFF' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
    </Modal>
  );

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
          <Text style={[styles.modalTitle, { color: colors.glowLight }]}>Add New Machine</Text>
          
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {/* Machine Selection (Optional) */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.glowLight }]}>Machine (Optional)</Text>
                <Text style={[styles.helperText, { color: colors.tabIconDefault }]}>
                  Select from predefined machines (auto-fills details) or leave empty to enter custom details below
                </Text>
                <TouchableOpacity
                  style={[styles.machineSelector, { 
                    borderColor: colors.glowLight,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }]}
                  onPress={() => setShowMachineSelector(true)}
                >
                  {formData.machineName ? (
                    <Text style={[styles.machineSelectorText, { color: colors.glowLight }]}>
                      {formData.machineName} - {formData.machineBrand}
                    </Text>
                  ) : (
                    <Text style={[styles.machineSelectorPlaceholder, { color: colors.tabIconDefault }]}>
                      Select a machine (optional)
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Custom Machine Details - Show only when no predefined machine is selected */}
              {!formData.machineId && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.glowLight }]}>Machine Name *</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderColor: colors.glowLight,
                        color: colors.text,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }]}
                      placeholder="Enter machine name"
                      placeholderTextColor={colors.tabIconDefault}
                      value={formData.machineName}
                      onChangeText={(text) => setFormData({ ...formData, machineName: text })}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.glowLight }]}>Machine Model *</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderColor: colors.glowLight,
                        color: colors.text,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }]}
                      placeholder="Enter machine model"
                      placeholderTextColor={colors.tabIconDefault}
                      value={formData.machineModel}
                      onChangeText={(text) => setFormData({ ...formData, machineModel: text })}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.glowLight }]}>Machine Brand *</Text>
                    <TextInput
                      style={[styles.input, { 
                        borderColor: colors.glowLight,
                        color: colors.text,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }]}
                      placeholder="Enter machine brand"
                      placeholderTextColor={colors.tabIconDefault}
                      value={formData.machineBrand}
                      onChangeText={(text) => setFormData({ ...formData, machineBrand: text })}
                    />
                  </View>
                </>
              )}

              {/* Machine Image */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.glowLight }]}>Machine Image (Optional)</Text>
                <TouchableOpacity
                  style={[styles.imagePicker, { 
                    borderColor: colors.glowLight,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }]}
                  onPress={showImagePickerOptions}
                >
                  {formData.machineImage ? (
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: formData.machineImage }} style={styles.machineImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setFormData({ ...formData, machineImage: null })}
                      >
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.imagePickerText, { color: colors.tabIconDefault }]}>
                      📷 Add Image
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Purchase Date */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.glowLight }]}>Purchase Date *</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: colors.glowLight,
                    color: colors.text,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.tabIconDefault}
                  value={formData.purchaseDate}
                  onChangeText={(text) => setFormData({ ...formData, purchaseDate: text })}
                />
              </View>

              {/* Validity */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.glowLight }]}>Validity *</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: colors.glowLight,
                    color: colors.text,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }]}
                  placeholder="e.g., 10 years, 5 years"
                  placeholderTextColor={colors.tabIconDefault}
                  value={formData.validity}
                  onChangeText={(text) => setFormData({ ...formData, validity: text })}
                />
              </View>

              {/* Last Maintenance Date */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.glowLight }]}>Last Maintenance Date (Optional)</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: colors.glowLight,
                    color: colors.text,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }]}
                  placeholder="YYYY-MM-DD (new machine if empty)"
                  placeholderTextColor={colors.tabIconDefault}
                  value={formData.lastMaintenanceDate}
                  onChangeText={(text) => setFormData({ ...formData, lastMaintenanceDate: text })}
                />
              </View>

              {/* Maintenance Schedule */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.glowLight }]}>Maintenance Schedule *</Text>
                <View style={styles.scheduleSelector}>
                  {['daily', 'weekly', 'monthly'].map((schedule) => (
                    <TouchableOpacity
                      key={schedule}
                      style={[
                        styles.scheduleOption,
                        formData.maintenanceSchedule.includes(schedule) && { 
                          backgroundColor: colors.buttonPrimary,
                          borderColor: colors.buttonPrimary
                        }
                      ]}
                      onPress={() => toggleMaintenanceSchedule(schedule)}
                    >
                      <Text style={[
                        styles.scheduleOptionText,
                        { color: formData.maintenanceSchedule.includes(schedule) ? colors.text : colors.glowLight }
                      ]}>
                        {schedule.charAt(0).toUpperCase() + schedule.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Maintenance Types */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.glowLight }]}>Maintenance Types *</Text>
                <View style={styles.maintenanceTypesContainer}>
                  {maintenanceTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.maintenanceTypeChip,
                        formData.maintenanceTypes.includes(type) && { 
                          backgroundColor: colors.buttonPrimary,
                          borderColor: colors.buttonPrimary
                        }
                      ]}
                      onPress={() => toggleMaintenanceType(type)}
                    >
                      <Text style={[
                        styles.maintenanceTypeText,
                        { color: formData.maintenanceTypes.includes(type) ? colors.text : colors.glowLight }
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {/* Custom Type Input */}
                <View style={styles.customTypeInputContainer}>
                  <TextInput
                    style={[styles.customTypeInput, { 
                      borderColor: colors.glowLight,
                      color: colors.text,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }]}
                    placeholder="Enter custom maintenance type"
                    placeholderTextColor={colors.tabIconDefault}
                    value={customTypeInput}
                    onChangeText={setCustomTypeInput}
                  />
                  <TouchableOpacity
                    style={[styles.addCustomButton, { backgroundColor: colors.buttonPrimary }]}
                    onPress={handleAddCustomMaintenanceType}
                  >
                    <Text style={[styles.addCustomButtonText, { color: '#FFFFFF' }]}>Add</Text>
                  </TouchableOpacity>
                </View>

                {formData.customMaintenanceTypes.length > 0 && (
                  <View style={styles.customTypesContainer}>
                    <Text style={[styles.customTypesLabel, { color: colors.glowLight }]}>Custom Types:</Text>
                    {formData.customMaintenanceTypes.map((type, index) => (
                      <View key={index} style={[styles.customTypeItem, { 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: colors.glowLight
                      }]}>
                        <Text style={[styles.customTypeText, { color: colors.glowLight }]}>{type}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveCustomMaintenanceType(index)}
                          style={styles.removeCustomTypeButton}
                        >
                          <Text style={styles.removeCustomTypeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.buttonPrimary }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: '#FFFFFF' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.buttonPrimary }]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>Add Machine</Text>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>

      {renderMachineSelector()}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start', // Changed from center to flex-start for full screen
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 0,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  machineSelectorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#94A3B8', // Light blue-gray
    marginBottom: 10,
    fontStyle: 'italic',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  machineSelector: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  machineSelectorText: {
    fontSize: 16,
  },
  machineSelectorPlaceholder: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  imagePicker: {
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imagePickerText: {
    fontSize: 16,
  },
  machineImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scheduleSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scheduleOptionText: {
    fontWeight: '600',
  },
  maintenanceTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  maintenanceTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  maintenanceTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customTypeInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  customTypeInput: {
    flex: 0.7, // Reduced from flex: 1 to make it narrower
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addCustomButton: {
    flex: 0.3, // Fixed width for the button
    borderRadius: 8,
    overflow: 'hidden',
    height: 40, // Match the input height
  },
  addCustomButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  customTypesContainer: {
    marginTop: 10,
  },
  customTypesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  customTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    backgroundColor: '#1E293B', // Dark blue
    borderColor: '#00B4D8', // Glowing cyan
  },
  customTypeText: {
    fontSize: 14,
  },
  removeCustomTypeButton: {
    paddingHorizontal: 8,
  },
  removeCustomTypeText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
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
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  gradientButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  // Machine selector modal styles
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 20,
    borderColor: '#00B4D8',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  machineList: {
    flex: 1,
    marginBottom: 0,
    paddingHorizontal: 20,
  },
  machineItem: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  machineName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: '#F1F5F9',
  },
  machineDetails: {
    fontSize: 16,
    marginBottom: 4,
    color: '#94A3B8',
  },
  machineCategory: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#64748B',
    marginBottom: 0,
  },
  machineSelectorModal: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 0,
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
    paddingHorizontal: 20,
    paddingTop: 50, // Account for status bar
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30, // Extra padding for bottom safe area
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
});
