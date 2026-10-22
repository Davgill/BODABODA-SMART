export type BikeType = '100-125cc' | '150cc' | 'Custom';

export interface RouteOption {
  id: string;
  name: string;
  distance: number; // km
  duration: number; // minutes
  traffic: 'Low' | 'Moderate' | 'Heavy';
  fuelCost: number;
  suggestedFare: number;
  profit: number;
  efficiency: number; // profit per minute
  type: 'fastest' | 'cheapest' | 'most_profitable';
}

export interface UserSettings {
  bikeType: BikeType;
  efficiency: number; // km/L
  fuelPrice: number; // KSh/L
  baseEarnings: number; // KSh
  profitMargin: number; // %
  onboarded: boolean;
}

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  distance: number;
  duration: number;
  fuelUsed: number;
  fuelCost: number;
  fare: number;
  profit: number;
  timestamp: number;
}