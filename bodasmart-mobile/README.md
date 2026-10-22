# BodaSmart Rider

BodaSmart Rider is the Expo mobile companion to the BodaSmart rider portal. It
supports rider sign-in and registration, GPS or searched pickup points, Kenya
place search, road-route fare estimates, trip recording, trip history, and a
saved bike-efficiency preference.

## Run locally

1. Start the BodaSmart API from the repository root:

   ```powershell
   npm run server
   ```

2. In another terminal, go to `bodasmart-mobile` and start Expo:

   ```powershell
   npm install
   npx expo start
   ```

The app uses the deployed API at `https://bodasmart-api.onrender.com/api` by
default. If Render assigns a different service URL, set
`EXPO_PUBLIC_API_URL` to that service's `/api` URL in
`bodasmart-mobile/.env` before starting Expo, or configure it in the
environment used to build the mobile app. Restart Expo or rebuild the app after
changing the value.

For local development, set `EXPO_PUBLIC_API_URL` in
`bodasmart-mobile/.env` to `http://localhost:5000/api` for Expo Web and the iOS
simulator, `http://10.0.2.2:5000/api` for an Android emulator, or the computer's
LAN address (for example, `http://192.168.1.20:5000/api`) for a physical phone.
The phone and computer must be on a network that allows the phone to reach port
5000.

The native iOS and Android apps request foreground location permission when the
rider taps **Use my current location**. Grant the permission and enable the
device's location services. On Expo Web or the web portal, location requires
HTTPS (the deployed Vercel URL is secure) and browser permission; if unavailable
or denied, search for or select a pickup point manually. No app can obtain a
device location when its user, operating system, browser, or hardware blocks
location access.

Route distance and time come from the configured OSRM driving service;
estimated fares use the server's current fuel index. Estimates are not
motorcycle-specific traffic predictions.

## Checks

```powershell
npx tsc --noEmit
npx expo lint
```
