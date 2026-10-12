# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.


# Aqua Systemtech – Agent Guide

Instructions for AI coding agents (and new developers) working on this repo.
Read this before changing code. Keep it up to date when you change anything it describes.

## What this app is

A React Native (Expo) mobile app for monitoring and managing industrial reverse-osmosis (RO) water-treatment plants. It reads live PLC tag values and shows pressure, tank level, flows, recovery, alarms, maintenance and reports. It mirrors the company's web dashboard.

- Brand: **Aqua Systemtech** – "Clean water, intelligently managed".
- Users: plant operators and technicians. Dark theme, dense, readable at a glance.

## Stack

- Expo (SDK 57) + React Native + TypeScript
- **expo-router** for navigation (file-based, `src/app`)
- `react-native-svg` for every chart and gauge (no chart library)
- `expo-secure-store` for small persisted data
- Fonts: Inter + JetBrains Mono (`@expo-google-fonts/*`)
- Icons: `@expo/vector-icons` (Feather, Ionicons, MaterialIcons, MaterialCommunityIcons)

Run:

```
npx expo install            # after pulling, to match SDK versions
npx expo start -c           # -c clears the Metro cache; use it after moving or renaming files
```

Extra packages the features rely on: `expo-linear-gradient expo-secure-store expo-status-bar expo-constants expo-print expo-sharing expo-clipboard expo-font expo-splash-screen react-native-gesture-handler react-native-safe-area-context`.

## Folder map

```
src/
  app/          ROUTES ONLY. One screen per file + _layout.tsx. Nothing else goes here.
  components/   Reusable UI (gauges, charts, cards, nav, splash)
  state/        Stores and hooks (live data, history, session, settings, maintenance)
  lib/          Pure logic (math, status rules, reports, auth, calibration)
  data/         Static definitions (sensor / tag lists)
  theme/        tokens.ts (colors, spacing, radii) and fonts.ts
```

**Hard rule:** every file in `src/app` is treated as a route by Expo Router. Helper files there cause "missing default export" errors. Put helpers in `components/`, `state/`, `lib/` or `data/`.

### Screens (`src/app`)

| File | Route | Reached from |
| --- | --- | --- |
| `index.tsx` | `/` | Login (first screen after the splash) |
| `DashboardScreen.tsx` | `/DashboardScreen` | Tab. Has three internal tabs: Overview, System & Alerts, Trends |
| `TanksScreen.tsx` | `/TanksScreen` | Tab |
| `ProductionScreen.tsx` | `/ProductionScreen` | Tab |
| `AntiscalantScreen.tsx` | `/AntiscalantScreen` | Tab |
| `MoreScreen.tsx` | `/MoreScreen` | Tab. Hub for everything below |
| `AlarmsScreen.tsx` | `/AlarmsScreen` | More → Alerts |
| `FiltrationScreen.tsx`, `RecoveryScreen.tsx` | | More → Operations |
| `MaintenanceScreen.tsx`, `AnalyticsScreen.tsx`, `ReportsScreen.tsx` | | More → Management |
| `SettingsScreen.tsx`, `TagManagerScreen.tsx` | | More → System / Configuration |

Billing and User screens were deliberately removed. Do not re-add them unless asked.

## App startup and navigation

1. `_layout.tsx` loads fonts, hydrates the saved session, and starts the history recorder.
2. `AppSplash` (components) covers the app for at least 1.8 s and until fonts and session are ready, then fades out.
3. A redirect effect (under the splash) sends signed-out users to `/` (login) and signed-in users on `/` to `/DashboardScreen`.
4. The tab bar is a **custom** component, `BottomNav.tsx`, passed as `tabBar`. It:
   - hides itself on the login route,
   - highlights the active tab from the URL,
   - keeps **More** highlighted for any page opened from More,
   - shows the unacknowledged-alert count as a badge on **More**.

Every route that is not a visible tab is registered in `_layout.tsx` with `options={{ href: null }}`.

