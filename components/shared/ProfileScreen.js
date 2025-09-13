import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
// import { useColorScheme } from '../../hooks/useColorScheme.js'; // Not needed - using light theme
import { ProtectedRoute } from '../ProtectedRoute';

export default function ProfileScreen() {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  
  const { user, logout } = useAuth();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => logout()
        }
      ]
    );
  };

  const handleEditProfile = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    // Here you would typically update the user profile
    Alert.alert('Success', 'Profile updated successfully!');
    setShowEditProfile(false);
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
        style={styles.profileGradient}
      >
        <View style={[styles.avatarContainer, { backgroundColor: colors.glowLight }]}>
          <Text style={[styles.avatarText, { color: colors.background }]}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.glowLight }]}>
          {user?.name || 'User Name'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.tabIconDefault }]}>
          {user?.email || 'user@example.com'}
        </Text>
        <TouchableOpacity
                          style={[styles.editButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={handleEditProfile}
        >
                          <Text style={[styles.editButtonText, { color: '#FFFFFF' }]}>
                  Edit Profile
                </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderAccountSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Account Settings</Text>
      
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Text style={[styles.settingIcon, { color: colors.glowLight }]}>👤</Text>
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: colors.glowLight }]}>Personal Information</Text>
            <Text style={[styles.settingDescription, { color: colors.tabIconDefault }]}>
              Update your name and email
            </Text>
          </View>
        </View>
        <Text style={[styles.menuArrow, { color: colors.tabIconDefault }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Text style={[styles.settingIcon, { color: colors.glowLight }]}>🔒</Text>
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: colors.glowLight }]}>Privacy & Security</Text>
            <Text style={[styles.settingDescription, { color: colors.tabIconDefault }]}>
              Manage your privacy settings
            </Text>
          </View>
        </View>
        <Text style={[styles.menuArrow, { color: colors.tabIconDefault }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Text style={[styles.settingIcon, { color: colors.glowLight }]}>🔔</Text>
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: colors.glowLight }]}>Notifications</Text>
            <Text style={[styles.settingDescription, { color: colors.tabIconDefault }]}>
              Configure notification preferences
            </Text>
          </View>
        </View>
        <Text style={[styles.menuArrow, { color: colors.tabIconDefault }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Text style={[styles.settingIcon, { color: colors.glowLight }]}>🌙</Text>
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: colors.glowLight }]}>Appearance</Text>
            <Text style={[styles.settingDescription, { color: colors.tabIconDefault }]}>
              Customize app theme and display
            </Text>
          </View>
        </View>
        <Text style={[styles.menuArrow, { color: colors.tabIconDefault }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuLeft}>
          <Text style={[styles.settingIcon, { color: colors.glowLight }]}>🔐</Text>
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: colors.glowLight }]}>Security</Text>
            <Text style={[styles.settingDescription, { color: colors.tabIconDefault }]}>
              Password and biometric settings
            </Text>
          </View>
        </View>
        <Text style={[styles.menuArrow, { color: colors.tabIconDefault }]}>›</Text>
      </TouchableOpacity>
    </View>
  );



  const renderLogoutButton = () => (
    <View style={styles.logoutSection}>
      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary }]}
        onPress={handleLogout}
      >
        <Text style={[styles.logoutButtonText, { color: '#FFFFFF' }]}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ProtectedRoute>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.glowLight }]}>Profile</Text>
          <Text style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}>
            Manage your account settings
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderProfileHeader()}
          {renderAccountSection()}
          {renderLogoutButton()}
        </ScrollView>

        {/* Edit Profile Modal */}
        {showEditProfile && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.glowLight }]}>
                Edit Profile
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.tabIconDefault }]}>Name</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.glowLight 
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.tabIconDefault}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.tabIconDefault }]}>Email</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.glowLight 
                  }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.tabIconDefault}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditProfile(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.tabIconDefault }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.buttonPrimary }]}
                  onPress={handleSaveProfile}
                >
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileHeader: {
    marginBottom: 25,
    marginTop: 10,
  },
  profileGradient: {
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 20,
  },
  editButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 10,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  menuArrow: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  logoutSection: {
    marginBottom: 30,
    marginTop: 10,
  },
  logoutButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    width: '85%',
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
    marginBottom: 25,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveButton: {
    borderColor: 'transparent',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
