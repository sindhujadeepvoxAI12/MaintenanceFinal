import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Removed static machineData fallback; rely on AsyncStorage/API only

const MachineContext = createContext(undefined);

export const useMachine = () => {
  const context = useContext(MachineContext);
  if (!context) {
    throw new Error('useMachine must be used within a MachineProvider');
  }
  return context;
};

export const MachineProvider = ({ children }) => {
  const [userMachines, setUserMachines] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadMachineData();
  }, []);

  const loadMachineData = async () => {
    try {
      setIsLoading(true);
      const storedMachines = await AsyncStorage.getItem('userMachines');
      const storedRecords = await AsyncStorage.getItem('maintenanceRecords');
      
      if (storedMachines) {
        setUserMachines(JSON.parse(storedMachines));
      }
      if (storedRecords) {
        setMaintenanceRecords(JSON.parse(storedRecords));
      }
    } catch (error) {
      console.error('Error loading machine data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMachineData = async (machines, records) => {
    try {
      await AsyncStorage.setItem('userMachines', JSON.stringify(machines));
      await AsyncStorage.setItem('maintenanceRecords', JSON.stringify(records));
    } catch (error) {
      console.error('Error saving machine data:', error);
    }
  };

  const addUserMachine = async (machine) => {
    try {
      const newMachine = {
        ...machine,
        id: Date.now().toString(),
        addedDate: new Date().toISOString(),
        status: 'active'
      };

      const updatedMachines = [...userMachines, newMachine];
      setUserMachines(updatedMachines);
      await saveMachineData(updatedMachines, maintenanceRecords);
      return true;
    } catch (error) {
      console.error('Error adding machine:', error);
      return false;
    }
  };

  const updateUserMachine = async (id, updates) => {
    try {
      const updatedMachines = userMachines.map(machine =>
        machine.id === id ? { ...machine, ...updates } : machine
      );
      setUserMachines(updatedMachines);
      await saveMachineData(updatedMachines, maintenanceRecords);
      return true;
    } catch (error) {
      console.error('Error updating machine:', error);
      return false;
    }
  };

  const deleteUserMachine = async (id) => {
    try {
      const updatedMachines = userMachines.filter(machine => machine.id !== id);
      const updatedRecords = maintenanceRecords.filter(record => record.machineId !== id);
      
      setUserMachines(updatedMachines);
      setMaintenanceRecords(updatedRecords);
      await saveMachineData(updatedMachines, updatedRecords);
      return true;
    } catch (error) {
      console.error('Error deleting machine:', error);
      return false;
    }
  };

  const addMaintenanceRecord = async (record) => {
    try {
      const newRecord = {
        ...record,
        id: Date.now().toString()
      };

      const updatedRecords = [...maintenanceRecords, newRecord];
      setMaintenanceRecords(updatedRecords);
      await saveMachineData(userMachines, updatedRecords);
      return true;
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      return false;
    }
  };

  const getUpcomingMaintenance = () => {
    const now = new Date();
    return userMachines.filter(machine => {
      if (!machine.lastMaintenanceDate) return true;
      
      const lastMaintenance = new Date(machine.lastMaintenanceDate);
      const daysSinceLastMaintenance = Math.floor((now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if any schedule is due
      return machine.maintenanceSchedule.some(schedule => {
        switch (schedule) {
          case 'daily':
            return daysSinceLastMaintenance >= 1;
          case 'weekly':
            return daysSinceLastMaintenance >= 7;
          case 'monthly':
            return daysSinceLastMaintenance >= 30;
          default:
            return false;
        }
      });
    });
  };

  const getMaintenanceReminders = () => {
    const now = new Date();
    return userMachines.filter(machine => {
      if (!machine.lastMaintenanceDate) return true;
      
      const lastMaintenance = new Date(machine.lastMaintenanceDate);
      const daysSinceLastMaintenance = Math.floor((now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if any schedule is due for reminders
      return machine.maintenanceSchedule.some(schedule => {
        switch (schedule) {
          case 'daily':
            return daysSinceLastMaintenance >= 1;
          case 'weekly':
            return daysSinceLastMaintenance >= 6; // Remind 1 day before
          case 'monthly':
            return daysSinceLastMaintenance >= 25; // Remind 5 days before
          default:
            return false;
        }
      });
    });
  };

  const markMaintenanceComplete = async (machineId, notes) => {
    try {
      const machine = userMachines.find(m => m.id === machineId);
      if (!machine) return false;

      const now = new Date();
      let nextMaintenanceDate;

      // Determine the next maintenance date based on the first schedule
      if (machine.maintenanceSchedule && machine.maintenanceSchedule.length > 0) {
        const firstSchedule = machine.maintenanceSchedule[0];
        switch (firstSchedule) {
          case 'daily':
            nextMaintenanceDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
            nextMaintenanceDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            nextMaintenanceDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
          case 'quarterly':
            nextMaintenanceDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
            break;
          case 'semi-annually':
            nextMaintenanceDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
            break;
          case 'annually':
            nextMaintenanceDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            nextMaintenanceDate = now;
        }
      } else {
        // Fallback if no schedules, just set to now
        nextMaintenanceDate = now;
      }

      // Add maintenance record with detailed timestamp
      const maintenanceRecord = {
        machineId,
        userId: machine.userId,
        maintenanceDate: now.toISOString(),
        maintenanceTypes: machine.maintenanceTypes || [],
        notes: notes || 'Maintenance completed',
        nextMaintenanceDate: nextMaintenanceDate.toISOString(),
        completedAt: now.toISOString(), // Exact completion timestamp
        status: 'completed'
      };

      await addMaintenanceRecord(maintenanceRecord);

      // Update machine's last maintenance date and add notes
      const currentNotes = machine.maintenanceNotes || [];
      const newNote = {
        text: notes || 'Maintenance completed',
        date: now.toISOString(),
        timestamp: now.toISOString(), // Exact timestamp
        nextMaintenanceDate: nextMaintenanceDate.toISOString()
      };
      
      const updatedMachine = {
        ...machine,
        lastMaintenanceDate: now.toISOString(),
        maintenanceNotes: [...currentNotes, newNote],
        nextMaintenanceDate: nextMaintenanceDate.toISOString() // Store next maintenance date
      };

      await updateUserMachine(machineId, updatedMachine);

      // Refresh the user machines to update the UI immediately
      await refreshUserMachines();

      return true;
    } catch (error) {
      console.error('Error marking maintenance complete:', error);
      return false;
    }
  };

  const refreshUserMachines = async () => {
    try {
      setIsLoading(true);
      const storedMachines = await AsyncStorage.getItem('userMachines');
      if (storedMachines) {
        setUserMachines(JSON.parse(storedMachines));
      }
    } catch (error) {
      console.error('Error refreshing user machines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    userMachines,
    machines: userMachines, // Alias for backward compatibility
    maintenanceRecords,
    maintenanceTasks: maintenanceRecords, // Alias for backward compatibility
    isLoading,
    addUserMachine,
    addMachine: addUserMachine, // Alias for backward compatibility
    updateUserMachine,
    updateMachine: updateUserMachine, // Alias for backward compatibility
    deleteUserMachine,
    deleteMachine: deleteUserMachine, // Alias for backward compatibility
    addMaintenanceRecord,
    addMaintenanceTask: addMaintenanceRecord, // Alias for backward compatibility
    updateMaintenanceTask: async (taskId, updates) => {
      // Implementation for updating maintenance tasks
      try {
        const updatedRecords = maintenanceRecords.map(record =>
          record.id === taskId ? { ...record, ...updates } : record
        );
        setMaintenanceRecords(updatedRecords);
        await saveMachineData(userMachines, updatedRecords);
        return true;
      } catch (error) {
        console.error('Error updating maintenance task:', error);
        return false;
      }
    },
    deleteMaintenanceTask: async (taskId) => {
      // Implementation for deleting maintenance tasks
      try {
        const updatedRecords = maintenanceRecords.filter(record => record.id !== taskId);
        setMaintenanceRecords(updatedRecords);
        await saveMachineData(userMachines, updatedRecords);
        return true;
      } catch (error) {
        console.error('Error deleting maintenance task:', error);
        return false;
      }
    },
    getUpcomingMaintenance,
    getMaintenanceReminders,
    markMaintenanceComplete,
    refreshUserMachines
  };

  return (
    <MachineContext.Provider value={value}>
      {children}
    </MachineContext.Provider>
  );
};
