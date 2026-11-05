
const { db, reply } = require('./_shared.cjs');

exports.handler = async () => {
  try {
    const divisions = await db('venom_divisions', {
      query: '?select=id,name,season,capacity,fee_cents,pricing_announced_at&active=eq.true&order=season.asc,name.asc'
    });

    const reservations = await db('venom_reservations', {
      query: '?select=division_id,status&status=in.(reserved,paid)'
    });

    const results = divisions.map(d => {
      const occupied = reservations.filter(r =>
        r.division_id === d.id &&
        (r.status === 'reserved' || r.status === 'paid')
      ).length;

      return {
        ...d,
        remaining: Math.max(0, d.capacity - occupied)
      };
    });

    return reply(200, results);
  } catch (e) {
    return reply(503, {
      error: 'Registration temporarily unavailable'
    });
  }
};
