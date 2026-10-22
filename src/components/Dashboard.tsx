import React, { useEffect, useState } from 'react';
import { fetchDashboardMetrics, calculateTrip } from '../services/api';

export default function DashboardComponent() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [tripResult, setTripResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch dashboard data when the component loads
  useEffect(() => {
    fetchDashboardMetrics().then((data) => {
      setDashboardData(data);
    });
  }, []);

  // Handle calculation button click
  const handleCalculate = async () => {
    setLoading(true);
    const result = await calculateTrip('CBD', 'Westlands'); // Example locations
    setTripResult(result);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Boda Profit Lens Dashboard</h2>
      
      {dashboardData ? (
        <div style={{ background: '#f4f4f4', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <p><strong>Fuel Price:</strong> KSh {dashboardData.fuel_price_ksh}</p>
          <p><strong>Average Profit:</strong> KSh {dashboardData.avg_profit_ksh}</p>
        </div>
      ) : (
        <p>Loading dashboard metrics...</p>
      )}

      <hr style={{ margin: '20px 0' }} />

      <button 
        onClick={handleCalculate} 
        disabled={loading}
        style={{ padding: '10px 20px', background: '#007bff', color: '#white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        {loading ? 'Calculating...' : 'Calculate Sample Trip'}
      </button>

      {tripResult && (
        <div style={{ marginTop: '20px', background: '#e9ecef', padding: '15px', borderRadius: '8px' }}>
          <h3>Trip Estimation Results:</h3>
          <p>Distance: {tripResult.distance_km} km</p>
          <p>Estimated Fare: KSh {tripResult.estimated_fare_ksh}</p>
          <p>Fuel Cost: KSh {tripResult.fuel_cost_ksh}</p>
          <p><strong>Estimated Profit:</strong> KSh {tripResult.estimated_profit_ksh}</p>
        </div>
      )}
    </div>
  );
}