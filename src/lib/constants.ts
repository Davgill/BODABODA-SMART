import { UserSettings } from '../types/boda';

export const DEFAULT_SETTINGS: UserSettings = {
  bikeType: '100-125cc',
  efficiency: 40, // km/L
  fuelPrice: 200, // KSh/L
  baseEarnings: 50, // Fixed base per trip
  profitMargin: 30, // 30% margin
  onboarded: false,
};

export const BIKE_EFFICIENCY = {
  '100-125cc': 40,
  '150cc': 35,
};