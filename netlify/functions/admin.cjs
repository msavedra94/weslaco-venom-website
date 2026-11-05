
const { db, reply } = require('./_shared.cjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return reply(405, { error: 'Method not allowed' });
  }

  try {
    const authorization =
      event.headers.authorization ||
      event.headers.Authorization ||
      '';

    if (!authorization.startsWith('Bearer ')) {
      return reply(401, { error: 'Login required' });
    }

    const token = authorization.slice(7).trim();

    if (!token || !SUPABASE_URL || !SUPABASE_KEY) {
      return reply(401, { error: 'Unauthorized' });
    }

    // Verify the login with Supabase.
    const userResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!userResponse.ok) {
      return reply(401, {
        error: 'Invalid or expired login'
      });
    }

    const user = await userResponse.json();

    if (!user.id) {
      return reply(401, { error: 'Unauthorized' });
    }

    // Verify the account has admin privileges.
    // The database must enforce access to this table.
    const admins = await db('venom_admins', {
      query:
        '?select=user_id' +
        '&user_id=eq.' +
        encodeURIComponent(user.id) +
        '&limit=1'
    });

    if (!admins || admins.length !== 1) {
      return reply(403, {
        error: 'Administrator access required'
      });
    }

    // Retrieve divisions.
    const divisions = await db('venom_divisions', {
      query:
        '?select=id,name,capacity,active,' +
        'fee_cents,pricing_announced_at' +
        '&order=name.asc'
    });

    // Retrieve registrations and payment details.
    const reservations = await db('venom_reservations', {
      query:
        '?select=id,division_id,player_name,' +
        'player_birthdate,guardian_name,' +
        'guardian_email,guardian_phone,' +
        'status,created_at,expires_at,' +
        'payment_window_started_at,' +
        'paid_at,payment_method,' +
        'payment_confirmed_by,payment_notes' +
        '&order=created_at.desc' +
        '&limit=1000'
    });

    const activeStatuses = new Set([
      'reserved',
      'paid'
    ]);

    const now = Date.now();

    const result = divisions.map((division) => {
      const players = reservations
        .filter((r) => r.division_id === division.id)
        .map((r) => {
          const deadline = r.expires_at
            ? new Date(r.expires_at).getTime()
            : null;

          let payment_status = 'Inactive';

          if (r.status === 'paid') {
            payment_status = 'Paid';
          } else if (r.status === 'reserved') {
            payment_status =
              deadline !== null &&
              Number.isFinite(deadline) &&
              deadline <= now
                ? 'Overdue'
                : 'Pending';
          }

          return {
            ...r,
            payment_status
          };
        });

      // Reserved players keep their spots even
      // after the payment deadline.
      // Only cancellation releases a spot.
      const occupied = players.filter((r) =>
        activeStatuses.has(r.status)
      ).length;

      return {
        ...division,
        occupied,
        available: Math.max(
          0,
          division.capacity - occupied
        ),
        players
      };
    });

    return reply(200, {
      divisions: result,
      total_reservations: reservations.length,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error(
      'Admin dashboard error:',
      error.message
    );

    return reply(503, {
      error: 'Unable to load admin dashboard'
    });
  }
};

