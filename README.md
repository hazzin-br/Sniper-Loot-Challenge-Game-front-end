# SniperLoot — Frontend (Public)

Pure static HTML/CSS/JS — no build step, no secrets.

## Stack
- Vanilla JS (ES6 modules pattern, no bundler)
- Supabase JS v2 (CDN) — Google OAuth + session management
- WebSocket — real-time game events from backend
- REST API — bets, cashout, M-Pesa via backend proxy

---

## File Structure

```
public/
  index.html          ← Single page, all screens
  css/
    style.css         ← All styles
  js/
    config.js         ← ⚠ Edit this first (URLs + Supabase anon key)
    audio.js          ← Sound effects
    canvas.js         ← Game canvas renderer
    auth.js           ← Google OAuth via Supabase
    api.js            ← Fetch wrapper → backend REST
    socket.js         ← WebSocket client → backend WS
    game.js           ← Game state + UI driven by WS events
    livebets.js       ← Live bets feed
    mpesa.js          ← Deposit/withdraw UI (calls backend)
    ui.js             ← Screen switching + toasts + app init
```

---

## Setup

### 1. Edit `public/js/config.js`

```js
const CONFIG = {
  API_URL:           'https://your-backend.onrender.com',
  WS_URL:            'wss://your-backend.onrender.com/ws',
  SUPABASE_URL:      'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',   // safe to be public
  MIN_BET:     5,
  DEPOSIT_MIN: 50,
  DEPOSIT_MAX: 50000,
};
```

### 2. Supabase — enable Google OAuth

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Add your Google Client ID + Secret (from Google Cloud Console)
3. Set **Redirect URL** in Google Console to:
   `https://xxxx.supabase.co/auth/v1/callback`
4. Set **Site URL** in Supabase to your frontend URL

### 3. Deploy

**Netlify (recommended)**
```bash
# Drag-and-drop the `public/` folder to netlify.com
# Or connect this GitHub repo → set publish directory to `public`
```

**Vercel**
```bash
npx vercel --prod
# Set output directory to `public`
```

**GitHub Pages**
```bash
# Set source to `public/` folder in repo settings
```

**Local dev**
```bash
# Any static server works:
npx serve public
# or
python3 -m http.server 5500 --directory public
```

---

## Security Notes

- `config.js` contains only the **Supabase anon key** — this is intentionally public
- The anon key is protected by Row Level Security (RLS) on Supabase
- All M-Pesa credentials stay on the **private backend**
- All game logic (crash points, wallet debits) runs on the **private backend**
- The frontend is fully dumb — it only renders what the backend tells it
