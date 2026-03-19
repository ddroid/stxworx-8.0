# Twitter/X OAuth Integration Plan

## Context
The Edit Profile page has an "Identity Verification" section with a Twitter/X connect button.
Currently it calls a mock `connectX()` that returns a hardcoded username after a fake delay.
The goal is to replace this with real Twitter OAuth 2.0, check if the connected account has a
blue checkmark, store that status in the DB, and surface a "Verified" badge in the UI.

---

## Step 0 — You Must Do This First (No Code Can Work Without It)

1. Go to **https://developer.twitter.com** and sign in with your X/Twitter account
2. Create a **Project** → inside it create an **App**
3. In App Settings → **User Authentication Settings**:
   - Enable **OAuth 2.0**
   - App type: **Web App, Automated App or Bot**
   - Callback / Redirect URL: `https://stxworx.com/api/auth/twitter/callback`
   - Website URL: `https://stxworx.com`
4. Save → copy your **Client ID** and **Client Secret**
5. Add to the VPS `.env` file:
   ```
   TWITTER_CLIENT_ID=your_client_id_here
   TWITTER_CLIENT_SECRET=your_client_secret_here
   TWITTER_CALLBACK_URL=https://stxworx.com/api/auth/twitter/callback
   ```

> Without these 3 env vars the Connect button will not work.

---

## How It Will Work (Full Flow)

```
User clicks CONNECT
       ↓
Frontend: window.location.href = '/api/auth/twitter'
       ↓
Backend: generates OAuth 2.0 PKCE URL, stores code_verifier in a short-lived
         httpOnly cookie, redirects browser to Twitter
       ↓
Twitter: user logs in and clicks Authorize
       ↓
Twitter redirects to: /api/auth/twitter/callback?code=...&state=...
       ↓
Backend: verifies state, exchanges code for token, calls Twitter API v2
         to get user info including the `verified` boolean field
       ↓
Backend: saves twitterId, twitterUsername, twitterVerified to DB
       ↓
Backend redirects to: https://stxworx.com/edit-profile?twitter=connected&verified=true
       ↓
Frontend: detects URL param on page load, fetches latest profile from DB,
          updates state, shows connected state / verified badge
```

---

## Blue Checkmark Logic

Twitter API v2 returns a `verified` boolean on every user object:
- `verified: true`  → account has a blue checkmark (legacy OR Twitter Premium subscriber)
- `verified: false` → no blue checkmark

Our app maps this directly:
- `verified: true`  → DB `twitter_verified = 1` → green **✓ Verified** badge shown
- `verified: false` → DB `twitter_verified = 0` → username shown but no badge

---

## What the UI Shows

| State | Display |
|-------|---------|
| Not connected | "Link your account for reputation" + **CONNECT** button |
| Connected, NOT verified | `@username connected` — no badge |
| Connected + verified (blue check) | `@username` + green **✓ Verified** badge |

---

## Package to Add

```bash
npm install twitter-api-v2
```

---

## DB Change (Run on VPS After Deploying)

```sql
ALTER TABLE users
  ADD COLUMN twitter_id VARCHAR(100) UNIQUE,
  ADD COLUMN twitter_username VARCHAR(100),
  ADD COLUMN twitter_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

---

## Files That Will Change

### Backend

| File | What Changes |
|------|-------------|
| `shared/schema.ts` | Add `twitterId`, `twitterUsername`, `twitterVerified` columns to users table |
| `backend/routes/twitter.routes.ts` | **NEW** — two routes: `GET /api/auth/twitter` and `/callback` |
| `backend/controllers/twitter.controller.ts` | **NEW** — OAuth initiation + callback logic |
| `backend/index.ts` | Mount `app.use("/api/auth/twitter", twitterRoutes)` |
| `backend/controllers/user.controller.ts` | Return twitter fields in `getByAddress` + `updateMe` |
| `backend/controllers/auth.controller.ts` | Return twitter fields in `/me` response |

### Frontend

| File | What Changes |
|------|-------------|
| `stxworx-freelance/lib/api.ts` | Add twitter fields to `BackendUser` type + update `mapBackendUserToProfile` |
| `stxworx-freelance/services/StacksService.ts` | Replace mock `connectX()` with real redirect to `/api/auth/twitter` |
| `stxworx-freelance/stores/useAppStore.ts` | `handleConnectX` triggers the redirect instead of awaiting a fake username |
| `stxworx-freelance/pages/EditProfilePage.tsx` | On mount, check `?twitter=connected` URL param → refresh profile from DB |
| `stxworx-freelance/types.ts` | Add `twitterUsername?: string` to `FreelancerProfile` |

### Config

| File | What Changes |
|------|-------------|
| `.env` | Add placeholder lines for the 3 Twitter env vars |

---

## New File: `backend/controllers/twitter.controller.ts`

```typescript
import { TwitterApi } from 'twitter-api-v2';
import { type Request, type Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const getClient = () =>
  new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });

