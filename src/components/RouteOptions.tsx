import React from 'react';
import { MobileContainer } from './MobileContainer';
import { RouteOption } from '../types/boda';
import { getProfitBg, getProfitColor } from '../lib/engines';
import { Clock, Navigation, Fuel, Zap, TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from './ui/badge';

interface Props {
  destination: string;
  routes: RouteOption[];
  onSelect: (route: RouteOption) => void;
  onBack: () => void;
}

export const RouteOptions: React.FC<Props> = ({ destination, routes, onSelect, onBack }) => {
  return (
    <MobileContainer title="Route Options" onBack={onBack}>
      <div className="px-5 py-4 space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-500 uppercase">Destination</p>
          <h2 className="text-2xl font-black text-slate-900">{destination}</h2>
        </div>

        <div className="space-y-4">
          {routes.map((route, idx) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => onSelect(route)}
              className={`relative overflow-hidden cursor-pointer border-2 rounded-3xl p-5 transition-all active:scale-[0.98] ${getProfitBg(route.profit)}`}
            >
              {/* Type Badge */}
              <div className="flex justify-between items-start mb-4">
                <Badge className={`uppercase text-[10px] font-black px-3 py-1 rounded-full ${
                  route.type === 'most_profitable' ? 'bg-green-600' : 
                  route.type === 'fastest' ? 'bg-blue-600' : 'bg-slate-600'
                }`}>
                  {route.type.replace('_', ' ')}
                </Badge>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase">Expected Profit</p>
                  <p className={`text-2xl font-black ${getProfitColor(route.profit)}`}>
                    KSh {Math.round(route.profit)}
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-black mb-4">{route.name}</h3>

              <div className="grid grid-cols-2 gap-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/60 rounded-lg">
                    <Navigation size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Distance</p>
                    <p className="font-bold">{route.distance} km</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/60 rounded-lg">
                    <Clock size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Time</p>
                    <p className="font-bold">{route.duration} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/60 rounded-lg">
                    <Fuel size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Fuel Cost</p>
                    <p className="font-bold">KSh {Math.round(route.fuelCost)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/60 rounded-lg">
                    <DollarSign size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Fare Suggestion</p>
                    <p className="font-bold">KSh {Math.round(route.suggestedFare)}</p>
                  </div>
                </div>
              </div>

              {/* Progress Highlight */}
              <div className="mt-5 flex items-center justify-between bg-white/40 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  {route.type === 'most_profitable' ? <TrendingUp size={16} className="text-green-700" /> : <Zap size={16} className="text-blue-700" />}
                  <span className="text-sm font-bold text-slate-700">
                    {route.type === 'most_profitable' ? 'Highest Efficiency' : 'Standard Efficiency'}
                  </span>
                </div>
                <span className="text-xs font-black text-slate-600">
                  {Math.round(route.efficiency * 60)} KSh / hr
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-slate-400 text-sm px-4">
          Route intelligence calculated using real-time traffic and your personalized fuel efficiency.
        </p>
      </div>
    </MobileContainer>
  );
};