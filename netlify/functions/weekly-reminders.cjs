
const { db, send, escapeHtml } = require('./_shared.cjs');

// Run daily at 14:00 UTC.
exports.config = {
  schedule: '0 14 * * *'
};

exports.handler = async () => {
  const now = new Date();

  let expired = 0;
  let reminded = 0;
  let failed = 0;

  try {
    const all = await db('venom_reservations', {
      query:
        '?select=id,guardian_email,player_name,status,' +
        'payment_window_started_at,expires_at,' +
        'last_reminder_at,reminders_disabled' +
        '&status=eq.reserved' +
        '&order=created_at.asc' +
        '&limit=1000'
    });

    for (const r of all) {
      try {
        // Pricing TBD: no countdown, reminders, or expiration.
        if (
          !r.payment_window_started_at ||
          !r.expires_at
        ) {
          continue;
        }

        const deadline = Date.parse(r.expires_at);
        const started = Date.parse(
          r.payment_window_started_at
        );

        if (
          !Number.isFinite(deadline) ||
          !Number.isFinite(started)
        ) {
          failed++;
          console.error(
            'Invalid payment dates for reservation',
            r.id
          );
          continue;
        }

        // Release unpaid spots after the deadline.
        if (deadline <= now.getTime()) {
          await db('venom_reservations', {
            method: 'PATCH',
            query:
              `?id=eq.${r.id}` +
              '&status=eq.reserved',
            body: {
              status: 'expired'
            }
          });

          expired++;
          continue;
        }

        // Send one reminder at day 7.
        const elapsed = now.getTime() - started;

        if (
          !r.reminders_disabled &&
          !r.last_reminder_at &&
          elapsed >= 7 * 86400000
        ) {
          const dueDate = new Date(
            deadline
          ).toLocaleDateString('en-US', {
            timeZone: 'America/Chicago'
          });

          await send(
            r.guardian_email,
            'Weslaco Venom — Payment reminder',
            `
              <h2>Weslaco Venom Payment Reminder</h2>
              <p>
                This is a reminder that the
                reserved spot for
                <strong>${escapeHtml(r.player_name)}</strong>
                has not yet been marked paid.
              </p>
              <p>
                Payment deadline:
                <strong>${dueDate}</strong>
              </p>
              <p>
                Please contact Weslaco Venom
                for payment instructions.
              </p>
              <p>
                You can manage your registration
                or unsubscribe using the private
                link in your original confirmation email.
              </p>
            `
          );

          await db('venom_reservations', {
            method: 'PATCH',
            query:
              `?id=eq.${r.id}` +
              '&status=eq.reserved',
            body: {
              last_reminder_at: now.toISOString()
            }
          });

          reminded++;
        }

      } catch (error) {
        failed++;

        console.error(
          'Reservation processing failed:',
          r.id,
          error.message
        );

        // Continue processing other reservations.
      }
    }

    console.log({
      expired,
      reminded,
      failed
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        expired,
        reminded,
        failed
      })
    };

  } catch (error) {
    console.error(
      'Scheduled reminder job failed:',
      error.message
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Scheduled processing failed'
      })
    };
  }
};
