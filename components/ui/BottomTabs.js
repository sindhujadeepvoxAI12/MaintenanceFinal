import { BarChart3, Calendar, Home, List } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
// import { useColorScheme } from '../../hooks/useColorScheme'; // Not needed - using light theme

const BottomTabs = ({ activeTab, onTabPress }) => {
  const colorScheme = 'light'; // Force light theme
  const colors = Colors[colorScheme];
  
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'machines', label: 'Machines', icon: List },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.8}
          >
            {isActive ? (
              <View style={[
                styles.activeTabContainer,
                { 
                  backgroundColor: colors.tabActive,
                  shadowColor: colors.tabActive
                }
              ]}>
                <Icon size={24} color="#000000" />
                <Text style={styles.tabLabelActive}>{tab.label}</Text>
                <View style={[
                  styles.activeIndicator,
                  { backgroundColor: colors.tabActiveSecondary }
                ]} />
              </View>
            ) : (
              <>
                <Icon size={24} color={colors.tabIconDefault} />
                <Text style={[styles.tabLabel, { color: colors.tabIconDefault }]}>{tab.label}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    position: 'relative',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeTabContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 3,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});

export default BottomTabs;
