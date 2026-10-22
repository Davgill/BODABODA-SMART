import React, { useState, useEffect } from 'react';
import { MobileContainer } from './MobileContainer';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { MapPin, Navigation, History, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserSettings, Trip } from '../types/boda';
import { toast } from 'sonner';

interface Props {
  settings: UserSettings;
  trips: Trip[];
  onCalculate: (destination: string) => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<Props> = ({ settings, trips, onCalculate, onOpenSettings }) => {
  const [destination, setDestination] = useState('');
  const [location, setLocation] = useState('Detecting current location...');

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocation(`Current: Nairobi, CBD`); // Simplified for display
        },
        () => {
          setLocation('Location access denied');
          toast.error('Could not detect location');
        }
      );
    }
  }, []);

  const handleCalculate = () => {
    if (!destination.trim()) {
      toast.warning('Please enter a destination');
      return;
    }
    onCalculate(destination);
  };

  return (
    <MobileContainer 
      title="BodaSmart" 
      actions={
        <button onClick={onOpenSettings} className="p-2 hover:bg-slate-100 rounded-full">
          <Settings size={24} className="text-slate-600" />
        </button>
      }
    >
      <div className="px-5 py-6 space-y-8">
        {/* Location Selector */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                <div className="w-0.5 h-8 bg-slate-200" />
                <MapPin className="text-red-600" size={20} />
              </div>
              <div className="flex-1 space-y-4">
                <div className="pb-4 border-b border-slate-50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pick up</p>
                  <p className="text-lg font-semibold text-slate-700">{location}</p>
                </div>
                <div className="pt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Drop off</p>
                  <Input 
                    placeholder="Where are you going?" 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="h-14 text-lg border-0 bg-slate-50 rounded-xl px-4 focus-visible:ring-blue-600 focus-visible:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleCalculate}
              className="w-full h-16 text-xl font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 flex items-center gap-3 cursor-pointer"
            >
              <Navigation size={22} />
              Calculate Trip
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Fuel Price</p>
            <p className="text-xl font-black text-slate-900">KSh {settings.fuelPrice}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Avg Profit</p>
            <p className="text-xl font-black text-green-600">
              KSh {trips.length > 0 ? Math.round(trips.reduce((a, b) => a + b.profit, 0) / trips.length) : 0}
            </p>
          </div>
        </div>

        {/* Recent Trips */}
        {trips.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History size={20} className="text-slate-400" />
                Recent Trips
              </h2>
            </div>
            <div className="space-y-3">
              {trips.slice(0, 3).map((trip) => (
                <div key={trip.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{trip.destination}</p>
                    <p className="text-sm text-slate-500">{trip.distance} km • {trip.duration} min</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-green-600">+ KSh {trip.profit}</p>
                    <p className="text-xs text-slate-400">Profit</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl text-white">
            <Settings size={24} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-blue-900">Personalized Efficiency</p>
            <p className="text-sm text-blue-700 leading-relaxed">
              Using <strong>{settings.efficiency} km/L</strong> for {settings.bikeType}. Log trips to improve accuracy.
            </p>
          </div>
        </div>
      </div>
    </MobileContainer>
  );
};