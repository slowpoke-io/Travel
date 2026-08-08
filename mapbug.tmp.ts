/**
 * 地圖分頁換日期後空白的重現。
 *
 * 觸發條件：先切到「沒有任何含座標行程」的那一天（元件會 early return，
 * 地圖容器整個從 DOM 消失），再切回有座標的那一天。
 */
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,service=process.env.SUPABASE_SERVICE_ROLE_KEY!,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BASE=process.env.TARGET||'https://travel-xi-murex.vercel.app'
const admin=createClient(url,service,{auth:{persistSession:false}})
let fail=0
const ck=(ok:boolean,l:string,d='')=>{if(!ok)fail++;console.log(`${ok?'✅':'❌'} ${l}${d?'  '+d:''}`)}
async function main(){
  const tripId='b8f12705-d49b-4bfb-9f85-4a5bedf9e29b'
  const {data:trip}=await admin.from('trips').select('owner_id').eq('id',tripId).single()
  const {data:users}=await admin.auth.admin.listUsers()
  const user=users.users.find(u=>u.id===trip!.owner_id)!
  const {data:link}=await admin.auth.admin.generateLink({type:'magiclink',email:user.email!})
  const pub=createClient(url,anon,{auth:{persistSession:false}})
  const {data:sess}=await pub.auth.verifyOtp({email:user.email!,token:link!.properties!.email_otp,type:'magiclink'})
  const ref=new URL(url).hostname.split('.')[0]
  const payload=JSON.stringify({access_token:sess.session!.access_token,refresh_token:sess.session!.refresh_token,expires_at:sess.session!.expires_at,token_type:'bearer',user:sess.user})
  const full=`base64-${Buffer.from(payload).toString('base64url')}`,C=3180,nm=`sb-${ref}-auth-token`
  const cookies=full.length<=C?[{name:nm,value:full,url:BASE}]:Array.from({length:Math.ceil(full.length/C)},(_,i)=>({name:`${nm}.${i}`,value:full.slice(i*C,(i+1)*C),url:BASE}))
  const b=await chromium.launch()
  const ctx=await b.newContext({viewport:{width:390,height:800}})
  await ctx.addCookies(cookies)
  const p=await ctx.newPage()
  const mounted=`(function(){return !!document.querySelector('.gm-style')})()`

  await p.goto(`${BASE}/trips/${tripId}/map`,{waitUntil:'domcontentloaded'})
  await p.waitForTimeout(9000)
  ck(await p.evaluate(mounted) as boolean,'一開始（全部）地圖有出來')

  await p.getByRole('button',{name:/^D2/}).click()
  await p.waitForTimeout(4000)
  ck(await p.evaluate(mounted) as boolean,'切到 D2（有座標）地圖有出來')

  await p.getByRole('button',{name:/^D1/}).click()
  await p.waitForTimeout(2500)
  const emptyMsg=(await p.locator('main, body').innerText()).includes('還沒有含地點')
  ck(emptyMsg,'切到 D1（沒座標）顯示空狀態')

  await p.getByRole('button',{name:/^D2/}).click()
  await p.waitForTimeout(5000)
  const back=await p.evaluate(mounted) as boolean
  ck(back,'★ 從沒座標的那天切回 D2，地圖要再出現')
  await p.screenshot({path:'/tmp/mapbug.png'})

  await b.close()
  console.log(fail?`\n${fail} 項失敗`:'\n全部通過')
  process.exit(fail?1:0)
}
main().catch(e=>{console.error(e);process.exit(1)})
