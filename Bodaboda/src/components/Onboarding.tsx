import React, { useState } from 'react';
import { UserSettings, BikeType } from '../types/boda';
import { BIKE_EFFICIENCY } from '../lib/constants';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Bike, Fuel, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onComplete: (settings: UserSettings) => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [bikeType, setBikeType] = useState<BikeType>('100-125cc');
  const [fuelPrice, setFuelPrice] = useState(200);
  const [efficiency, setEfficiency] = useState(BIKE_EFFICIENCY['100-125cc']);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({
        bikeType,
        efficiency,
        fuelPrice,
        baseEarnings: 50,
        profitMargin: 30,
        onboarded: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <img 
            src="https://storage.googleapis.com/dala-prod-public-storage/generated-images/e9a29270-924b-45b6-a250-4a79c5f3efcb/hero-boda-rider-9597eac2-1779300650841.webp" 
            alt="Boda Rider" 
            className="w-full h-48 object-cover rounded-2xl mb-6 shadow-lg"
          />
          <h1 className="text-3xl font-black text-slate-900 mb-2">BodaSmart</h1>
          <p className="text-slate-500 text-lg">Your daily earnings intelligence assistant.</p>
        </motion.div>

        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Bike className="text-blue-600" size={24} />
              <Label className="text-xl font-bold">What is your bike type?</Label>
            </div>
            <RadioGroup 
              value={bikeType} 
              onValueChange={(val) => {
                setBikeType(val as BikeType);
                setEfficiency(BIKE_EFFICIENCY[val as keyof typeof BIKE_EFFICIENCY] || 40);
              }}
              className="grid grid-cols-1 gap-4"
            >
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${bikeType === '100-125cc' ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}>
                <RadioGroupItem value="100-125cc" id="125" className="sr-only" />
                <Label htmlFor="125" className="flex-1 text-lg font-bold cursor-pointer">100–125cc (40 km/L)</Label>
              </div>
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${bikeType === '150cc' ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}>
                <RadioGroupItem value="150cc" id="150" className="sr-only" />
                <Label htmlFor="150" className="flex-1 text-lg font-bold cursor-pointer">150cc (35 km/L)</Label>
              </div>
            </RadioGroup>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Fuel className="text-orange-600" size={24} />
              <Label className="text-xl font-bold">Current Fuel Price (KSh/L)</Label>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">KSh</span>
              <Input 
                type="number" 
                value={fuelPrice}
                onChange={(e) => setFuelPrice(Number(e.target.value))}
                className="pl-16 h-16 text-2xl font-black rounded-xl border-2 focus-visible:ring-blue-600"
              />
            </div>
            <p className="text-slate-500">You can update this anytime in settings.</p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Settings2 className="text-green-600" size={24} />
              <Label className="text-xl font-bold">Manual Efficiency (Optional)</Label>
            </div>
            <div className="relative">
              <Input 
                type="number" 
                value={efficiency}
                onChange={(e) => setEfficiency(Number(e.target.value))}
                className="h-16 text-2xl font-black rounded-xl border-2 pr-16 focus-visible:ring-blue-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">km/L</span>
            </div>
            <p className="text-slate-500">The app will learn your actual efficiency as you ride.</p>
          </motion.div>
        )}
      </div>

      <div className="py-6">
        <Button 
          onClick={handleNext} 
          className="w-full h-16 text-xl font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
        >
          {step === 3 ? 'Start Earning' : 'Next'}
        </Button>
        <div className="flex justify-center gap-2 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 rounded-full transition-all ${step === i ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};