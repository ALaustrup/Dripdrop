# handleTap edge function

Deploy with Supabase CLI:

```bash
supabase functions deploy handleTap --project-ref YOUR_PROJECT_REF
```

Set secret used for request signature validation:

```bash
supabase secrets set DRIPDROP_TAP_SECRET="your-secret"
```

The mobile/web client sends:
- `x-tap-signature`: `sha256(<secret>:<user_id>:<timestamp_ms>:<nonce>)`
- body with `timestamp`, `nonce`, and `delta`.

The function enforces:
- 5 taps/second max
- 30s cooldown when exceeded
- signature replay protection via `tap_events.nonce`

