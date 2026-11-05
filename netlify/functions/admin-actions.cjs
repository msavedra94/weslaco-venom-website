
const { db, reply } = require('./_shared.cjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

async function verifyAdmin(event) {
  const authorization =
    event.headers.authorization ||
    event.headers.Authorization ||
    '';

  if (!authorization.startsWith('Bearer ')) {
    return { error: 'Login required', code: 401 };
  }

  const token = authorization.slice(7).trim();

  if (!token || !SUPABASE_URL || !SUPABASE_KEY) {
    return { error: 'Unauthorized', code: 401 };
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    return { error: 'Session expired', code: 401 };
  }

  const user = await response.json();

  if (!user.id) {
    return { error: 'Unauthorized', code: 401 };
  }

  const admins = await db('venom_admins', {
    query:
      '?select=user_id&user_id=eq.' +
      encodeURIComponent(user.id) +
      '&limit=1'
  });

  if (!admins || admins.length !== 1) {
    return {
      error: 'Administrator access required',
      code: 403
    };
  }

  return { user };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'Method not allowed' });
  }

  try {
    const auth = await verifyAdmin(event);

    if (auth.error) {
      return reply(auth.code, { error: auth.error });
    }

    let data;

    try {
      data = JSON.parse(event.body || '{}');
    } catch {
      return reply(400, { error: 'Invalid request' });
    }

    const id = data.id;
    const action = data.action;

    if (
      typeof id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return reply(400, {
        error: 'Invalid registration ID'
      });
    }

    if (action === 'mark_paid') {
      const method = data.payment_method;

      if (!['zelle', 'cash'].includes(method)) {
        return reply(400, {
          error: 'Select Zelle or cash'
        });
      }

      const updated = await db('venom_reservations', {
        method: 'PATCH',
        query:
          '?id=eq.' + encodeURIComponent(id) +
          '&status=eq.reserved' +
          '&select=id,status,paid_at,payment_method',
        prefer: 'return=representation',
        body: {
          status: 'paid',
          paid_at: new Date().toISOString(),
          expires_at: null,
          payment_method: method,
          payment_confirmed_by: auth.user.id,
          payment_notes: 'Uniform fee confirmed by admin'
        }
      });

      if (!updated || updated.length !== 1) {
        return reply(409, {
          error: 'Registration is no longer pending'
        });
      }

      return reply(200, {
        success: true,
        message: 'Uniform payment confirmed',
        registration: updated[0]
      });
    }

    if (action === 'cancel') {
      const updated = await db('venom_reservations', {
        method: 'PATCH',
        query:
          '?id=eq.' + encodeURIComponent(id) +
          '&status=eq.reserved' +
          '&select=id,status',
        prefer: 'return=representation',
        body: {
          status: 'cancelled',
          reminders_disabled: true
        }
      });

      if (!updated || updated.length !== 1) {
        return reply(409, {
          error: 'Only pending registrations can be cancelled'
        });
      }

      return reply(200, {
        success: true,
        message: 'Registration cancelled and spot released',
        registration: updated[0]
      });
    }

    return reply(400, {
      error: 'Unknown administrator action'
    });

  } catch (error) {
    console.error(
      'Admin action failed:',
      error.message
    );

    return reply(503, {
      error: 'Unable to update registration'
    });
  }
};
