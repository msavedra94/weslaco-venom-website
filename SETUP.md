# WESLACO VENOM — WINTER REGISTRATION (PRICE TBD)

## Status: NOT LIVE. Do not deploy as a live registration service without configuration and testing.

### Winter programs
- Winter 7v7: Boys 6U, 8U, 10U; Girls 8U, 10U. Price TBD.
- Big Man Challenge: 8U, 10U, 12U. Price TBD.
- Sample capacities are 15 each; adjust to actual limits before opening. Big Man Challenge capacity is NOT confirmed.

### Reservation rules
- Before pricing is announced: free spot reservation, no expiration and no payment reminders.
- Announce a price separately for each division using the `venom_announce_price` SQL function ONLY when payment collection is ready. This atomically sets the announcement time and starts existing reservations' 14-day clocks.
- New registrations after price announcement receive their own 14-day clock at registration.
- Day 7: one email reminder if unpaid and subscribed; day 14: unpaid reservations expire and release capacity.
- Parents may cancel and release a spot or separately unsubscribe from reminder emails.
- Paid reservations require VERIFIED server-side payment confirmation; this starter DOES NOT integrate a payment provider or provide a way to mark payments paid.

### To activate
1. Create Supabase project. For a new project, run `database/schema.sql` in SQL Editor. For an existing project, carefully review `database/MIGRATE_EXISTING.sql` and back up data first.
2. Review actual team capacities; set `active=true` for divisions you want open. Do NOT set any fee while prices are TBD.
3. Verify your sending domain with Resend and configure Netlify environment variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `URL=https://weslacovenom.com`. Never expose service-role key in HTML or Git.
4. Deploy through connected Git/build or Netlify CLI with Functions support; static ZIP drag-and-drop alone may not deploy server functions. `netlify.toml` contains the functions path.
5. Add Stripe Checkout + authenticated, verified webhooks (or another secure payment workflow), and a secure admin dashboard before announcing pricing. Test that a payment updates status to `paid` and halts reminders.
6. Test capacity under concurrent reservations, cancellations, unsubscribes, day-7 reminders, day-14 expiration, and price announcement timing with test data. Add rate limits, bot prevention, logging, retries, email delivery tracking, and data retention policy for minors before production.
7. To announce one division, run in Supabase SQL Editor (replace UUID and cents with the actual approved price): `select public.venom_announce_price('DIVISION-UUID'::uuid, 11000);` This is only an EXAMPLE; the price remains TBD until you choose it.

### Current limitations
- Payment checkout is not implemented. No production payment collection, admin portal, multi-child transaction, or email delivery guarantee.
- A scheduled Netlify function handles reminders/expiry daily; Netlify scheduling must be enabled and deployed.
- Confirmation emails use a private management token. Keep URLs private.
- This is a deployable development starter, not a production-ready registration platform.

### Division update (2026-10-28)
Winter 7v7 uses separate boys and girls divisions, NOT the previous 6U–14U list.
For an existing database with old division rows, use `database/UPDATE_WINTER_DIVISIONS.sql` after checking existing reservations. Never delete or rename divisions that already have real reservations without an explicit migration plan.
