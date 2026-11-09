import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from './types';

export const STORAGE_KEY = 'lotus_data_v1';
export const emptyData: AppData = {
  onboarded: false, name: '', initialBalance: 0, currency: 'AOA', theme: 'light',
  transactions: [], goals: [], budgets: [], educationDone: [], educationResults: {},
};

export async function loadData(): Promise<AppData> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value ? { ...emptyData, ...JSON.parse(value) } : emptyData;
  } catch {
    return emptyData;
  }
}

export async function saveData(data: AppData) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function clearData() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
