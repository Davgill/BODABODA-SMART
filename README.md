# React + Vite + shadcn/ui Starter Template

A modern React starter template built with Vite, TypeScript, Tailwind CSS, and shadcn/ui components.

## 🚀 Features

- ⚡️ **Vite** - Fast build tool and development server
- ⚛️ **React 18** - Latest React with hooks support
- 🎯 **TypeScript** - Type safety and better developer experience
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🧩 **shadcn/ui** - Beautifully designed components built with Radix UI
- 📦 **Path Mapping** - Clean imports with `@/` prefix

## 📦 Included shadcn/ui Components

- Button
- Card
- Input
- Label
- Badge
- Dialog
- And more...

## 🛠️ Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start development server**

   ```bash
   npm run dev
   ```

3. **Start the API server** in a second terminal (required for registration and other database-backed features)

   ```bash
   npm run server
   ```

4. **Build for production**

   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

## Rider portal: GPS, places, routes, and trips

The rider portal is the root `index.html`, served by the Express API in
`server.js`. For local development, run both commands in separate terminals:

The rider, login, and admin pages share the BodaSmart brand artwork and
dark-green/lime-green theme from the supplied logo reference.

```bash
npm run server
npm run dev
```

Open `http://localhost:3000`. The Vite dev and preview servers proxy `/api`
requests to `http://localhost:5000`. Alternatively, the Express server serves
the portal directly at `http://localhost:5000`.

## Deploy the full app

The Vercel deployment serves the web pages and forwards `/api/*` requests to
the Express API on Render. Render runs the API with a persistent disk for
SQLite; the persistent disk requires a paid Render web-service plan.

1. Push the project to a GitHub repository. `.env` files and the local SQLite
   database are ignored; do not commit secrets or a local production database.
2. In Render, create a Blueprint from the repository and apply `render.yaml`.
   Set a strong `ADMIN_PASSCODE` when prompted. Wait for the service to deploy
   and verify its `/api/health` endpoint.
3. The Vercel rewrite expects the Render service URL
   `https://bodasmart-api.onrender.com`. If Render assigns a different URL,
   update the destination in `vercel.json` to that service's URL, then push
   the change.
4. Import the same repository into Vercel with the repository root as the
   project root. `vercel.json` configures the Vite build and publishes `dist`,
   including the rider, login, and admin pages.
5. Verify the deployed site, rider registration/login, a saved trip, and
   `/api/health` through the Vercel domain.

The production SQLite database starts empty on the persistent disk; the local
`bodasmart.db` is not uploaded. Configure `ADMIN_PASSCODE` only in Render's
environment settings. For the Expo app, set `EXPO_PUBLIC_API_URL` to the
Render API base URL ending in `/api`.

Browser GPS is available only on a secure origin: HTTPS in deployment or
`localhost` during development. Grant location permission when prompted.
If permission was denied, use the browser's site settings to allow Location,
then retry. A manual pickup can be entered as latitude/longitude or selected
on the map; it is always labeled as manual, not GPS.

The portal requests fresh, high-accuracy device positions and keeps refining
the fix for up to 45 seconds, targeting reported accuracy of ±25 m. It displays
the device-reported accuracy and does not claim that a GPS reading is an exact
physical point. Destination search shows up to 10 real Kenya results as
selectable map points. The selected pickup and drop-off coordinates are sent
to OSRM in longitude/latitude order; the resulting road-route distance is
shown in kilometres to 0.001 km. This is provider route precision, not a
guarantee of physical or motorcycle-specific road accuracy.

### Routing and place-search services

- Place lookup uses OpenStreetMap Nominatim through the server, then tries
  Photon as a fallback when Nominatim has no Kenya matches. Results are
  restricted to Kenya and ranked near the current pickup when available.
  Reverse geocoding uses Nominatim. Nominatim lookups are cached and limited
  to about one request per second. Both public services have rate limits and
  no uptime guarantee; deploy compatible providers or self-host for sustained
  production usage. A place absent from OpenStreetMap will not be fabricated
  as a search result; the rider can select its real map location manually.
