# DripDrop

Tap. Collect. Flow. Unlock the Water Cycle.

DripDrop is a cross-platform Expo app (iOS, Android, Web) implementing a tap-to-mine game loop with secure server-side balance updates, Supabase auth/data sync, WalletConnect login, roadmap progression, and launch-rain unlock mechanics.

## Tech Stack

- Expo SDK 54 + expo-router
- React Native Reanimated + Lottie
- Zustand + AsyncStorage persistence + Supabase sync
- Supabase (Auth, Postgres, Realtime, Edge Functions, RLS)
- WalletConnect Modal + ethers v5
- Expo SecureStore for auth session data
- EAS for builds
- Vercel for web deployment

## Project Structure

```
dripdrop/
├── app/
│   ├── index.tsx
│   ├── upgrade-panel.tsx
│   ├── wallet.tsx
│   ├── roadmap.tsx
│   └── _layout.tsx
├── components/
│   ├── AppErrorBoundary.tsx
│   ├── Droplet.tsx
│   ├── PhaseIndicator.tsx
│   ├── CloudMeter.tsx
│   └── UpgradeCard.tsx
├── hooks/
│   ├── useTapHandler.ts
│   ├── useBoostMode.ts
│   └── usePhase.ts
├── stores/
│   └── useDripStore.ts
├── services/
│   ├── supabase.ts
│   ├── soundService.ts
│   └── walletConnect.ts
├── assets/
│   ├── sounds/
│   ├── animations/
│   └── images/
├── utils/
│   ├── phaseCalculator.ts
│   └── antiCheat.ts
├── supabase/
│   ├── migrations/20260505_initial_dripdrop_schema.sql
│   └── functions/handleTap
├── __tests__/
├── .env.example
├── eas.json
├── vercel.json
└── README.md
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`

Optional:
- `EXPO_PUBLIC_DRIP_TOKEN_CONTRACT`
- `EXPO_PUBLIC_DRIP_TOKEN_DECIMALS`
- `EXPO_PUBLIC_CHAIN` (`baseSepolia` or `polygonAmoy` recommended)
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_CUSTOM_DOMAIN`

## Local Development

Install dependencies:

```bash
npm install
```

Run app:

```bash
npm run start
```

Web:

```bash
npm run web
```

Lint / typecheck / tests:

```bash
npm run lint
npm run typecheck
npm run test
```

## Supabase Setup

1. Apply SQL migration:

```bash
supabase db push
```

2. Deploy edge function:

```bash
supabase functions deploy handleTap
```

3. Set edge function secrets:

```bash
supabase secrets set DRIPDROP_TAP_SECRET=your_secret_here
```

The edge function validates:
- Tap timestamp freshness
- Signature integrity
- Max 5 taps per second
- Cooldown lock on suspicious activity

RLS ensures clients cannot directly mutate balances without backend controls.

## EAS Build

Development build:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

Production:

```bash
eas build --profile production --platform all
```

## Vercel Deployment

`vercel.json` is configured for Expo web static output.

Deploy:

```bash
vercel --prod
```

To map a custom domain (for example `dripdrop.cc`), add it from the Vercel project dashboard once DNS is configured.

## Gameplay Systems Implemented

- Tap-to-mine with animated droplet, haptics, and sound
- Phase progression: Drip -> Puddle -> Stream -> River -> Lake -> Cloud
- Cloud darkening and Dark Cloud readiness
- Upgrade panel with Bucket, Watering Can, Hose, Pump
- Super Drip boost mode (random + Pump-assisted trigger)
- Referral bonus, daily streak multiplier
- Leaderboard/friends leaderboard reads
- Wallet page with internal and external send flows
- Launch timer + rain unlock animation trigger
- Offline queue + background sync

## Security Notes

- JWT/session persistence uses SecureStore (native) and localStorage only on web
- No direct client-side trust for balance updates
- Edge function + RLS gate all sensitive updates
- Rate limit and cooldown enforced client and server side