## Data flow (important)

```
PLC / server  →  useLiveData (state/liveData)  →  useTags()  →  screens
                                   ↓
                      useHistoryRecorder  →  state/history  →  charts, analytics, reports
```

- `state/liveData` (existing, not in this repo's generated files) exposes `get(tag)`, `connected`, `sensorCount`, `isFresh`, `dailyProduction`, and optionally `history`, `lastUpdate`, `refresh`.
- **Always read values through `useTags()`** (`num(tag)`, `running(tag)`, `history`, `lastUpdate`). It handles `{ value }` objects, strings, booleans and missing data. Return `null` means "no data" – show `—`, never `0`.
- `useHistoryRecorder` (called once in `_layout.tsx`) saves one reading per tag every 5/10/30 s (Settings) for the last 24 h, in memory only. It is lost when the app closes. `useTags().history` prefers a server `live.history` if one ever exists.
- Longer ranges (7/30/90 days, weekly/monthly reports) need a **server history API**. Do not fake them.

### Tags

Tag names live in:

- `data/sensors.ts` – the sensors on the Trends chip bar (`SENSORS`, `SENSOR_BY_KEY`)
- `data/extraSensors.ts` – antiscalant tags and equipment status tags
- user-added tags in Tag Manager (`state/customTags.ts`)

Confirmed from the web code: `RO5-FEEDFlow`, `RO5-Permeateflow`, `RO5-ConcetrateFlow` (sic – the PLC spelling), `RO5-SystemRecovery`, `RO5-FeedTankLevelRaw`, `RO5-FeedTankLevel`.
**Guessed and needing confirmation:** most other tags, all pump tags (`RO5-HPPump`, `RO5-FeedPump`, `RO5-DosingPump`, `RO5-Prefilter`), and the antiscalant tags. Wrong tags show "No data" rather than crashing – keep it that way. Never use `SENSOR_BY_KEY.someKey.tag` without optional chaining unless you added the key.

### Feed tank level

The raw transmitter is the source of truth: `RO5-FeedTankLevelRaw` → `rawToPercent()` in `lib/feedTankCalibration.ts` (raw 4.9 = 0 %, 10.0 = 100 %). Dashboard and Tanks must use the same calculation. Do not average Tank A and Tank B; Tank B (Flush Tank) has no sensor and is an estimate.

## State and persistence

- `state/persistedStore.ts` – `createStore(key, initial)` helper for small persisted state.
- `state/session.ts` – signed in/out, "remember me" persistence.
- `state/settingsStore.ts` – recording interval.
- `state/customTags.ts` – up to 15 user tags.
- `state/maintenanceStore.ts` – service schedule and log (intervals are placeholders).
- `state/alarmStore` (existing) – `useAlarmSummary()`, `acknowledgeAlarm`, `isolateAlarm`.

`expo-secure-store` limits: values are small (~2 KB on Android) and it **does not exist on web** – every call is wrapped in try/catch and falls back to memory. Keep persisted payloads tiny.

## Auth

`lib/auth.ts` has three modes via `EXPO_PUBLIC_AUTH_MODE`:

- `bypass` (default) – any email/password signs in. **Demo only. Never ship.**
- `local` – hashed accounts in `LOCAL_USERS`. A stop-gap; anything bundled in an app can be extracted.
- `remote` – real server check in `realSignIn()` (**not implemented yet**).

The route guard is client-side only. Real protection needs the server to verify a token on every request.

## UI and design system

- Colors, spacing, radii: `theme/tokens.ts`. Fonts: `theme/fonts.ts` (`FONT.heading`, `body`, `medium`, `semibold`, `mono`, `monoSemibold`, `monoBold`). Never hardcode a font family string or reference a font that `_layout.tsx` doesn't load.
- Status colors: green normal, amber warning, red critical, blue info. Shared constants: `C` in `components/ui.tsx`.
- Building blocks: `Screen` (page shell with back button, title, and tab-bar-aware padding), `Card`, `Label`, `Stat`, `Pill`, `Bar`, `Row` in `components/ui.tsx`. Use these for new feature screens instead of restyling from scratch.
- Gauges/charts: `PressureGauge`, `TankLevelGauge`, `RingGauge`, `LiveTrendChart` (scrubbable, ranges, fullscreen), `FlowBalanceChart`, `DistributionHistogram`, `TankParts` (`MiniBarChart`, `MiniLineChart`, `StatusBadge`, `HealthBar`).
- Phone first. Dashboard instrument cards sit **side by side** on every width. Min touch target ~44 px; every `Pressable` needs `accessibilityRole` and a label when it has no text.

## Gotchas learned the hard way

1. **Expo SDK 56 and later (the project is on 57) are not compatible with `@react-navigation/*`.** Never import from `@react-navigation/...`. Use `expo-router`, and `BottomTabBarHeightContext` from `expo-router/js-tabs`.
2. **react-native-svg on web:** do not use the `rotation` + `origin` props. They emit an invalid `transform-origin` DOM attribute. Use `transform="rotate(angle cx cy)"` strings instead.
3. **Feather has no flask icon.** Antiscalant uses Ionicons `flask-outline`. Check an icon exists in its family before using it.
4. **Never navigate before the root layout has mounted.** The redirect effect checks `useRootNavigationState().key`.
5. Screens must **not** render `<BottomNav />` themselves; the layout does.
6. After moving or renaming files, restart with `npx expo start -c`.

## Safety rules

- The **emergency stop** on the dashboard is a demo: it only shows an alert and sends nothing. Do not present it as working. Wiring it to the PLC needs interlocks, confirmation and server-side authority – raise it with the maintainers first.
- No invented plant data in production code. Unknown value → `—` / "No data". Demo numbers must be clearly labelled.
- Do not log or persist passwords or tokens in plain text.

## Known placeholders and TODOs

- Production totals (today/week/month/year) come from `GET {EXPO_PUBLIC_API_URL}/api/production/totals` (`state/useProductionTotals.ts`). Endpoint shape is a guess; without it only "today" (live counter) is shown.
- Maintenance intervals (CIP 90 d, cartridges 30 d, transmitter 180 d, dosing pump 60 d) and the filter replace limit (1.0 bar) are placeholders.
- Recovery "Check" threshold (75 %) and the RO Health score (alarm-based) are guesses (`lib/status.ts`).
- Push notifications, server history, team/user management and billing are **not built** (need a backend).
- `DashboardScreen` pump tags and antiscalant tags need confirming against the PLC tag list.

## How to add a feature screen

1. Create `src/app/XyzScreen.tsx` with a default export, wrapped in `<Screen title="…">`.
2. Read data only via `useTags()`; handle `null` everywhere.
3. Register it in `src/app/_layout.tsx` as `<Tabs.Screen name="XyzScreen" options={{ href: null }} />`.
4. Add a row in `MoreScreen.tsx` (`GROUPS`) with `ready: true` once it works.
5. If it needs new tags, add them to `data/extraSensors.ts` so the recorder saves their history.
6. Test: signed out (redirects to login), no data (shows `—`), small phone width, web.
7. Update this file.

## Style

- TypeScript, function components, hooks. No class components.
- Keep files focused; share logic through `lib/` and `state/`, not copy-paste.
- Comments explain *why* and flag every TODO/assumption honestly.
- Don't add dependencies without a reason; prefer what is already installed.

## Dev errors and what they usually mean

- **"Cannot read properties of undefined (reading 'next')"** pointing at a `useState` or `useEffect` line: React's hook list got out of sync after Fast Refresh, because a file was edited so a component (or a hook it uses) now calls a different number of hooks. It is not a code bug. Fully reload (press `r` in the Expo terminal, or refresh the browser). If it persists, stop the server and run `npx expo start -c`.
  - If it still appears after a clean restart, check for two copies of React: `npm ls react` should show a single version.