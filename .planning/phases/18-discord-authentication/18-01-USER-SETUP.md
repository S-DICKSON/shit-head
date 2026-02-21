# Phase 18-01: User Setup — Discord OAuth2 Credentials

**Why this is needed:** The Discord OAuth2 token exchange requires your Discord app's Client ID and Client Secret. These credentials must be obtained from the Discord Developer Portal and cannot be automated.

---

## Step 1: Create or Open Your Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your existing application OR click **New Application**
3. Name it something recognizable (e.g., "Shithead Online")

---

## Step 2: Get Your Credentials

**Client ID:**
- Navigate to: Your Application -> **OAuth2** -> **General**
- Copy the **Client ID** displayed at the top

**Client Secret:**
- On the same page, click **Reset Secret** (or view existing secret)
- Copy the **Client Secret** — you will only see it once after reset

---

## Step 3: Configure Redirect URI

In **OAuth2 -> General -> Redirects**, add:

```
https://127.0.0.1
```

Click **Save Changes**. This redirect URI is required by Discord even though the Embedded App SDK handles redirects internally.

---

## Step 4: Set Environment Variables

**Server** (`packages/server/.env` — create from `.env.example`):

```bash
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
```

**Client** (`packages/client/.env` — create from `.env.example`):

```bash
VITE_DISCORD_CLIENT_ID=your_client_id_here
```

Note: `VITE_` prefix is required for Vite to expose the variable to the browser. The Client ID is safe to expose client-side; the Client Secret must NEVER appear in client code.

---

## Step 5: Verify Setup

After setting variables, verify the server starts and the endpoint responds:

```bash
# Start the server
make dev

# In another terminal, test the endpoint (should return 400 "Missing code" — that's correct)
curl -s -X POST http://localhost:3000/api/token \
  -H "Content-Type: application/json" \
  -d '{}' | cat

# Expected: {"error":"Missing code"}
# If you see {"error":"Server configuration error"} — env vars not loaded
```

---

## Checklist

- [ ] Discord Developer Portal application created
- [ ] Client ID copied to `packages/server/.env` as `DISCORD_CLIENT_ID`
- [ ] Client Secret copied to `packages/server/.env` as `DISCORD_CLIENT_SECRET`
- [ ] Client ID copied to `packages/client/.env` as `VITE_DISCORD_CLIENT_ID`
- [ ] Redirect URI `https://127.0.0.1` added in Discord Developer Portal
- [ ] Curl test returns `{"error":"Missing code"}` (not "Server configuration error")
