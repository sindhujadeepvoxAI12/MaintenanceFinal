import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { machineData } from '../../app/utils/machineData';
import { Colors } from '../../constants/Colors';
// import { useColorScheme } from '../../hooks/useColorScheme.js'; // Not needed - using light theme

const MachineList = ({ onMachineSelect, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const router = useRouter();
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];

  const categories = useMemo(() => {
    const cats = ['all', ...new Set(machineData.map(machine => machine.category))];
    return cats;
  }, []);

  const filteredAndSortedMachines = useMemo(() => {
    let filtered = machineData.filter(machine => {
      const matchesSearch = (machine.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (machine.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (machine.model || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || machine.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'brand':
          aValue = (a.brand || '').toLowerCase();
          bValue = (b.brand || '').toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'schedule':
          aValue = Array.isArray(a.maintenanceSchedule) 
            ? (a.maintenanceSchedule.join(', ') || '').toLowerCase()
            : (a.maintenanceSchedule || '').toLowerCase();
          bValue = Array.isArray(b.maintenanceSchedule) 
            ? (b.maintenanceSchedule.join(', ') || '').toLowerCase()
            : (b.maintenanceSchedule || '').toLowerCase();
          break;
        default:
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, sortBy, sortOrder]);

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

  const handleMachineSelect = (machine) => {
    if (onMachineSelect) {
      onMachineSelect(machine);
    } else {
      router.push(`/machine-details?id=${machine.id}`);
    }
  };

  const renderMachineItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.machineCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleMachineSelect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.machineHeader}>
          <View style={styles.machineInfo}>
            <Text style={[styles.machineName, { color: colors.glowLight }]}>{item.name}</Text>
            <Text style={[styles.machineBrand, { color: colors.tabIconDefault }]}>{item.brand} - {item.model}</Text>
          </View>
          <View style={[styles.scheduleBadge, { backgroundColor: getScheduleColor(Array.isArray(item.maintenanceSchedule) ? item.maintenanceSchedule[0] : item.maintenanceSchedule) }]}>
            <Text style={styles.scheduleText}>
              {Array.isArray(item.maintenanceSchedule) 
                ? item.maintenanceSchedule.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
                : item.maintenanceSchedule || 'Not set'
              }
            </Text>
          </View>
        </View>
        
        <View style={styles.machineDetails}>
          <View style={[styles.categoryChip, { backgroundColor: colors.border }]}>
            <Text style={[styles.categoryText, { color: colors.tabIconDefault }]}>{item.category}</Text>
          </View>
          <Text style={[styles.maintenanceTypes, { color: colors.tabIconDefault }]}>
            {item.maintenanceTypes.slice(0, 3).join(', ')}
            {item.maintenanceTypes.length > 3 && '...'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryChip = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        { backgroundColor: colors.border },
                        selectedCategory === item && { backgroundColor: colors.buttonPrimary }
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Text style={[
        styles.categoryChipText,
        { color: colors.tabIconDefault },
        selectedCategory === item && { color: colors.background }
      ]}>
        {item === 'all' ? 'All Categories' : item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.gradientStart }]}>
        <Text style={[styles.title, { color: colors.glowLight }]}>Machines</Text>
        <Text style={[styles.subtitle, { color: colors.tabIconDefault }]}>Industrial Equipment Management</Text>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.buttonPrimary }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search machines..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.tabIconDefault}
          />
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryChip}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Sort Controls */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: colors.tabIconDefault }]}>Sort by:</Text>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={() => setSortBy('name')}
        >
          <Text style={[styles.sortButtonText, { color: '#FFFFFF' }]}>
            Name
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={() => setSortBy('brand')}
        >
          <Text style={[styles.sortButtonText, { color: '#FFFFFF' }]}>
            Brand
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={() => setSortBy('category')}
        >
          <Text style={[styles.sortButtonText, { color: '#FFFFFF' }]}>
            Category
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <Text style={[styles.sortButtonText, { color: '#FFFFFF' }]}>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Machine List */}
      <FlatList
        data={filteredAndSortedMachines}
        renderItem={renderMachineItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.machineList}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchBox: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
  },
  searchInput: {
    padding: 16,
    fontSize: 16,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  categoryList: {
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 15,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  machineList: {
    padding: 20,
    paddingTop: 0,
  },
  machineCard: {
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
  machineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  machineInfo: {
    flex: 1,
    marginRight: 12,
  },
  machineName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  machineBrand: {
    fontSize: 14,
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
  machineDetails: {
    gap: 8,
  },
  categoryChipSecondary: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
  },
  maintenanceTypes: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default MachineList;
