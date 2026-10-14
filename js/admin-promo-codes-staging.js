(function(){
  if (typeof LIW_IS_GITHUB_STAGING === 'undefined' || !LIW_IS_GITHUB_STAGING) return;
  if (!/\/admin(?:\.html)?$/.test(location.pathname)) return;

  const endpoint = `${LIW_CONFIG.supabaseUrl}/functions/v1/admin-promo-codes-staging`;
  const PRICING_URL = `${location.origin}/cards-staging/pricing.html`;
  let promos = [];
  let summary = {};
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const planNames = {starter:'Free',lite:'Lite',plus:'Plus',pro:'Pro',agency:'Agency Starter',white_label:'Agency Pro'};
  const money = n => `$${Number(n).toFixed(Number(n)%1 ? 2 : 0)}`;
  const moneyCents = n => `$${(Number(n||0)/100).toFixed(2)}`;
  const discountText = p => p.discount_type === 'percent' ? `${Number(p.discount_value)}% off` : `${money(p.discount_value)} off`;
  const localValue = iso => { if(!iso) return ''; const d=new Date(iso); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); };
  const isoValue = value => value ? new Date(value).toISOString() : null;
  const promoLink = code => `${PRICING_URL}?promo=${encodeURIComponent(code)}`;

  async function call(action, payload={}){
    const { data:{ session } } = await supabaseClient.auth.getSession();
    if(!session) throw new Error('Sign in as LIW Admin first.');
    const res = await fetch(endpoint, {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${session.access_token}`,
        'apikey':LIW_CONFIG.supabaseKey,
        'x-liw-staging-admin':'cards-staging-promo-v1'
      },
      body:JSON.stringify({action,...payload})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || 'Promo request failed');
    return data;
  }

  function panelMarkup(){
    return `<section class="card admin-panel admin-support-panel admin-promo-panel" id="admin-promo-codes-panel">
      <div class="section-title admin-section-title"><div><span class="eyebrow">Super Admin · staging only</span><h2>Promo sales center</h2><p class="muted">Create discounts, copy trackable promo links, and see which codes turn visits into completed Stripe checkouts.</p></div><span class="status-pill trialing">Staging only</span></div>
      <div class="admin-promo-kpis" id="admin-promo-kpis">
        <article><span>Promo visits</span><strong id="promo-kpi-visits">0</strong></article>
        <article><span>Code applies</span><strong id="promo-kpi-applies">0</strong></article>
        <article><span>Checkouts started</span><strong id="promo-kpi-checkouts">0</strong></article>
        <article><span>Conversions</span><strong id="promo-kpi-conversions">0</strong></article>
        <article><span>Collected</span><strong id="promo-kpi-revenue">$0.00</strong></article>
      </div>
      <div class="admin-promo-grid">
        <form class="admin-promo-form" id="admin-promo-form">
          <input type="hidden" id="admin-promo-id">
          <div class="form-grid"><label><span>Promo code</span><input class="input" id="admin-promo-code" maxlength="32" placeholder="SAVE20" required></label><label><span>Description</span><input class="input" id="admin-promo-description" maxlength="300" placeholder="Fall campaign"></label></div>
          <div class="form-grid"><label><span>Discount type</span><select class="input" id="admin-promo-type"><option value="percent">Percentage</option><option value="fixed">Fixed dollar</option></select></label><label><span>Discount value</span><input class="input" id="admin-promo-value" type="number" min="0.01" step="0.01" value="10" required></label></div>
          <div class="form-grid"><label><span>Starts</span><input class="input" id="admin-promo-starts" type="datetime-local"></label><label><span>Expires</span><input class="input" id="admin-promo-expires" type="datetime-local"></label></div>
          <div class="form-grid"><label><span>Total usage limit</span><input class="input" id="admin-promo-max" type="number" min="1" step="1" placeholder="Unlimited"></label><label><span>Per-customer limit</span><input class="input" id="admin-promo-per-customer" type="number" min="1" step="1" value="1"></label></div>
          <div><span style="display:block;margin-bottom:7px;font-size:.78rem;font-weight:800;color:#38435a">Plan restrictions</span><div class="admin-promo-plans">
            ${['lite','plus','pro','agency','white_label'].map(p=>`<label class="admin-promo-plan"><input type="checkbox" name="admin-promo-plan" value="${p}" checked><span>${planNames[p]}</span></label>`).join('')}
          </div></div>
          <label class="toggle-row"><input id="admin-promo-active" type="checkbox" checked><span><strong>Active</strong><small>Turn this off anytime to stop new redemptions.</small></span></label>
          <div class="admin-promo-help"><strong>Sales tracking:</strong> Visits and applies come from promo links. Checkouts are synced back from Stripe. “Collected” only counts money Stripe reports as paid, so a free-trial conversion can show as a conversion before revenue appears.</div>
          <div class="admin-promo-actions"><button class="btn btn-primary" type="submit"><i data-lucide="save" size="16"></i> Save promo</button><button class="btn btn-light" type="button" id="admin-promo-reset">New promo</button></div>
        </form>
        <div><div class="admin-promo-table-wrap"><table class="comparison admin-table admin-promo-table"><thead><tr><th>Code</th><th>Discount</th><th>Funnel</th><th>Conversions</th><th>Collected</th><th>Window</th><th>Status</th><th>Actions</th></tr></thead><tbody id="admin-promo-rows"><tr><td colspan="8">Loading promo codes…</td></tr></tbody></table></div></div>
      </div>
    </section>`;
  }

  function resetForm(){
    const f=document.getElementById('admin-promo-form'); if(!f) return;
    f.reset();
    document.getElementById('admin-promo-id').value='';
    document.getElementById('admin-promo-value').value='10';
    document.getElementById('admin-promo-per-customer').value='1';
    document.getElementById('admin-promo-active').checked=true;
    document.querySelectorAll('input[name="admin-promo-plan"]').forEach(x=>x.checked=true);
  }

  function fillForm(p){
    document.getElementById('admin-promo-id').value=p.id;
    document.getElementById('admin-promo-code').value=p.code || '';
    document.getElementById('admin-promo-description').value=p.description || '';
    document.getElementById('admin-promo-type').value=p.discount_type;
    document.getElementById('admin-promo-value').value=p.discount_value;
    document.getElementById('admin-promo-starts').value=localValue(p.starts_at);
    document.getElementById('admin-promo-expires').value=localValue(p.expires_at);
    document.getElementById('admin-promo-max').value=p.max_redemptions ?? '';
    document.getElementById('admin-promo-per-customer').value=p.per_customer_limit || 1;
    document.getElementById('admin-promo-active').checked=!!p.active;
    const selected=new Set(p.applicable_plans || []);
    document.querySelectorAll('input[name="admin-promo-plan"]').forEach(x=>x.checked=!selected.size || selected.has(x.value));
    document.getElementById('admin-promo-codes-panel').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderSummary(){
    const map={visits:'promo-kpi-visits',applies:'promo-kpi-applies',checkouts:'promo-kpi-checkouts',conversions:'promo-kpi-conversions'};
    Object.entries(map).forEach(([key,id])=>{const el=document.getElementById(id);if(el)el.textContent=Number(summary[key]||0).toLocaleString();});
    const revenue=document.getElementById('promo-kpi-revenue'); if(revenue) revenue.textContent=moneyCents(summary.revenue_cents);
  }

  function render(){
    renderSummary();
    const body=document.getElementById('admin-promo-rows'); if(!body) return;
    if(!promos.length){ body.innerHTML='<tr><td colspan="8" class="admin-promo-empty">No staging promo codes yet.</td></tr>'; return; }
    body.innerHTML=promos.map(p=>{
      const windowText=`${p.starts_at ? new Date(p.starts_at).toLocaleDateString() : 'Now'} → ${p.expires_at ? new Date(p.expires_at).toLocaleString() : 'No expiry'}`;
      const funnel=`<div class="admin-promo-funnel"><b>${Number(p.visit_count||0)}</b> visits <span>→</span> <b>${Number(p.apply_count||0)}</b> applies <span>→</span> <b>${Number(p.checkout_count||0)}</b> checkouts</div>`;
      const conversions=`<strong>${Number(p.conversion_count||0)}</strong><small>${Number(p.paid_count||0)} paid · ${Number(p.conversion_rate||0)}% visit→conversion</small>`;
      return `<tr><td><span class="admin-promo-code">${esc(p.code)}</span><small class="muted" style="display:block">${esc(p.description||'')}</small><small class="admin-promo-uses">Uses: ${Number(p.usage_count||0)}${p.max_redemptions ? ` / ${p.max_redemptions}` : ''}</small></td><td>${discountText(p)}</td><td>${funnel}</td><td class="admin-promo-conversions">${conversions}</td><td><strong>${moneyCents(p.revenue_cents)}</strong><small class="muted" style="display:block">Discounts ${moneyCents(p.discount_cents)}</small></td><td>${esc(windowText)}</td><td><span class="admin-promo-status ${p.active?'active':'inactive'}">${p.active?'Active':'Inactive'}</span></td><td><div class="admin-promo-row-actions"><button class="btn btn-light btn-sm" data-promo-copy="${esc(p.code)}">Copy link</button><button class="btn btn-light btn-sm" data-promo-edit="${p.id}">Edit</button><button class="btn btn-light btn-sm" data-promo-toggle="${p.id}" data-active="${p.active?'0':'1'}">${p.active?'Disable':'Activate'}</button></div></td></tr>`;
    }).join('');
  }

  async function load(){
    try { const data=await call('list'); promos=data.promos||[]; summary=data.summary||{}; render(); }
    catch(e){ document.getElementById('admin-promo-rows').innerHTML=`<tr><td colspan="8">${esc(e.message)}</td></tr>`; }
  }

  async function save(e){
    e.preventDefault();
    const button=e.currentTarget.querySelector('button[type="submit"]'); const old=button.innerHTML; button.disabled=true; button.textContent='Saving…';
    try{
      const payload={
        id:document.getElementById('admin-promo-id').value || null,
        code:document.getElementById('admin-promo-code').value,
        description:document.getElementById('admin-promo-description').value,
        discountType:document.getElementById('admin-promo-type').value,
        discountValue:Number(document.getElementById('admin-promo-value').value),
        startsAt:isoValue(document.getElementById('admin-promo-starts').value),
        expiresAt:isoValue(document.getElementById('admin-promo-expires').value),
        maxRedemptions:document.getElementById('admin-promo-max').value || null,
        perCustomerLimit:Number(document.getElementById('admin-promo-per-customer').value || 1),
        applicablePlans:[...document.querySelectorAll('input[name="admin-promo-plan"]:checked')].map(x=>x.value),
        active:document.getElementById('admin-promo-active').checked
      };
      const data=await call('save',payload); window.toast?.(data.message || 'Promo saved'); resetForm(); await load();
    }catch(err){ window.toast?.(err.message); }
    finally{button.disabled=false;button.innerHTML=old;window.lucide?.createIcons?.();}
  }

  async function copyLink(code){
    const link=promoLink(code);
    try{await navigator.clipboard.writeText(link);window.toast?.(`${code} promo link copied.`);}catch(_){window.prompt('Copy this promo link:',link);}
  }

  async function init(){
    if(document.getElementById('admin-promo-codes-panel')) return;
    const anchor=document.querySelector('.admin-support-stats') || document.querySelector('.admin-owner-banner'); if(!anchor) return setTimeout(init,200);
    anchor.insertAdjacentHTML('afterend',panelMarkup());
    const nav=document.querySelector('.sidebar nav'); if(nav && !nav.querySelector('[href="#admin-promo-codes-panel"]')) nav.insertAdjacentHTML('beforeend','<a href="#admin-promo-codes-panel"><i data-lucide="ticket-percent" size="18"></i> Promo sales</a>');
    document.getElementById('admin-promo-form').addEventListener('submit',save);
    document.getElementById('admin-promo-reset').addEventListener('click',resetForm);
    document.getElementById('admin-promo-rows').addEventListener('click',async e=>{
      const copy=e.target.closest('[data-promo-copy]'); if(copy){await copyLink(copy.dataset.promoCopy);return;}
      const edit=e.target.closest('[data-promo-edit]'); if(edit){const p=promos.find(x=>x.id===edit.dataset.promoEdit); if(p) fillForm(p); return;}
      const toggle=e.target.closest('[data-promo-toggle]'); if(toggle){try{const data=await call('toggle',{id:toggle.dataset.promoToggle,active:toggle.dataset.active==='1'});window.toast?.(data.message);await load();}catch(err){window.toast?.(err.message);}}
    });
    window.lucide?.createIcons?.(); await load();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
