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

### Environment variables

Copy `.env.example` to `.env.local`. Required keys: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID`. The app has an offline fallback mode and will run in offline/guest mode when Supabase credentials are placeholders.

### Deployment

- **Web build**: `npm run web:build` produces a static bundle in `dist/`
- **Vercel deploy**: Requires `VERCEL_TOKEN` secret. Run `npx vercel --prod --token $VERCEL_TOKEN` from the `dripdrop/` directory.
- The `vercel.json` config handles SPA rewrites.

### Important patterns

- **Zustand v5 selectors**: Always use `useShallow` from `zustand/react/shallow` when selecting multiple values as an object. Without it, Zustand v5 uses `Object.is` comparison and re-renders infinitely.
- **Platform-specific files**: Metro resolves `.web.ts` for web builds. Exports in platform-specific files must match the import name exactly (e.g. `useWalletConnect` not `useWalletConnectModal`).

### Tests

Unit tests (`__tests__/antiCheat.test.ts`, `__tests__/phaseCalculator.test.ts`) run via Jest with `ts-jest` in a `node` environment. They do not require Supabase or any external service.
