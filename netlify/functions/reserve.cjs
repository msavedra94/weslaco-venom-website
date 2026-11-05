
const {
  db,
  reply,
  site,
  token,
  hash,
  send,
  escapeHtml
} = require('./_shared.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return reply(405, {
      error: 'Method not allowed'
    });
  }

  try {
    const a = JSON.parse(event.body || '{}');

    const required = [
      'division_id',
      'guardian_name',
      'guardian_email',
      'player_name',
      'player_birthdate'
    ];

    for (const field of required) {
      if (
        typeof a[field] !== 'string' ||
        !a[field].trim() ||
        a[field].length > 150
      ) {
        return reply(400, {
          error: 'Please complete all required fields'
        });
      }
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        a.guardian_email.trim()
      )
    ) {
      return reply(400, {
        error: 'Invalid email'
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        a.player_birthdate
      )
    ) {
      return reply(400, {
        error: 'Invalid birthdate'
      });
    }

    const managementToken = token();

    const result = await db('rpc/venom_reserve', {
      method: 'POST',
      body: {
        p_division: a.division_id,
        p_guardian: a.guardian_name.trim(),
        p_email: a.guardian_email.trim().toLowerCase(),
        p_phone: String(a.guardian_phone || '').slice(0, 40),
        p_player: a.player_name.trim(),
        p_birthdate: a.player_birthdate,
        p_hash: hash(managementToken)
      }
    });

    const id = result;

    if (
      typeof id !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(id)
    ) {
      throw new Error('Invalid reservation response');
    }

    const link =
      `${site}/manage.html?id=${encodeURIComponent(id)}` +
      `&token=${encodeURIComponent(managementToken)}`;

    // Clear any deadline assigned by the existing
    // database registration function.
    await db('venom_reservations', {
      method: 'PATCH',
      query:
        '?id=eq.' + encodeURIComponent(id) +
        '&status=eq.reserved',
      body: {
        expires_at: null,
        payment_window_started_at: null
      }
    });

    // The reservation has no payment deadline.
    // Only an administrator can cancel it.
    const emailHtml = `
      <h2>Weslaco Venom Registration Confirmed!</h2>

      <p>
        Your player's spot has been reserved.
      </p>

      <p>
        <strong>Player:</strong>
        ${escapeHtml(a.player_name)}
      </p>

      <p>
        <strong>Uniform fee:</strong> $50
      </p>

      <p>
        Payment options:
        Zelle to <strong>956-264-8663</strong>
        or cash in person.
      </p>

      <p>
        There is no payment deadline.
        Your registration remains reserved
        unless Weslaco Venom manually cancels it.
      </p>

      <p>
        A separate $50 Texasports registration
        fee is paid directly to Texasports.
        The payment link will be announced.
      </p>

      <p>
        <a href="${escapeHtml(link)}">
          View your registration or unsubscribe
          from reminder emails
        </a>
      </p>

      <p>
        To request cancellation, contact
        Weslaco Venom directly.
      </p>
    `;

    try {
      await send(
        a.guardian_email.trim().toLowerCase(),
        'Weslaco Venom — Registration Confirmed',
        emailHtml
      );
    } catch (emailError) {
      console.error(
        'Registration confirmation email failed:',
        emailError.message
      );

      // Registration stays reserved even if
      // the confirmation email cannot be delivered.
    }

    return reply(201, {
      id,
      message:
        'Registration created successfully. ' +
        'Your player has a reserved spot.',
      expires_in_days: null
    });

  } catch (error) {
    console.error(
      'Registration failed:',
      error.message
    );

    const full =
      /full|not accepting/i.test(error.message);

    return reply(full ? 409 : 503, {
      error: full
        ? 'This division is full or closed.'
        : 'Unable to reserve. Please try again later.'
    });
  }
};
