const crypto=require('node:crypto');
const url=process.env.SUPABASE_URL,key=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
const site=process.env.URL||'https://weslacovenom.com';
function reply(code,data){return {statusCode:code,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(data)}}
async function db(table,{method='GET',query='',body,prefer}={}){
 if(!url||!key)throw Error('Registration service is not configured');
 const r=await fetch(`${url}/rest/v1/${table}${query}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined});
 const t=await r.text();if(!r.ok)throw Error(t.slice(0,300));return t?JSON.parse(t):null;
}
const token=()=>crypto.randomBytes(32).toString('hex');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
async function send(email,subject,html){if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)throw Error('Email is not configured');
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[email],subject,html})});if(!r.ok)throw Error('Email failed: '+r.status);return r.json()}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
module.exports={reply,db,site,token,hash,send,escapeHtml};
