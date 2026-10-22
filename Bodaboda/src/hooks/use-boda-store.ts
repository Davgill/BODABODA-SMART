import { useState, useEffect } from 'react';
import { UserSettings, Trip } from '../types/boda';
import { DEFAULT_SETTINGS } from '../lib/constants';

export const useBodaStore = () => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('boda_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('boda_trips');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('boda_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('boda_trips', JSON.stringify(trips));
  }, [trips]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const addTrip = (trip: Trip) => {
    setTrips(prev => [trip, ...prev].slice(0, 50)); // Keep last 50
  };

  return {
    settings,
    updateSettings,
    trips,
    addTrip
  };
};