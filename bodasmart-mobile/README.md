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

The app uses `http://localhost:5000/api` by default. That works for Expo Web and
the iOS simulator when the API runs on the same computer. For an Android
emulator, set `EXPO_PUBLIC_API_URL` in `bodasmart-mobile/.env` to
`http://10.0.2.2:5000/api`. For a physical phone, use the computer's LAN IP
instead, for example `http://192.168.1.20:5000/api`, and make sure the phone can
reach port 5000. Restart Expo after changing `.env`.

The location permission is used only to set a trip's pickup point. You can
instead search for and select a pickup manually. Route distance and time come
from the configured OSRM driving service; estimated fares use the server's
current fuel index. Estimates are not motorcycle-specific traffic predictions.

## Checks

```powershell
npx tsc --noEmit
npx expo lint
```
