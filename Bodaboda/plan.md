# Smart Boda - Implementation Plan

Smart Boda is a "daily earnings intelligence assistant" for boda boda riders in Kenya, helping them calculate fuel usage, trip costs, and profitability.

## Scope Summary
- **Core Functionality**: Fuel estimation, route comparison (profitability/efficiency), and fare suggestions.
- **Platform**: Web-based mobile-first application (simulating the requested mobile experience).
- **Data Persistence**: Local storage only (localStorage/IndexedDB).
- **Non-Goals**: Ride-hailing, payments, social features, server-side database.

## Assumptions & Open Questions
- **Maps API**: We will use a mock implementation or a lightweight integration for routing if real API keys are not provided. For this MVP, we will assume a mock service that simulates "Distance" and "Time" from origin to destination.
- **Location**: Browser Geolocation API will be used for auto-detecting current location.

## Affected Areas
- **Frontend (React)**: All screens (Home, Route Options, Trip Analysis, Settings/Onboarding).
- **Logic/Engine**: Fuel estimation and profit calculation engines.
- **Data**: Local storage management for user settings (bike type, fuel efficiency) and recent trips.

## Phase 1: Foundation & Data Layer
- Setup internal state management and local storage hooks.
- Define data models for: Bike types, Fuel Efficiency, Trip records.
- Implement the "Personalized Learning System" logic (Moving average formula).
- **Owner**: `frontend_engineer`

## Phase 2: Core Calculation Engines
- Build `FuelEstimationEngine`: Calculates fuel based on distance and bike efficiency.
- Build `FareSuggestionEngine`: Calculates suggested fare based on cost + base + margin.
- Build `ProfitEngine`: Calculates total profit and efficiency metrics (profit/km, profit/min).
- **Owner**: `frontend_engineer`

## Phase 3: Screen 1 & Onboarding (Home)
- Create the Home Screen with GPS auto-detection.
- Destination input field.
- User setup/onboarding for bike type (100-125cc, 150cc) and fuel price.
- **Owner**: `frontend_engineer`

## Phase 4: Screen 2 (Route Options)
- Simulate route fetching (Cheapest, Fastest, Most Profitable).
- Implement the "Route Intelligence System" (Profit Efficiency = Profit / Time).
- Display cards with distance, time, fuel cost, suggested fare, and profit.
- Color coding: Green (High), Yellow (Moderate), Red (Low).
- **Owner**: `frontend_engineer`

## Phase 5: Screen 3 (Trip Analysis)
- Detailed breakdown screen.
- Summarize fuel used, cost, profit margins, and profit per minute/km.
- Prominent summary: "You are expected to earn X profit".
- **Owner**: `frontend_engineer`

## Phase 6: Refinement & Mobile-First UX
- Ensure high readability (large text, high contrast for sunlight).
- Optimize for minimal typing.
- Final polish of CSS/Styling using Tailwind.
- **Owner**: `quick_fix_engineer` (for styling/copy tweaks) or `frontend_engineer`

## Sequencing Constraints
- Phase 1 & 2 are prerequisites for the UI screens.
- Screen 2 depends on the mock routing service.
