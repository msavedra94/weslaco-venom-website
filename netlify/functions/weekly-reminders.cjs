const {db,send,site,escapeHtml}=require('./_shared.cjs');
// Netlify scheduled functions run with cron in UTC. Run once a day to handle expiry promptly;
// send only one reminder when a reservation reaches day 7.
exports.config={schedule:'0 14 * * *'};
exports.handler=async()=>{
 const now=new Date();
 const all=await db('venom_reservations',{query:'?select=id,guardian_email,player_name,status,created_at,payment_window_started_at,expires_at,last_reminder_at,reminders_disabled&status=eq.reserved&limit=1000'});
 let expired=0,reminded=0;
 for(const r of all){
  if(r.expires_at && Date.parse(r.expires_at)<=now.getTime()){
   await db('venom_reservations',{method:'PATCH',query:`?id=eq.${r.id}&status=eq.reserved`,body:{status:'expired'}});expired++;continue;
  }
  if(!r.payment_window_started_at || !r.expires_at)continue; // Pricing TBD: never remind or expire.
  const elapsed=now.getTime()-Date.parse(r.payment_window_started_at);
  if(!r.reminders_disabled&&!r.last_reminder_at&&elapsed>=7*86400000){
   // Do not expose a management token in bulk reminders. Link to contact Venom for payment.
   await send(r.guardian_email,'Weslaco Venom — Payment reminder',`<h2>Payment reminder</h2><p>Your reserved spot for ${escapeHtml(r.player_name)} expires on ${new Date(r.expires_at).toLocaleDateString('en-US',{timeZone:'America/Chicago'})} unless payment is confirmed.</p><p>Use the private management link in your original confirmation email to manage your registration or opt out.</p><p>Questions? Contact Weslaco Venom.</p>`);
   await db('venom_reservations',{method:'PATCH',query:`?id=eq.${r.id}&status=eq.reserved`,body:{last_reminder_at:now.toISOString()}});reminded++;
  }
 }
 return {statusCode:200,body:JSON.stringify({expired,reminded})};
};
