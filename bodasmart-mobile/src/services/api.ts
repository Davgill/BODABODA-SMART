export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://bodasmart-api.onrender.com/api'
).replace(/\/+$/, '');

export interface Rider {
  id: number;
  name: string;
  email: string;
  number_plate: string;
  bike_model?: string;
  phone_number?: string;
}

export interface Dashboard {
  fuel_price_ksh: number;
  avg_fare_ksh: number;
}

export interface Place {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: string;
}

export interface CalculatedRoute {
  distance_km: number;
  duration_minutes: number;
  estimated_fare_ksh: number;
  current_fuel_index_used: number;
}

export interface TripRecord {
  id: number;
  distance_km: number;
  fare: number;
  profit: number;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Can't reach BodaSmart at ${API_BASE_URL}. Check the server address and that the API is running.`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('The BodaSmart server returned an invalid response.');
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const api = {
  login(email: string, password: string) {
    return request<{ user: Rider; sessionToken: string }>('/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(details: {
    name: string;
    id_number: string;
    bike_model: string;
    number_plate: string;
    phone_number: string;
    email: string;
    password: string;
  }) {
    return request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(details),
    });
  },

  getSession(token: string) {
    return request<{ user: Rider }>('/auth/session', {}, token);
  },

  logout(token: string) {
    return request<{ message: string }>(
      '/auth/logout',
      { method: 'POST' },
      token,
    );
  },

  getDashboard() {
    return request<Dashboard>('/dashboard');
  },

  searchPlaces(query: string, near?: { latitude: number; longitude: number }) {
    const params = new URLSearchParams({ q: query });
    if (near) {
      params.set('lat', String(near.latitude));
      params.set('lon', String(near.longitude));
    }
    return request<{ results: Place[] }>(`/places/search?${params}`);
  },

  reverseGeocode(latitude: number, longitude: number) {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
    });
    return request<{ address: string }>(`/places/reverse?${params}`);
  },

  calculateTrip(pickup: Place, dropoff: Place) {
    return request<CalculatedRoute>('/trips/calculate', {
      method: 'POST',
      body: JSON.stringify({
        pickup_lat: pickup.latitude,
        pickup_lon: pickup.longitude,
        dropoff_lat: dropoff.latitude,
        dropoff_lon: dropoff.longitude,
      }),
    });
  },

  getTrips(token: string) {
    return request<{ trips: TripRecord[] }>('/trips', {}, token);
  },

  logTrip(
    token: string,
    route: CalculatedRoute,
    pickup: Place,
    dropoff: Place,
  ) {
    return request<{ tripId: number; fare_ksh: number }>('/trips/log', {
      method: 'POST',
      body: JSON.stringify({
        distance_km: route.distance_km,
        pickup_lat: pickup.latitude,
        pickup_lon: pickup.longitude,
        dropoff_lat: dropoff.latitude,
        dropoff_lon: dropoff.longitude,
      }),
    }, token);
  },
};
