import { createClient } from 'npm:@supabase/supabase-js@2';

type HandleTapRequest = {
  tapCount: number;
  timestamp: number;
  signature: string;
  nonce: string;
};

const TAP_WINDOW_MS = 1_000;
const MAX_TAPS_PER_SECOND = 5;
const COOLDOWN_MS = 30_000;

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const tapSecret = Deno.env.get('TAP_EVENT_SECRET') ?? '';

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!supabaseUrl || !serviceRoleKey || !tapSecret) {
    return json(500, { error: 'Missing edge function env configuration' });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return json(401, { error: 'Missing authorization header' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return json(401, { error: 'Invalid auth token' });
  }

  const payload = (await request.json()) as HandleTapRequest;
  const tapCount = Math.max(1, Math.floor(payload.tapCount));
  const timestamp = Number(payload.timestamp);
  const signature = payload.signature ?? '';
  const nonce = payload.nonce ?? '';

  if (!Number.isFinite(timestamp) || !signature || !nonce) {
    return json(400, { error: 'Invalid payload' });
  }

  const expectedSig = await sha256(`${user.id}:${tapCount}:${timestamp}:${nonce}:${tapSecret}`);
  if (expectedSig !== signature) {
    return json(403, { error: 'Signature mismatch' });
  }

  const {
    data: profileRow,
    error: profileError,
  } = await adminClient.from('profiles').select('suspicious_cooldown_until').eq('id', user.id).maybeSingle();

  if (profileError) {
    return json(500, { error: profileError.message });
  }

  const nowIso = new Date().toISOString();
  if (profileRow?.suspicious_cooldown_until && profileRow.suspicious_cooldown_until > nowIso) {
    return json(429, {
      error: 'Cooldown active',
      cooldownUntil: profileRow.suspicious_cooldown_until,
    });
  }

  const windowStart = new Date(Date.now() - TAP_WINDOW_MS).toISOString();
  const { count, error: countError } = await adminClient
    .from('tap_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', windowStart);

  if (countError) {
    return json(500, { error: countError.message });
  }

  const windowCount = count ?? 0;
  if (windowCount + tapCount > MAX_TAPS_PER_SECOND) {
    const cooldownUntil = new Date(Date.now() + COOLDOWN_MS).toISOString();
    const { error: cooldownError } = await adminClient
      .from('profiles')
      .update({ suspicious_cooldown_until: cooldownUntil })
      .eq('id', user.id);

    if (cooldownError) {
      return json(500, { error: cooldownError.message });
    }

    return json(429, {
      error: 'Rate limited',
      cooldownUntil,
      maxTapsPerSecond: MAX_TAPS_PER_SECOND,
    });
  }

  const { data: balanceRow, error: balanceError } = await adminClient
    .from('balances')
    .select('drip_balance, tap_value')
    .eq('user_id', user.id)
    .maybeSingle();

  if (balanceError) {
    return json(500, { error: balanceError.message });
  }

  const currentBalance = Number(balanceRow?.drip_balance ?? 0);
  const tapValue = Number(balanceRow?.tap_value ?? 1);
  const earned = tapValue * tapCount;
  const nextBalance = currentBalance + earned;

  const { error: eventError } = await adminClient.from('tap_events').insert({
    user_id: user.id,
    tap_count: tapCount,
    tap_value: tapValue,
    earned_amount: earned,
    event_signature: signature,
    event_nonce: nonce,
    client_timestamp: new Date(timestamp).toISOString(),
  });
  if (eventError) {
    return json(500, { error: eventError.message });
  }

  const { error: updateError } = await adminClient
    .from('balances')
    .update({
      drip_balance: nextBalance,
      total_taps: Number(balanceRow ? (balanceRow as { total_taps?: number }).total_taps ?? 0 : 0) + tapCount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);
  if (updateError) {
    return json(500, { error: updateError.message });
  }

  return json(200, {
    ok: true,
    earned,
    dripBalance: nextBalance,
    tapValue,
  });
});
