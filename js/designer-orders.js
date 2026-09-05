(function(){
'use strict';
const $=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusLabel=s=>({awaiting_intake:'Awaiting intake',intake_submitted:'Intake submitted',in_design:'In design',customer_review:'Ready for review',revision_requested:'Revision requested',approved:'Approved',publishing:'Publishing',completed:'Completed',on_hold:'On hold',canceled:'Canceled'})[s]||s;
const date=v=>v?new Date(v).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';

function renderEmpty(isAdmin=false){
  const empty=$('#dw-orders-empty');
  if(!empty)return;
  const redirected=params.get('notice')==='intake-order-required';
  empty.hidden=false;
  empty.innerHTML=`
    <i data-lucide="${redirected?'shield-check':'palette'}" size="28"></i>
    <h2>${redirected?'A designer order is required.':'No designer orders yet.'}</h2>
    <p>${redirected?'The secure intake only opens from a verified designer order. Start from Hire a Designer after checkout, or use the Admin QA flow for testing.':'When you purchase a done-for-you design, the project will appear here automatically.'}</p>
    <div style="display:flex;gap:9px;flex-wrap:wrap;justify-content:center">
      ${isAdmin?'<a class="dw-btn navy" href="admin-designer-orders.html"><i data-lucide="flask-conical" size="15"></i> Open Admin QA</a>':''}
      <a class="dw-btn primary" href="hire-designer.html?from=orders">Explore designer services</a>
    </div>`;
  window.lucide?.createIcons?.();
}

async function init(){
  window.lucide?.createIcons?.();
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){location.href=liwUrl('login.html');return}
  let isAdmin=false;
  try{const access=await getLiwAccessContext(session.user);isAdmin=Boolean(access?.isAdmin);}catch(_){ }
  const {data,error}=await supabaseClient.from('designer_orders').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false});
  $('#dw-orders-loading').hidden=true;
  if(error){
    const empty=$('#dw-orders-empty');
    empty.hidden=false;
    empty.querySelector('h2').textContent='Could not load designer orders.';
    empty.querySelector('p').textContent=error.message;
    return;
  }
  if(!data?.length){renderEmpty(isAdmin);return}
  const list=$('#dw-orders-list');
  list.hidden=false;
  list.innerHTML=data.map(o=>{
    const intake=o.workflow_status==='awaiting_intake';
    const href=intake?`designer-intake.html?order=${encodeURIComponent(o.id)}`:`designer-order.html?id=${encodeURIComponent(o.id)}`;
    return `<a class="dw-order-row" href="${href}"><div><strong>${esc(o.order_number)}</strong><small>${esc(o.service_name)} · ${date(o.created_at)}</small></div><span>${esc(statusLabel(o.workflow_status))}</span><span>${o.revisions_used||0}/${o.revision_limit||0} revisions</span><i class="dw-row-arrow" data-lucide="arrow-right" size="17"></i></a>`;
  }).join('');
  window.lucide?.createIcons?.();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();