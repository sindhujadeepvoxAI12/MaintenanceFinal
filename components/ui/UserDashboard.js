import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useMachine } from '../../contexts/MachineContext';
import MaintenanceReminder from './MaintenanceReminder';
import { Colors } from '../../constants/Colors';
// import { useColorScheme } from '../../hooks/useColorScheme'; // Not needed - using light theme

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

export default function UserDashboard() {
  const [showMaintenanceReminder, setShowMaintenanceReminder] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { user, logout, isLoading: authLoading } = useAuth();
  const machineContext = useMachine();
  const colorScheme = 'light'; // Force light theme
  
  // Animation values for each stat card
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Animate stats cards on mount - faster timing
  useEffect(() => {
    const animationSequence = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]);

    // Stagger the animations for each card - faster start
    setTimeout(() => {
      animationSequence.start();
    }, 100);
  }, [fadeAnim, scaleAnim, slideAnim]);

  // Safety check - ensure machine context and user are available
  if (authLoading || !machineContext || machineContext.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please log in to continue...</Text>
        </View>
      </View>
    );
  }

  const { 
    userMachines, 
    getMaintenanceReminders, 
    getUpcomingMaintenance,
    deleteUserMachine 
  } = machineContext;
  
  const colors = Colors[colorScheme ?? 'light'];

  // Filter machines for current user
  const userMachinesList = user?.id && userMachines ? userMachines.filter(machine => machine.userId === user.id) : [];
  const maintenanceReminders = user?.id && getMaintenanceReminders ? getMaintenanceReminders().filter(machine => machine.userId === user.id) : [];
  const upcomingMaintenance = user?.id && getUpcomingMaintenance ? getUpcomingMaintenance().filter(machine => machine.userId === user.id) : [];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout }
      ]
    );
  };

  const handleMaintenanceReminder = (machine) => {
    setSelectedMachine(machine);
    setShowMaintenanceReminder(true);
  };

  const handleMaintenanceComplete = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDeleteMachine = (machineId) => {
    Alert.alert(
      'Delete Machine',
      'Are you sure you want to delete this machine? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteUserMachine(machineId);
            if (success) {
              Alert.alert('Success', 'Machine deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete machine');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const userStats = [
    {
      icon: '🔧',
      value: userMachinesList.length.toString(),
      label: 'Total Machines',
      color: '#3b82f6'
    },
    {
      icon: '📋',
      value: upcomingMaintenance.length.toString(),
      label: 'Due Maintenance',
      color: '#f59e0b'
    },
    {
      icon: '✅',
      value: (userMachinesList.length - upcomingMaintenance.length).toString(),
      label: 'Up to Date',
      color: '#10b981'
    },
    {
      icon: '⏳',
      value: maintenanceReminders.length.toString(),
      label: 'Reminders',
      color: '#ef4444'
    }
  ];

  // Animated stat card component
  const AnimatedStatCard = ({ stat, index, delay = 0 }) => {
    const cardFadeAnim = useRef(new Animated.Value(0)).current;
    const cardScaleAnim = useRef(new Animated.Value(0.8)).current;
    const cardSlideAnim = useRef(new Animated.Value(50)).current;
    const pressAnim = useRef(new Animated.Value(1)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(cardFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(cardScaleAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(cardSlideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Start floating animation after initial animation - faster start
        setTimeout(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(floatAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(floatAnim, {
                toValue: 0,
                duration: 2000,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }, 500 + delay);
      }, delay);

      return () => clearTimeout(timer);
    }, [cardFadeAnim, cardScaleAnim, cardSlideAnim, delay, floatAnim]);

    const handlePressIn = () => {
      Animated.spring(pressAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 10,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 10,
      }).start();
    };

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.statCard,
            {
              opacity: cardFadeAnim,
              transform: [
              { scale: Animated.multiply(cardScaleAnim, pressAnim) },
              { translateY: Animated.add(cardSlideAnim, Animated.multiply(floatAnim, 3)) }
            ],
            }
          ]}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientMiddle]}
            style={styles.statCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: colors.glowLight }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>{stat.label}</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
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
        <Text style={[styles.headerTitle, { color: colors.glowLight }]}> 
          Welcome, {user?.email?.split('@')[0] || 'User'}!
        </Text>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: '#FFFFFF' }]}>Logout</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards Grid */}
        <View style={styles.statsGridContainer}>
          {userStats.map((stat, index) => (
            <AnimatedStatCard key={index} stat={stat} index={index} delay={index * 150} />
          ))}
        </View>

        {/* Quick Actions (no add machine) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Quick Actions</Text>
        </View>

        {/* Maintenance Reminders */}
        {maintenanceReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>⚠️ Maintenance Reminders</Text>
            {maintenanceReminders.slice(0, 3).map((machine) => (
              <TouchableOpacity
                key={machine.id}
                style={[styles.reminderItem, { borderColor: colors.glowLight, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}
                onPress={() => handleMaintenanceReminder(machine)}
              >
                <Text style={[styles.reminderMachineName, { color: colors.glowLight }]}>{machine.machineName}</Text>
                <Text style={[styles.reminderDetails, { color: colors.tabIconDefault }]}>{machine.machineBrand} - {machine.machineModel}</Text>
                <Text style={[styles.reminderSchedule, { color: colors.tabIconDefault }]}>Schedule: {machine.maintenanceSchedule.join(', ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Your Machines */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>🔧 Your Machines</Text>
          {userMachinesList.length > 0 ? (
            userMachinesList.map((machine) => (
              <View key={machine.id} style={[styles.machineCard, { borderColor: colors.glowLight, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                <View style={styles.machineHeader}>
                  <Text style={[styles.machineName, { color: colors.glowLight }]}>{machine.machineName}</Text>
                  <View style={[styles.machineStatus, { backgroundColor: machine.status === 'active' ? colors.success : colors.warning }]}>
                    <Text style={styles.machineStatusText}>{machine.status === 'active' ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
                <Text style={[styles.machineDetails, { color: colors.tabIconDefault }]}>{machine.machineBrand} - {machine.machineModel}</Text>
                <Text style={[styles.machineSchedule, { color: colors.tabIconDefault }]}>Schedule: {machine.maintenanceSchedule.join(', ')}</Text>
                <View style={styles.machineActions}>
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.buttonPrimary }]} onPress={() => handleMaintenanceReminder(machine)}>
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.buttonPrimary }]} onPress={() => handleDeleteMachine(machine.id)}>
                    <Text style={[styles.deleteButtonText, { color: '#FFFFFF' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyState, { color: colors.tabIconDefault }]}>No machines assigned to your account.</Text>
          )}
        </View>
      </ScrollView>

      {/* Maintenance Reminder Modal */}
      {selectedMachine && (
        <MaintenanceReminder
          visible={showMaintenanceReminder}
          onClose={() => { setShowMaintenanceReminder(false); setSelectedMachine(null); }}
          machine={selectedMachine}
          onMaintenanceComplete={handleMaintenanceComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
    marginRight: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  logoutButton: {
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  statsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 15,
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statCardGradient: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reminderCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderColor: '#00B4D8',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderMachineName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  reminderDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  reminderSchedule: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  reminderTap: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  machineCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: '#1E293B',
    borderColor: '#00B4D8',
  },
  machineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  machineInfo: {
    flex: 1,
    marginRight: 12,
  },
  machineName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  machineDetails: {
    fontSize: 14,
    marginBottom: 8,
  },
  machineDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  machineActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#67E8F9',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  gradientButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  reminderItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    backgroundColor: '#1E293B',
    borderColor: '#00B4D8',
  },
  machineStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  machineStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  machineSchedule: {
    fontSize: 14,
    marginBottom: 8,
  },
});
