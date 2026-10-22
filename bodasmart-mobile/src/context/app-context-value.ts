import { createContext } from 'react';

import { Rider } from '@/services/api';

export interface RegistrationDetails {
  name: string;
  id_number: string;
  bike_model: string;
  number_plate: string;
  phone_number: string;
  email: string;
  password: string;
}

interface AppContextValue {
  user: Rider | null;
  token: string | null;
  isReady: boolean;
  startupError: string | null;
  efficiency: number;
  setEfficiency: (value: number) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (details: RegistrationDetails) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);
