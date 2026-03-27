'use strict';
// ═══════════════════════════════════════════════
//  AUTH  — Google OAuth via Supabase
//  Uses Supabase JS v2 CDN build (loaded in HTML)
// ═══════════════════════════════════════════════

const { createClient } = supabase;   // from CDN global

const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

let _session  = null;   // current Supabase session
let _profile  = null;   // profile from backend

// ── Expose globally ─────────────────────────────
window.Auth = {

  // Returns the current Supabase access token (or null)
  token() {
    return _session?.access_token || null;
  },

  user() {
    return _profile;
  },

  // Called once on page load — restore session if exists
  async init() {
    const { data } = await sb.auth.getSession();
    _session = data.session;

    sb.auth.onAuthStateChange(async (_event, session) => {
      _session = session;
      if (session) {
        await Auth._loadProfile();
        UI.onSignedIn(_profile);
      } else {
        _profile = null;
        UI.onSignedOut();
      }
    });

    if (_session) {
      await Auth._loadProfile();
      return _profile;
    }
    return null;
  },

  // Sign in with Google — Supabase handles the OAuth redirect
  async signInWithGoogle() {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
  },

  async signOut() {
    await sb.auth.signOut();
    _session = null;
    _profile = null;
    Socket.disconnect();
    UI.onSignedOut();
  },

  // Load profile from backend (has wallet etc.)
  async _loadProfile() {
    try {
      const data = await API.get('/auth/me');
      _profile = data.user;
      return _profile;
    } catch (err) {
      console.error('Profile load failed:', err.message);
      return null;
    }
  },

  // Update username (first time after Google sign-in)
  async setUsername(username) {
    const data = await API.post('/auth/profile', { username });
    _profile = { ..._profile, ...data.user };
    return _profile;
  },
};
