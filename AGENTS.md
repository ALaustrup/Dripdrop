# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

DripDrop is a cross-platform Expo SDK 54 tap-to-mine game (iOS, Android, Web). The Expo project lives in `/workspace/dripdrop/`. It is NOT a monorepo.

### Node.js

Node.js 22 LTS is installed via nvm. Source nvm before running any node/npm commands:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

### Common commands

All commands run from `/workspace/dripdrop`:

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Tests | `npm run test` |
| Dev server (web) | `npm run web` |
| Dev server (all) | `npm run start` |

### Known issues

- **SSR crash with SecureStore**: `expo start --web` crashes during server-side rendering because `services/supabase.ts` calls `SecureStore.deleteItemAsync` outside the Platform check in the `onAuthStateChange` callback (line ~141). The `storage` adapter in the Supabase client config has proper Platform guards, but `clearPersistedSession()` and `persistSessionSecurely()` do not. This causes `TypeError: ExpoSecureStore.default.deleteValueWithKeyAsync is not a function` during SSR. This is a pre-existing codebase bug.

### Environment variables

Copy `.env.example` to `.env.local`. Required keys: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`. The app has an offline fallback mode and won't hard-crash without valid Supabase credentials, but the SSR render path still invokes SecureStore (see known issues above).

### Tests

Unit tests (`__tests__/antiCheat.test.ts`, `__tests__/phaseCalculator.test.ts`) run via Jest with `ts-jest` in a `node` environment. They do not require Supabase or any external service.
