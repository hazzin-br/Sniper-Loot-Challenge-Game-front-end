// ═══════════════════════════════════════════════
//  SniperLoot Frontend Config
//  This file is PUBLIC — never put secrets here.
//  Supabase anon key is safe to expose.
// ═══════════════════════════════════════════════
const CONFIG = {
  // Your deployed backend URL (no trailing slash)
  API_URL: 'https://sniperloot-backend.onrender.com',
  WS_URL:  'wss://sniperloot-backend.onrender.com/ws',

  // Supabase project (anon key only — safe to be public)
  SUPABASE_URL:      'https://xxxxxxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key-here',

  // Game
  MIN_BET:     5,
  DEPOSIT_MIN: 50,
  DEPOSIT_MAX: 50000,
};
