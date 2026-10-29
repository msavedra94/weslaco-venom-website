const {db,reply,hash}=require('./_shared.cjs');
exports.handler=async event=>{try{
 const a=event.httpMethod==='POST'?JSON.parse(event.body||'{}'):event.queryStringParameters||{};
 if(!/^[0-9a-f-]{36}$/i.test(a.id||'')||!a.token)return reply(400,{error:'Invalid management link'});
 const rows=await db('venom_reservations',{query:`?select=id,status,expires_at,reminders_disabled,player_name,guardian_email,division_id&id=eq.${encodeURIComponent(a.id)}&manage_token_hash=eq.${hash(a.token)}`});
 if(!rows.length)return reply(404,{error:'Management link not found'});
 const r=rows[0];
 if(event.httpMethod==='GET')return reply(200,{status:r.status,expires_at:r.expires_at,reminders_disabled:r.reminders_disabled,player_name:r.player_name});
 if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 if(a.action==='unsubscribe')await db('venom_reservations',{method:'PATCH',query:`?id=eq.${r.id}`,body:{reminders_disabled:true}});
 else if(a.action==='cancel'&&r.status==='reserved')await db('venom_reservations',{method:'PATCH',query:`?id=eq.${r.id}&status=eq.reserved`,body:{status:'cancelled',reminders_disabled:true}});
 else return reply(400,{error:'Action unavailable'});
 return reply(200,{message:a.action==='cancel'?'Reservation cancelled and spot released.':'Payment reminder emails disabled. Your spot remains reserved until its deadline.'});
 }catch(e){return reply(503,{error:'Unable to update registration'})}}
