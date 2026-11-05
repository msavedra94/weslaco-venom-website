
const { db, send, escapeHtml } = require('./_shared.cjs');

// Run daily at 14:00 UTC.
exports.config = {
  schedule: '0 14 * * *'
};

exports.handler = async () => {
  const now = new Date();
  const adminEmail = process.env.ADMIN_EMAIL;

  let overdue = 0;
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

    const overduePlayers = [];

    for (const r of all) {
      try {
        if (!r.payment_window_started_at || !r.expires_at) {
          continue;
        }

        const deadline = Date.parse(r.expires_at);
        const started = Date.parse(r.payment_window_started_at);

        if (!Number.isFinite(deadline) ||
            !Number.isFinite(started)) {
          failed++;
          continue;
        }

        // Overdue is a notification status only.
        // NEVER automatically expire or cancel a player.
        if (deadline <= now.getTime()) {
          overdue++;
          overduePlayers.push(r);
          continue;
        }

        // One parent reminder after seven days.
        if (
          !r.reminders_disabled &&
          !r.last_reminder_at &&
          now.getTime() - started >= 7 * 86400000
        ) {
          const dueDate = new Date(deadline)
            .toLocaleDateString('en-US', {
              timeZone: 'America/Chicago'
            });

          await send(
            r.guardian_email,
            'Weslaco Venom — Payment reminder',
            `
              <h2>Weslaco Venom Payment Reminder</h2>
              <p>The uniform fee for
              <strong>${escapeHtml(r.player_name)}</strong>
              has not yet been marked paid.</p>
              <p>Payment deadline:
              <strong>${dueDate}</strong></p>
              <p>Uniform fee: <strong>$50</strong></p>
              <p>Pay by Zelle to
              <strong>956-264-8663</strong>
              or cash in person.</p>
              <p>The separate $50 Texasports fee
              is paid directly to Texasports.
              Payment link to be announced.</p>
              <p>You may opt out of reminders using
              the link in your original
              registration confirmation.</p>
            `
          );

          await db('venom_reservations', {
            method: 'PATCH',
            query:
              `?id=eq.${encodeURIComponent(r.id)}` +
              '&status=eq.reserved' +
              '&last_reminder_at=is.null',
            body: {
              last_reminder_at: now.toISOString()
            }
          });

          reminded++;
        }
      } catch (error) {
        failed++;
        console.error(
          'Reminder processing failed:',
          r.id,
          error.message
        );
      }
    }

    // Daily admin summary of overdue registrations.
    if (overduePlayers.length && adminEmail) {
      try {
        const items = overduePlayers.map(r => {
          const due = new Date(r.expires_at)
            .toLocaleDateString('en-US', {
              timeZone: 'America/Chicago'
            });

          return `<li>${escapeHtml(r.player_name)}
            — deadline ${escapeHtml(due)}</li>`;
        }).join('');

        await send(
          adminEmail,
          `Weslaco Venom — ${overdue} overdue payment(s)`,
          `
            <h2>Overdue Uniform Payments</h2>
            <p>${overdue} registration(s) need review.</p>
            <ul>${items}</ul>
            <p>No registrations were automatically
            cancelled. Review them in your
            administrator dashboard.</p>
          `
        );
      } catch (error) {
        failed++;
        console.error(
          'Admin overdue email failed:',
          error.message
        );
      }
    }

    console.log({ overdue, reminded, failed });

    return {
      statusCode: 200,
      body: JSON.stringify({
        overdue,
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