- Road routing uses OSRM via the server (`OSRM_URL`). The default public OSRM
  demo endpoint is for evaluation, not a production service-level guarantee.
  Its driving routes are not motorcycle-specific. Configure a maintained or
  self-hosted routing service for production. No API key is needed for these
  default public endpoints.
- OpenStreetMap tiles are provided by the public tile service and include
  attribution in the map. Observe its tile usage policy; use an appropriate
  tile provider for high-volume production traffic.

Optional server environment variables:

| Variable | Purpose | Default |
|---|---|---|
| `ADMIN_PASSCODE` | Required to authenticate to the admin portal. Set a strong secret on the server; there is no built-in passcode. | Unset (admin login disabled) |
| `NOMINATIM_URL` | Nominatim base URL | `https://nominatim.openstreetmap.org` |
| `NOMINATIM_USER_AGENT` | Identifies this application to Nominatim; set a valid operator contact for production | `BodaSmartRiderPortal/1.0` |
| `PHOTON_URL` | Photon API URL used for Kenya-only place-search fallback | `https://photon.komoot.io/api/` |
| `OSRM_URL` | OSRM base URL | `https://router.project-osrm.org` |
| `PORT` | Express server port | `5000` |

For example, in PowerShell, configure a passcode for the current terminal before
starting the API:

```powershell
$env:ADMIN_PASSCODE = "replace-with-a-long-random-secret"
npm run server
```

Keep secrets in the deployment environment or a local, untracked `.env` file.
Production must serve the portal and API over HTTPS; set `NODE_ENV=production`
so session cookies are marked `Secure`. The server automatically creates the
`auth_sessions` and `admin_sessions` SQLite tables on startup; no manual
migration is required.

The existing fare rule is retained: `KSh 50 + route km × (configured fuel
price × 0.2)`. Fuel price and average fare remain separate dashboard values;
the configured fuel index is not itself the per-kilometre fare. Estimated fares
are based on the OSRM road distance, while completed-trip fares are recalculated
by the server from the recorded distance and current fuel configuration.

## BodaSmart Rider mobile app

The Expo app in `bodasmart-mobile` provides rider accounts, GPS/place-based
route estimates, trip recording, trip history, and bike-efficiency settings.
Start the API with `npm run server` from the repository root, then follow
[the mobile setup guide](./bodasmart-mobile/README.md) to launch the app and
configure the API URL for an emulator or physical phone.

## 📁 Project Structure

```
src/
├── components/
│   └── ui/              # shadcn/ui components
├── lib/
│   └── utils.ts         # Utility functions
├── App.tsx              # Main application component
├── index.css            # Global styles with Tailwind
└── main.tsx             # Application entry point
```

## 🎨 Customization

### Adding New shadcn/ui Components

This template is pre-configured with shadcn/ui. You can add more components by creating them in the `src/components/ui/` directory.

### Tailwind Configuration

The Tailwind configuration is set up with shadcn/ui color variables. You can customize colors and other design tokens in:

- `tailwind.config.js` - Tailwind configuration
- `src/index.css` - CSS custom properties for themes

### TypeScript Configuration

Path mapping is configured for clean imports:

```typescript
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

## 🌗 Dark Mode

The template includes dark mode support through Tailwind's `dark:` classes and CSS custom properties.

## 📚 Learn More

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

**⚡ Powered by [Dala](https://dala.gebeya.com)** - The AI-powered web development platform that helps you build full-stack applications faster.

---

## 🤖 What is Dala?

**[Gebeya Dala](https://dala.gebeya.com)** is an intelligent web development platform that accelerates your React development workflow. Build, preview, and deploy web applications, and instant development environments.

🔗 **Try Dala:** [dala.gebeya.com](https://dala.gebeya.com)

### Why Use Dala?

- **AI-Powered Development** - Get intelligent code suggestions and automated component generation
- **Instant Preview** - See your changes live in real-time sandbox environments
- **Zero Setup** - No local environment configuration needed
- **Collaborative** - Build and share projects with your team
- **Deployment Ready** - One-click deployment to production

---

Built with ❤️ by the Dala team to help developers build faster and smarter.
