import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useMachine } from '../../contexts/MachineContext';
// import { useColorScheme } from '../../hooks/useColorScheme.js'; // Not needed - using light theme
import { getMachinesByUser } from '../../services/machineService';

export default function MachinesScreen() {
  const { user } = useAuth();
  const machineContext = useMachine();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];

  const [apiMachines, setApiMachines] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user?.id) return;
      console.log('[Machines] fetching machines for userId:', user.id);
      setIsFetching(true);
      setFetchError(null);
      try {
        const list = await getMachinesByUser(user.id);
        if (isMounted) {
          const normalized = Array.isArray(list) ? list : [];
          console.log('[Machines] received items:', normalized.length);
          setApiMachines(normalized);
        }
      } catch (e) {
        if (isMounted) setFetchError(e?.message || 'Failed to fetch machines');
        console.log('[Machines] fetch error:', e?.message || e);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [user?.id]);

  // Safety check - ensure machine context and user are available
  if (!machineContext || machineContext.isLoading || !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.tabIconDefault }]}>Loading machine data...</Text>
        </View>
      </View>
    );
  }

  const { userMachines } = machineContext;

  // Prefer API list; fallback to local context
  const localMachines = userMachines.filter(m => m.userId === user?.id);
  const combinedList = apiMachines.length > 0 ? apiMachines : localMachines;

  const getMaintenanceStatus = (machine) => {
    if (!machine.lastMaintenanceDate) return { status: 'new', color: colors.text, text: 'NEW' };
    const lastMaintenance = new Date(machine.lastMaintenanceDate);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24));
    switch (machine.maintenanceSchedule) {
      case 'daily':
        if (daysSince >= 1) return { status: 'overdue', color: colors.text, text: 'OVERDUE' };
        if (daysSince >= 0) return { status: 'due', color: colors.text, text: 'DUE TODAY' };
        break;
      case 'weekly':
        if (daysSince >= 7) return { status: 'overdue', color: colors.text, text: 'OVERDUE' };
        if (daysSince >= 6) return { status: 'urgent', color: colors.text, text: 'DUE TOMORROW' };
        if (daysSince >= 0) return { status: 'due', color: colors.text, text: 'ON TIME' };
        break;
      case 'monthly':
        if (daysSince >= 30) return { status: 'overdue', color: colors.text, text: 'OVERDUE' };
        if (daysSince >= 25) return { status: 'urgent', color: colors.text, text: 'DUE SOON' };
        if (daysSince >= 0) return { status: 'due', color: colors.text, text: 'ON TIME' };
        break;
    }
    return { status: 'due', color: colors.text, text: 'ON TIME' };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.glowLight }]}>My Machines</Text>
          <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>
            {isFetching ? 'Fetching from server…' : fetchError ? `Error: ${fetchError}` : 'Your machine inventory and maintenance schedules'}
          </Text>
        </View>

        {/* Machines List */}
        <View style={styles.machinesSection}>
          <Text style={[styles.sectionTitle, { color: colors.glowLight }]}>Your Machines ({combinedList.length})</Text>
          
          {combinedList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateIcon, { color: colors.tabIconDefault }]}>🔧</Text>
              <Text style={[styles.emptyStateTitle, { color: colors.glowLight }]}>No machines</Text>
              <Text style={[styles.emptyStateText, { color: colors.tabIconDefault }]}>Your account currently has no machines assigned.</Text>
            </View>
          ) : (
            combinedList.map((machine) => {
              const status = getMaintenanceStatus(machine);
              return (
                <View key={machine.id || machine._id} style={[styles.machineCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <View style={styles.machineHeader}>
                    <View style={styles.machineInfo}>
                      <Text style={[styles.machineName, { color: colors.glowLight }]}>{machine.machineName || machine.name}</Text>
                      <Text style={[styles.machineDetails, { color: colors.tabIconDefault }]}>{(machine.machineBrand || machine.brand) + ' - ' + (machine.machineModel || machine.model || '')}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: colors.border }]}>
                      <Text style={[styles.statusBadgeText, { color: colors.text }]}>{status.text}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.machineDetailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>Schedule</Text>
                      <Text style={[styles.detailValue, { color: colors.glowLight }]}>
                        {Array.isArray(machine.maintenanceSchedule) 
                          ? machine.maintenanceSchedule.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
                          : machine.maintenanceSchedule 
                            ? String(machine.maintenanceSchedule).charAt(0).toUpperCase() + String(machine.maintenanceSchedule).slice(1)
                            : 'Not set'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>Purchase Date</Text>
                      <Text style={[styles.detailValue, { color: colors.glowLight }]}>{machine.purchaseDate || '-'}</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>Validity</Text>
                      <Text style={[styles.detailValue, { color: colors.glowLight }]}>{machine.validity || '-'}</Text>
                    </View>
                    
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.tabIconDefault }]}>Last Maintenance</Text>
                      <Text style={[styles.detailValue, { color: colors.glowLight }]}>{machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString() : 'Never'}</Text>
                    </View>
                  </View>

                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  machinesSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  machineCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
  },
  machineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  machineInfo: {
    flex: 1,
    marginRight: 12,
  },
  machineName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  machineDetails: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  machineDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  maintenanceTypes: {
    marginBottom: 16,
  },
  maintenanceTypesLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  typesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
