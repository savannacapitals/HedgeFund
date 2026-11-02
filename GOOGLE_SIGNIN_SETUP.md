# Google sign-in setup

## 1. Google Cloud Console (console.cloud.google.com)
1. APIs & Services > OAuth consent screen: set app name "Savanna Capitals", support email, add your domain. Publish the app (or add test users while testing).
2. APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
3. Authorized redirect URI (exactly one, from Supabase):
   https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback
   (Authorized JavaScript origins: your site URL, and http://localhost:3000 for local testing.)
4. Copy the Client ID and Client Secret.

## 2. Supabase dashboard (the project your website uses, not the Academy terminal one)
1. Authentication > Providers > Google: enable, paste Client ID and Secret, save.
2. Authentication > URL Configuration:
   - Site URL: your live domain (e.g. https://yourdomain.com)
   - Redirect URLs: add one entry for EVERY address you open the site on, exactly as typed:
       https://yourdomain.com/auth/callback
       https://www.yourdomain.com/auth/callback     (only if you use www)
       http://localhost:3000/auth/callback
     A plain /auth/callback entry matches the plain /auth/callback address the button sends. A
     rejected address makes Supabase fall back to the Site URL and the sign-in never finishes.
3. SQL editor: run supabase/migrations/00012_google_signin_profile_name.sql

## 3. Code
Unzip over the project root, then `npm run dev`. Try /login and /register.

Files: src/components/GoogleButton.tsx (new), src/app/auth/callback/route.ts (new),
login + register pages (button added), migration 00012 (profile name from Google).

## If "Continue with Google" shows an error
What you see tells you where the problem is:

| You see | Cause | Fix |
|---|---|---|
| Google page: "Error 400: redirect_uri_mismatch" | The redirect URI in Google Cloud does not match Supabase's | Google Cloud > Credentials > your OAuth client > Authorized redirect URIs: exactly `https://<project-ref>.supabase.co/auth/v1/callback` (no trailing slash, https) |
| Google page: "Error 403: access_denied" / "app not verified" | The OAuth consent screen is in Testing | Add your Google account under Test users, or Publish the app |
| A white page of JSON: "Unsupported provider: provider is not enabled" | Google is not switched on in Supabase, or you are on the wrong Supabase project | Supabase > Authentication > Providers > Google: enable, paste the Client ID and Secret. Make sure it is the project in your `NEXT_PUBLIC_SUPABASE_URL` |
| Login page: "Google sign-in could not be completed..." | The sign-in started on one address and finished on another (www vs no www, localhost), or cookies are blocked | Open the site on the same address from start to finish, and add each address to Redirect URLs (above) |
| Login page: "...your account could not be created" | The database trigger that creates the profile failed (the server log says "Database error saving new user") | Run migrations 00005 and 00012 in the SQL editor and check the log line for the real reason |
| Back on the home page, still signed out | The address you used is not in Redirect URLs, so Supabase sent you to the Site URL | Add the exact address to Redirect URLs (above) |
| Login page: "Google sign-in was cancelled." | You pressed Cancel at Google | Nothing to fix |

The server log (Vercel > Logs, or your terminal in development) always has the exact reason on a line starting "Google sign-in".
