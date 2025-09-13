import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#000000',
        headerShown: false,
        tabBarActiveBackgroundColor: '#FFFFFF',
        tabBarInactiveBackgroundColor: '#FFFFFF',
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            height: 85,
            paddingBottom: 15,
            paddingTop: 0,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
            borderTopColor: '#E5E7EB',
          },
          default: {
            height: 80,
            paddingBottom: 8,
            paddingTop: 0,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
            borderTopColor: '#E5E7EB',
          },
        }),
        tabBarIconStyle: {
          marginTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 3,
        },
      }}>
      <Tabs.Screen
        name="machines"
        options={{
          title: 'Machines',
          tabBarIcon: () => <IconSymbol size={36} name="gearshape.fill" color="#000000" />,
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Maintenance',
          tabBarIcon: () => <IconSymbol size={36} name="list.clipboard.fill" color="#000000" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <IconSymbol size={36} name="person.fill" color="#000000" />,
        }}
      />
    </Tabs>
  );
}
