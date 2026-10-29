const {db,reply}=require('./_shared.cjs');
exports.handler=async()=>{try{
 const divisions=await db('venom_divisions',{query:'?select=id,name,season,capacity,fee_cents,pricing_announced_at&active=eq.true&order=season.asc,name.asc'});
 const reservations=await db('venom_reservations',{query:'?select=division_id,status,expires_at&status=in.(reserved,paid)'});
 const now=Date.now();return reply(200,divisions.map(d=>({...d,remaining:Math.max(0,d.capacity-reservations.filter(r=>r.division_id===d.id&&(r.status==='paid'||!r.expires_at||Date.parse(r.expires_at)>now)).length)})));
}catch(e){return reply(503,{error:'Registration temporarily unavailable'})}};
