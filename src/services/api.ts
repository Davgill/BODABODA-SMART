const API_BASE_URL = 'http://localhost:5000/api';

// 1. Get Dashboard Metrics
const fetchDashboardMetrics = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch dashboard metrics');
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return null;
  }
};

// 2. Calculate Trip
const calculateTrip = async (pickup: string, dropoff: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/trips/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pickup, dropoff }),
    });
    if (!response.ok) throw new Error('Failed to calculate trip');
    return await response.json();
  } catch (error) {
    console.error('Error calculating trip:', error);
    return null;
  }
};

// 3. Log a Completed Trip
const logTrip = async (distance_km: number, fare: number, profit: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/trips/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ distance_km, fare, profit }),
    });
    if (!response.ok) throw new Error('Failed to log trip');
    return await response.json();
  } catch (error) {
    console.error('Error logging trip:', error);
    return null;
  }
};

export { fetchDashboardMetrics, calculateTrip, logTrip };