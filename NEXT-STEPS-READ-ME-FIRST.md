# Weslaco Venom — connection preparation

**Do not deploy this ZIP to production yet.** The site currently uses Netlify Drop, and a static drag-and-drop ZIP may not deploy Netlify Functions or scheduled functions. Use Netlify CLI or Git-based deployment after testing.

## Confirmed
- Existing Supabase project and registration schema installed by user in SQL Editor.
- Netlify variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY were added by user.
- This package now reads SUPABASE_SECRET_KEY on the server (the prior starter expected a different variable name).

## Do next
1. Run database/STEP_1_UPDATE_EXISTING_DATABASE.sql in Supabase SQL Editor. It preserves existing records and leaves registrations closed.
2. Verify actual capacities, including Big Man Challenge (15 is placeholder).
3. Configure Resend verified sending domain, and Netlify RESEND_API_KEY and EMAIL_FROM (server-only).
4. Add verified payment checkout + webhook, authenticated admin controls, and robust email delivery/retry handling. Pricing is still TBD.
5. Add anti-bot/rate limiting, guardian privacy and youth data protection, and concurrency tests.
6. Deploy through Git/Netlify CLI (not just static ZIP), test all flows, then enable divisions.

## Rule
Before pricing: reservations have no expiration. Once pricing announced, existing reservations start 14-day window. Later reservations get their own 14 days. One day-7 reminder, then release unpaid slots after day 14.

## Current limitations
Not yet production-ready: payment processor, verified paid-status webhook, admin dashboard, email sender, and end-to-end tests are missing.
