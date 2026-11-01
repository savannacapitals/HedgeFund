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
   - Redirect URLs: add
       https://yourdomain.com/auth/callback
       http://localhost:3000/auth/callback
3. SQL editor: run supabase/migrations/00012_google_signin_profile_name.sql

## 3. Code
Unzip over the project root, then `npm run dev`. Try /login and /register.

Files: src/components/GoogleButton.tsx (new), src/app/auth/callback/route.ts (new),
login + register pages (button added), migration 00012 (profile name from Google).
