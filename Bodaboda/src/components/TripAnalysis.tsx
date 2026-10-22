import React, { useState } from 'react';
import { MobileContainer } from './MobileContainer';
import { RouteOption, UserSettings, Trip } from '../types/boda';
import { getProfitBg, getProfitColor } from '../lib/engines';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Clock, Navigation, Fuel, TrendingUp, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Props {
  route: RouteOption;
  settings: UserSettings;
  onFinish: (trip: Trip) => void;
  onBack: () => void;
}

export const TripAnalysis: React.FC<Props> = ({ route, settings, onFinish, onBack }) => {
  const [actualFare, setActualFare] = useState(route.suggestedFare);
  const [showLearning, setShowLearning] = useState(false);
  const [measuredFuel, setMeasuredFuel] = useState<string>('');

  const handleFinish = async () => {
    const calculatedProfit = actualFare - route.fuelCost;
    
    const trip: Trip = {
      id: Date.now().toString(),
      origin: 'Current Location',
      destination: route.name,
      distance: route.distance,
      duration: route.duration,
      fuelUsed: route.fuelCost / settings.fuelPrice,
      fuelCost: route.fuelCost,
      fare: actualFare,
      profit: calculatedProfit,
      timestamp: Date.now(),
    };

    try {
      // Sync metrics directly to the live SQLite system backend database
      const response = await fetch('http://localhost:5000/api/trips/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          distance_km: route.distance,
          fare: actualFare,
          profit: calculatedProfit
        }),
      });

      if (!response.ok) {
        throw new Error('Server responded with an execution error');
      }

      toast.success('Trip logged to server database!');
      onFinish(trip);
    } catch (error) {
      console.error('Database sync connection failed:', error);
      toast.error('Saved locally. Backend connection offline.');
      
      // Graceful local-only fallback so the UI workflow never locks out the driver
      onFinish(trip);
    }
  };

  return (
    <MobileContainer title="Trip Analysis" onBack={onBack}>
      <div className="px-5 py-6 space-y-6">
        {/* Main Profit Card */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`p-8 rounded-[40px] text-center space-y-2 border-4 ${getProfitBg(actualFare - route.fuelCost)} shadow-xl`}
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Expected Profit</p>
          <h2 className={`text-6xl font-black ${getProfitColor(actualFare - route.fuelCost)}`}>
            KSh {Math.round(actualFare - route.fuelCost)}
          </h2>
          <div className="flex justify-center gap-4 mt-4">
            <span className="text-sm font-bold text-slate-600 bg-white/50 px-3 py-1 rounded-full border border-white/20">
              {Math.round((actualFare - route.fuelCost) / route.distance)} KSh / km
            </span>
            <span className="text-sm font-bold text-slate-600 bg-white/50 px-3 py-1 rounded-full border border-white/20">
              {Math.round((actualFare - route.fuelCost) / route.duration)} KSh / min
            </span>
          </div>
        </motion.div>

        {/* Breakdown Sections */}
        <div className="space-y-4">
          {/* Trip Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black flex items-center gap-2 text-slate-800">
              <Info size={18} className="text-blue-500" />
              Trip Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Navigation size={14} />
                  <span className="text-[10px] font-bold uppercase">Distance</span>
                </div>
                <p className="text-lg font-bold">{route.distance} km</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase">Duration</span>
                </div>
                <p className="text-lg font-bold">{route.duration} min</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">Traffic Condition</span>
              <Badge className={
                route.traffic === 'Low' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                route.traffic === 'Moderate' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' :
                'bg-red-100 text-red-700 hover:bg-red-100'
              }>
                {route.traffic} Traffic
              </Badge>
            </div>
          </div>

          {/* Pricing Analysis */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-black flex items-center gap-2 text-slate-800">
              <TrendingUp size={18} className="text-green-500" />
              Pricing Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-700">Fuel Cost</p>
                  <p className="text-xs text-slate-400">Estimated usage</p>
                </div>
                <p className="text-xl font-black text-slate-900">KSh {Math.round(route.fuelCost)}</p>
              </div>
              
              <div className="h-px bg-slate-100" />

              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-700">Set Final Fare</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">KSh</span>
                  <Input 
                    type="number" 
                    value={actualFare}
                    onChange={(e) => setActualFare(Number(e.target.value))}
                    className="pl-14 h-14 text-xl font-black bg-slate-50 border-0 rounded-2xl focus-visible:ring-blue-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Recommended: KSh {Math.round(route.suggestedFare)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Personalized Learning Opt-in */}
        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-lg text-white">
              <Fuel size={20} />
            </div>
            <p className="font-bold text-orange-900">Personalized Learning</p>
          </div>
          <p className="text-sm text-orange-800/80 leading-relaxed">
            Want to improve accuracy? Enter your actual fuel used for this trip.
          </p>
          {!showLearning ? (
            <Button 
              variant="outline" 
              className="w-full border-orange-200 text-orange-800 hover:bg-orange-100"
              onClick={() => setShowLearning(true)}
            >
              Enter Actual Fuel
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
              <div className="relative">
                <Input 
                  placeholder="Liters used" 
                  value={measuredFuel}
                  onChange={(e) => setMeasuredFuel(e.target.value)}
                  className="bg-white border-orange-200 pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Liters</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Button */}
        <div className="pb-8">
          <Button 
            onClick={handleFinish}
            className="w-full h-16 text-xl font-black rounded-2xl bg-slate-900 hover:bg-slate-800 shadow-xl flex items-center gap-3"
          >
            <CheckCircle2 size={24} />
            Complete Trip
          </Button>
        </div>
      </div>
    </MobileContainer>
  );
};