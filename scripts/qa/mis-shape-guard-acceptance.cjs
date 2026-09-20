const BASE=process.env.QA_BASE_URL||'https://mizantra.saksolution.com';
if(!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE))throw new Error('Refusing outside Mizantra TEST.');
const ok=(value,message,details)=>{if(!value)throw new Error(`${message}${details===undefined?'':`\n${JSON.stringify(details,null,2)}`}`)};
async function call(path,options={}){const response=await fetch(`${BASE}${path}`,options),raw=await response.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=raw}return{response,data}}
(async()=>{
 const login=await call('/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:process.env.QA_USERNAME||'hnoman',password:process.env.QA_PASSWORD||'Password'})});ok(login.response.ok&&login.data?.accessToken,'Mizantra test login failed.',login.data);
 const headers={authorization:`Bearer ${login.data.accessToken}`};const mis=await call('/api/v1/dashboard/mis',{headers});ok(mis.response.ok,'MIS endpoint failed.',mis.data);
 for(const field of ['executiveSummary','decisionsRequired','nextReviewFocus','managementAttention','riskRegister','departmentActions'])ok(Array.isArray(mis.data?.[field]),`MIS field ${field} is not an array.`,mis.data?.[field]);
 const page=await fetch(`${BASE}/dashboard`);ok(page.ok,`Dashboard page returned ${page.status}`);
 console.log(JSON.stringify({pass:true,environment:'MIZANTRA TEST ONLY',provider:mis.data.provider,executive_summary_lines:mis.data.executiveSummary.length,decisions:mis.data.decisionsRequired.length,page_status:page.status},null,2));
})().catch(error=>{console.error(error.stack||error);process.exit(1)});
