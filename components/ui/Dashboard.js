import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { machineData } from '../../app/utils/machineData';
import { Colors } from '../../constants/Colors';
// import { useColorScheme } from '../../hooks/useColorScheme'; // Not needed - using light theme

const { width } = Dimensions.get('window');

const Dashboard = ({ onMachineSelect, onViewAll }) => {
  const router = useRouter();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];
  
  const dashboardStats = useMemo(() => {
    const totalMachines = machineData.length;
    const dailySchedule = machineData.filter(machine => machine.maintenanceSchedule === 'daily').length;
    const weeklySchedule = machineData.filter(machine => machine.maintenanceSchedule === 'weekly').length;
    const monthlySchedule = machineData.filter(machine => machine.maintenanceSchedule === 'monthly').length;
    const otherSchedule = machineData.filter(machine => 
      !['daily', 'weekly', 'monthly'].includes(machine.maintenanceSchedule)
    ).length;

    return { totalMachines, dailySchedule, weeklySchedule, monthlySchedule, otherSchedule };
  }, []);

  const maintenanceOverview = useMemo(() => {
    const overview = [];
    
    machineData.forEach(machine => {
      overview.push({
        ...machine,
        schedule: machine.maintenanceSchedule,
        maintenanceCount: machine.maintenanceTypes.length
      });
    });
    
    return overview
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5);
  }, []);

  const handleMachineSelect = (machine) => {
    if (onMachineSelect) {
      onMachineSelect(machine);
    } else {
      router.push(`/machine-details?id=${machine.id}`);
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      router.push('/machines');
    }
  };

  const renderMaintenanceItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.maintenanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleMachineSelect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.maintenanceHeader}>
          <Text style={[styles.maintenanceTitle, { color: colors.glowLight }]}>{item.name}</Text>
          <View style={[styles.scheduleBadge, { backgroundColor: getScheduleColor(item.schedule) }]}>
            <Text style={styles.scheduleText}>{item.schedule}</Text>
          </View>
        </View>
        
        <View style={styles.maintenanceDetails}>
          <Text style={[styles.maintenanceBrand, { color: colors.tabIconDefault }]}>{item.brand} - {item.model}</Text>
          <Text style={[styles.maintenanceCategory, { backgroundColor: colors.border, color: colors.tabIconDefault }]}>{item.category}</Text>
          <Text style={[styles.maintenanceTypes, { color: colors.tabIconDefault }]}>
            {item.maintenanceTypes.slice(0, 3).join(', ')}
            {item.maintenanceTypes.length > 3 && '...'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.gradientStart }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.glowLight }]}>Maintenance Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>Industrial Machine Management</Text>
        </View>
      </View>

      {/* Statistics Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.glowLight }]}>{dashboardStats.totalMachines}</Text>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Total Machines</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.glowLight }]}>{dashboardStats.dailySchedule}</Text>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Daily</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.glowLight }]}>{dashboardStats.weeklySchedule}</Text>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Weekly</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statNumber, { color: colors.glowLight }]}>{dashboardStats.monthlySchedule}</Text>
          <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>Monthly</Text>
        </View>
      </View>

      {/* Maintenance Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Maintenance Overview</Text>
          <TouchableOpacity onPress={handleViewAll}>
            <Text style={[styles.viewAllText, { color: colors.glowLight }]}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={maintenanceOverview}
          renderItem={renderMaintenanceItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  statCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    minWidth: (width - 70) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  maintenanceCard: {
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
  },
  cardContent: {
    padding: 20,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  maintenanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  scheduleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textTransform: 'capitalize',
  },
  maintenanceDetails: {
    gap: 8,
  },
  maintenanceBrand: {
    fontSize: 14,
  },
  maintenanceCategory: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  maintenanceTypes: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default Dashboard;
