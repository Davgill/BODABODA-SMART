import { RouteOption, UserSettings } from '../types/boda';

export const calculateFuelUsed = (distance: number, efficiency: number) => {
  return distance / efficiency;
};

export const calculateFuelCost = (fuelUsed: number, fuelPrice: number) => {
  return fuelUsed * fuelPrice;
};

export const calculateSuggestedFare = (fuelCost: number, baseEarnings: number, margin: number) => {
  const marginMultiplier = 1 + margin / 100;
  return Math.ceil((fuelCost + baseEarnings) * marginMultiplier);
};

export const calculateProfit = (fare: number, fuelCost: number) => {
  return fare - fuelCost;
};

export const updateEfficiency = (oldEfficiency: number, measuredEfficiency: number) => {
  return 0.7 * oldEfficiency + 0.3 * measuredEfficiency;
};

export const getProfitColor = (profit: number, threshold_high: number = 200, threshold_mid: number = 100) => {
  if (profit >= threshold_high) return 'text-green-600';
  if (profit >= threshold_mid) return 'text-yellow-500';
  return 'text-red-600';
};

export const getProfitBg = (profit: number, threshold_high: number = 200, threshold_mid: number = 100) => {
  if (profit >= threshold_high) return 'bg-green-100 border-green-200';
  if (profit >= threshold_mid) return 'bg-yellow-100 border-yellow-200';
  return 'bg-red-100 border-red-200';
};

// Mock routing service
export const getMockRoutes = (destination: string, settings: UserSettings): RouteOption[] => {
  // Simple deterministic randomization based on destination string length
  const seed = destination.length;
  
  const routes: RouteOption[] = [
    {
      id: '1',
      name: 'Main Road',
      distance: 5 + (seed % 10),
      duration: 15 + (seed % 15),
      traffic: 'Moderate',
      type: 'fastest',
      fuelCost: 0, suggestedFare: 0, profit: 0, efficiency: 0
    },
    {
      id: '2',
      name: 'Backstreet Shortcut',
      distance: 4 + (seed % 8),
      duration: 20 + (seed % 10),
      traffic: 'Low',
      type: 'cheapest',
      fuelCost: 0, suggestedFare: 0, profit: 0, efficiency: 0
    },
    {
      id: '3',
      name: 'Highway Loop',
      distance: 8 + (seed % 12),
      duration: 12 + (seed % 10),
      traffic: 'Heavy',
      type: 'most_profitable',
      fuelCost: 0, suggestedFare: 0, profit: 0, efficiency: 0
    }
  ];

  return routes.map(r => {
    const fuelUsed = calculateFuelUsed(r.distance, settings.efficiency);
    const fuelCost = calculateFuelCost(fuelUsed, settings.fuelPrice);
    const suggestedFare = calculateSuggestedFare(fuelCost, settings.baseEarnings, settings.profitMargin);
    const profit = calculateProfit(suggestedFare, fuelCost);
    const efficiency = profit / (r.duration || 1);

    return {
      ...r,
      fuelCost,
      suggestedFare,
      profit,
      efficiency
    };
  }).sort((a, b) => b.profit - a.profit);
};