const CALLBACK_URL = () => process.env.TWITTER_CALLBACK_URL!;

export const twitterController = {
  async initiateAuth(req: Request, res: Response) {
    if (!process.env.TWITTER_CLIENT_ID) {
      return res.redirect('/edit-profile?twitter=error&msg=not_configured');
    }
    const client = getClient();
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL(), {
      scope: ['users.read', 'tweet.read'],
    });
    // Store verifier + state in short-lived cookie
    res.cookie('_tw_oauth', JSON.stringify({ codeVerifier, state }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: 'lax',
      path: '/',
    });
    return res.redirect(url);
  },

  async handleCallback(req: Request, res: Response) {
    const { code, state } = req.query as { code: string; state: string };
    const stored = req.cookies._tw_oauth;

    res.clearCookie('_tw_oauth', { path: '/' });

    if (!stored || !code || !state) {
      return res.redirect('/edit-profile?twitter=error&msg=missing_params');
    }

    let parsed: { codeVerifier: string; state: string };
    try {
      parsed = JSON.parse(stored);
    } catch {
      return res.redirect('/edit-profile?twitter=error&msg=bad_cookie');
    }

    if (parsed.state !== state) {
      return res.redirect('/edit-profile?twitter=error&msg=state_mismatch');
    }

    try {
      const client = getClient();
      const { client: loggedClient } = await client.loginWithOAuth2({
        code,
        codeVerifier: parsed.codeVerifier,
        redirectUri: CALLBACK_URL(),
      });

      const twitterUser = await loggedClient.v2.me({
        'user.fields': ['verified'],
      });

      const isVerified = twitterUser.data.verified ?? false;

      if (!req.user) {
        return res.redirect('/edit-profile?twitter=error&msg=not_logged_in');
      }

      await db.update(users).set({
        twitterId: twitterUser.data.id,
        twitterUsername: twitterUser.data.username,
        twitterVerified: isVerified,
        updatedAt: new Date(),
      }).where(eq(users.id, req.user.id));

      return res.redirect(
        `/edit-profile?twitter=connected&verified=${isVerified}`
      );
    } catch (err) {
      console.error('Twitter callback error:', err);
      return res.redirect('/edit-profile?twitter=error&msg=oauth_failed');
    }
  },
};
```

---

## New File: `backend/routes/twitter.routes.ts`

```typescript
import { Router } from 'express';
import { twitterController } from '../controllers/twitter.controller';
import { requireAuth } from '../middleware/auth';

export const twitterRoutes = Router();

// Both routes require the user to be logged in (JWT cookie must be present)
twitterRoutes.get('/', requireAuth, twitterController.initiateAuth);
twitterRoutes.get('/callback', requireAuth, twitterController.handleCallback);
```

---

## Testing Steps After Deploy

1. Click **CONNECT** → browser should navigate to `twitter.com` login/authorize page
2. Authorize → browser returns to `https://stxworx.com/edit-profile?twitter=connected&verified=...`
3. Blue check account → green **✓ Verified** badge appears next to X row
4. No blue check → connected username shown, no badge
5. Refresh page → connected state persists (loaded from DB via `/api/users/:address`)
6. If `TWITTER_CLIENT_ID` is not set → redirected to `/edit-profile?twitter=error&msg=not_configured`
