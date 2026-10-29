
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

    // Validate the user's login with Supabase.
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

    // Verify that this user is an authorized Venom admin.
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

    // Fetch divisions and registration records.
    const divisions = await db('venom_divisions', {
      query:
        '?select=id,name,capacity,active,' +
        'fee_cents,pricing_announced_at' +
        '&order=name.asc'
    });

    const reservations = await db('venom_reservations', {
      query:
        '?select=id,division_id,player_name,' +
        'player_birthdate,guardian_name,' +
        'guardian_email,guardian_phone,' +
        'status,created_at,expires_at,' +
        'payment_window_started_at' +
        '&order=created_at.desc' +
        '&limit=1000'
    });

    const activeStatuses = new Set([
      'reserved',
      'paid'
    ]);

    const result = divisions.map((division) => {
      const players = reservations.filter(
        (r) => r.division_id === division.id
      );

      const occupied = players.filter((r) => {
        if (!activeStatuses.has(r.status)) {
          return false;
        }

        if (r.status === 'paid') {
          return true;
        }

        return (
          !r.expires_at ||
          new Date(r.expires_at).getTime() > Date.now()
        );
      }).length;

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
