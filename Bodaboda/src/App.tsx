import { useState, useEffect } from 'react';
import { useBodaStore } from './hooks/use-boda-store';
import { Onboarding } from './components/Onboarding';
import { HomeScreen } from './components/HomeScreen';
import { RouteOptions } from './components/RouteOptions';
import { TripAnalysis } from './components/TripAnalysis';
import { UserSettings, RouteOption, Trip } from './types/boda';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { X, Save } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from './components/ui/drawer';

type Screen = 'home' | 'routes' | 'analysis';

function App() {
  const { settings, updateSettings, trips, addTrip } = useBodaStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [destination, setDestination] = useState('');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings form state
  const [editSettings, setEditSettings] = useState<UserSettings>(settings);

  useEffect(() => {
    setEditSettings(settings);
  }, [settings]);

  // Fetch real dashboard metrics from backend on mount or when syncing
  useEffect(() => {
    fetch('http://localhost:5000/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.fuel_price_ksh) {
          updateSettings({ ...settings, fuelPrice: data.fuel_price_ksh });
        }
      })
      .catch((err) => console.error('Backend connection error:', err));
  }, []);

  if (!settings.onboarded) {
    return (
      <>
        <Onboarding onComplete={updateSettings} />
        <Toaster position="top-center" />
      </>
    );
  }

  const handleCalculate = async (dest: string) => {
    setDestination(dest);
    
    try {
      const response = await fetch('http://localhost:5000/api/trips/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup: 'Current Location', dropoff: dest }),
      });

      if (response.ok) {
        const backendData = await response.json();
        const dynamicRoute: RouteOption = {
          id: 'backend-route-1',
          name: `Optimal Route to ${dest}`,
          distanceKm: backendData.distance_km,
          estimatedMinutes: Math.round(backendData.distance_km * 3),
          fare: backendData.estimated_fare_ksh,
          fuelCost: backendData.fuel_cost_ksh,
          profit: backendData.estimated_profit_ksh,
        };
        setRoutes([dynamicRoute]);
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      console.warn('Backend offline, using fallback local calculation:', error);
      // Fallback local calculation so screen never goes blank
      const fallbackDistance = 15; // default km for regional trips like Gilgil
      const fallbackFare = 600;
      const fuelUsed = fallbackDistance / settings.efficiency;
      const fuelCost = Math.round(fuelUsed * settings.fuelPrice);
      const profit = fallbackFare - fuelCost;

      const fallbackRoute: RouteOption = {
        id: 'fallback-route-1',
        name: `Route to ${dest}`,
        distanceKm: fallbackDistance,
        estimatedMinutes: 30,
        fare: fallbackFare,
        fuelCost: fuelCost,
        profit: profit,
      };
      setRoutes([fallbackRoute]);
      toast.info('Using offline mode route calculation.');
    }

    setCurrentScreen('routes');
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    setCurrentScreen('analysis');
  };

  const handleTripFinish = async (trip: Trip) => {
    try {
      await fetch('http://localhost:5000/api/trips/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distance_km: trip.distanceKm,
          fare: trip.fare,
          profit: trip.profit,
        }),
      });
      toast.success('Trip successfully logged to backend database!');
    } catch (error) {
      console.error('Failed to log trip to backend:', error);
    }

    addTrip(trip);
    setCurrentScreen('home');
    setSelectedRoute(null);
    setDestination('');
  };

  const saveSettings = () => {
    updateSettings(editSettings);
    setIsSettingsOpen(false);
    toast.success('Settings updated');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {currentScreen === 'home' && (
        <HomeScreen 
          settings={settings} 
          trips={trips} 
          onCalculate={handleCalculate}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {currentScreen === 'routes' && (
        <RouteOptions 
          destination={destination}
          routes={routes}
          onSelect={handleRouteSelect}
          onBack={() => setCurrentScreen('home')}
        />
      )}

      {currentScreen === 'analysis' && selectedRoute && (
        <TripAnalysis 
          route={selectedRoute}
          settings={settings}
          onFinish={handleTripFinish}
          onBack={() => setCurrentScreen('routes')}
        />
      )}

      <Drawer open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[40px] px-6 pb-12">
          <DrawerHeader className="px-0 py-8">
            <div className="flex justify-between items-center">
              <DrawerTitle className="text-2xl font-black">Settings</DrawerTitle>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
          </DrawerHeader>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-500 uppercase">Fuel Price (KSh/L)</Label>
              <Input 
                type="number" 
                value={editSettings.fuelPrice}
                onChange={e => setEditSettings(prev => ({ ...prev, fuelPrice: Number(e.target.value) }))}
                className="h-14 text-xl font-black rounded-2xl bg-slate-50 border-0"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-500 uppercase">Base Earnings (KSh)</Label>
              <Input 
                type="number" 
                value={editSettings.baseEarnings}
                onChange={e => setEditSettings(prev => ({ ...prev, baseEarnings: Number(e.target.value) }))}
                className="h-14 text-xl font-black rounded-2xl bg-slate-50 border-0"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-500 uppercase">Profit Margin (%)</Label>
              <Input 
                type="number" 
                value={editSettings.profitMargin}
                onChange={e => setEditSettings(prev => ({ ...prev, profitMargin: Number(e.target.value) }))}
                className="h-14 text-xl font-black rounded-2xl bg-slate-50 border-0"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-500 uppercase">Personalized Efficiency (km/L)</Label>
              <Input 
                type="number" 
                value={editSettings.efficiency}
                onChange={e => setEditSettings(prev => ({ ...prev, efficiency: Number(e.target.value) }))}
                className="h-14 text-xl font-black rounded-2xl bg-slate-50 border-0"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-10">
            <Button onClick={saveSettings} className="w-full h-16 text-xl font-black rounded-2xl bg-blue-600 hover:bg-blue-700 flex items-center gap-3">
              <Save size={22} />
              Save Settings
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;