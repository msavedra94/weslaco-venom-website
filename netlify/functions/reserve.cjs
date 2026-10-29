const {db,reply,site,token,hash,send,escapeHtml}=require('./_shared.cjs');
exports.handler=async event=>{if(event.httpMethod!=='POST')return reply(405,{error:'Method not allowed'});
 try{
 const a=JSON.parse(event.body||'{}');
 for(const k of ['division_id','guardian_name','guardian_email','player_name','player_birthdate'])if(!a[k]||String(a[k]).length>150) return reply(400,{error:'Please complete all required fields'});
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.guardian_email))return reply(400,{error:'Invalid email'});
 if(!/^\d{4}-\d\d-\d\d$/.test(a.player_birthdate))return reply(400,{error:'Invalid birthdate'});
 const t=token();
 const result=await db('rpc/venom_reserve',{method:'POST',body:{p_division:a.division_id,p_guardian:a.guardian_name.trim(),p_email:a.guardian_email.trim().toLowerCase(),p_phone:String(a.guardian_phone||'').slice(0,40),p_player:a.player_name.trim(),p_birthdate:a.player_birthdate,p_hash:hash(t)}});
 const id=typeof result==='string'?result:result;
 const link=`${site}/manage.html?id=${encodeURIComponent(id)}&token=${t}`;
 const rows=await db('venom_reservations',{query:`?select=expires_at&id=eq.${id}`});
 const due=rows[0]?.expires_at;
 await send(a.guardian_email,'Weslaco Venom — Your spot is reserved',`<h2>VENOM spot reserved!</h2><p>${due?'Your spot is held for 14 days from registration. Payment is due before '+new Date(due).toLocaleDateString('en-US')+'.':'Your spot is reserved! Price is TBD. Your 14-day payment period begins only after pricing is officially announced.'}</p><p><a href="${link}">Manage your registration, pay, cancel, or unsubscribe</a></p><p>Player: ${escapeHtml(a.player_name)}</p>`);
 return reply(201,{id,message:'Reservation created. Check your email for the private management link.',expires_in_days:due?14:null});
 }catch(e){return reply(/full|not accepting/i.test(e.message)?409:503,{error:/full|not accepting/i.test(e.message)?'This division is full or closed.':'Unable to reserve. Please try again later.'})}}
