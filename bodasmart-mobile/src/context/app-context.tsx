import * as SecureStore from 'expo-secure-store';
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { AppContext, RegistrationDetails } from '@/context/app-context-value';
import { ApiError, api, Rider } from '@/services/api';

const SESSION_KEY = 'bodasmart-session';
const EFFICIENCY_KEY = 'bodasmart-bike-efficiency';

async function readValue(key: string) {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function writeValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeValue(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function AppProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<Rider | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [efficiency, setEfficiencyState] = useState(40);
  const [isReady, setIsReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const [savedToken, savedEfficiency] = await Promise.all([
          readValue(SESSION_KEY),
          readValue(EFFICIENCY_KEY),
        ]);

        if (!active) return;

        if (savedEfficiency) {
          const parsedEfficiency = Number(savedEfficiency);
          if (Number.isFinite(parsedEfficiency) && parsedEfficiency > 0) {
            setEfficiencyState(parsedEfficiency);
          }
        }

        if (savedToken) {
          setToken(savedToken);
          try {
            const session = await api.getSession(savedToken);
            if (active) setUser(session.user);
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
              await removeValue(SESSION_KEY);
              if (active) setToken(null);
            } else if (active) {
              setStartupError(
                error instanceof Error ? error.message : 'Could not restore your session.',
              );
            }
          }
        }
      } catch (error) {
        if (active) {
          setStartupError(
            error instanceof Error ? error.message : 'Could not load saved app settings.',
          );
        }
      } finally {
        if (active) setIsReady(true);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    await writeValue(SESSION_KEY, response.sessionToken);
    setToken(response.sessionToken);
    setUser(response.user);
    setStartupError(null);
  }, []);

  const signUp = useCallback(async (details: RegistrationDetails) => {
    await api.register(details);
    await signIn(details.email, details.password);
  }, [signIn]);

  const signOut = useCallback(async () => {
    const activeToken = token;
    if (activeToken) await api.logout(activeToken);
    await removeValue(SESSION_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const setEfficiency = useCallback(async (value: number) => {
    await writeValue(EFFICIENCY_KEY, String(value));
    setEfficiencyState(value);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isReady,
      startupError,
      efficiency,
      setEfficiency,
      signIn,
      signUp,
      signOut,
    }),
    [user, token, isReady, startupError, efficiency, setEfficiency, signIn, signUp, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
