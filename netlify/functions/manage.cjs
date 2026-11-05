
const { db, reply, hash } = require('./_shared.cjs');

exports.handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return reply(405, { error: 'Method not allowed' });
  }

  try {
    const a = event.httpMethod === 'POST'
      ? JSON.parse(event.body || '{}')
      : event.queryStringParameters || {};

    if (
      !/^[0-9a-f-]{36}$/i.test(a.id || '') ||
      !a.token
    ) {
      return reply(400, {
        error: 'Invalid management link'
      });
    }

    const rows = await db('venom_reservations', {
      query:
        '?select=id,status,expires_at,' +
        'reminders_disabled,player_name' +
        '&id=eq.' + encodeURIComponent(a.id) +
        '&manage_token_hash=eq.' +
        encodeURIComponent(hash(a.token)) +
        '&limit=1'
    });

    if (!rows.length) {
      return reply(404, {
        error: 'Management link not found'
      });
    }

    const r = rows[0];

    if (event.httpMethod === 'GET') {
      return reply(200, {
        status: r.status,
        expires_at: r.expires_at,
        reminders_disabled: r.reminders_disabled,
        player_name: r.player_name,
        cancellation_allowed: false
      });
    }

    // Parents can only unsubscribe from reminders.
    // They cannot cancel or release roster spots.
    if (a.action !== 'unsubscribe') {
      return reply(403, {
        error:
          'Please contact Weslaco Venom to request cancellation. ' +
          'Only an administrator can release a roster spot.'
      });
    }

    await db('venom_reservations', {
      method: 'PATCH',
      query:
        '?id=eq.' + encodeURIComponent(r.id),
      body: {
        reminders_disabled: true
      }
    });

    return reply(200, {
      message:
        'Payment reminder emails disabled. ' +
        'Your registration remains active unless ' +
        'Weslaco Venom manually cancels it.'
    });

  } catch (error) {
    console.error('Registration management error:', error.message);

    return reply(503, {
      error: 'Unable to update registration'
    });
  }
};
