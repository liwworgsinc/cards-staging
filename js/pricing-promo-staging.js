(function(){
  if (typeof LIW_IS_GITHUB_STAGING === 'undefined' || !LIW_IS_GITHUB_STAGING) return;
  if (!/\/pricing(?:\.html)?$/.test(location.pathname)) return;

  const KEY='liw_staging_promo_code';
  const VISITOR_KEY='liw_staging_promo_visitor';
  const PUBLIC_ENDPOINT=`${LIW_CONFIG.supabaseUrl}/functions/v1/promo-code-public-staging`;
  const normalize=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,32);
  const planNames={lite:'Lite',plus:'Plus',pro:'Pro',agency:'Agency Starter',white_label:'Agency Pro'};
  let countdownTimer=null;

  function getStored(){try{return normalize(sessionStorage.getItem(KEY));}catch(_){return '';}}
  function setStored(v){try{v?sessionStorage.setItem(KEY,v):sessionStorage.removeItem(KEY);}catch(_){}}
  function getVisitor(){
    try{
      let id=sessionStorage.getItem(VISITOR_KEY);
      if(!id){id=`v_${crypto.randomUUID()}`;sessionStorage.setItem(VISITOR_KEY,id);}
      return id;
    }catch(_){return `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;}
  }
  function campaign(){
    const p=new URLSearchParams(location.search);
    return {utmSource:p.get('utm_source')||'',utmMedium:p.get('utm_medium')||'',utmCampaign:p.get('utm_campaign')||'',landingPath:`${location.pathname}${location.search}`.slice(0,300)};
  }
  function discountText(p){return p.discountType==='percent'?`${Number(p.discountValue)}% OFF`:`$${Number(p.discountValue).toFixed(2)} OFF`;}
  function plansText(p){const plans=Array.isArray(p.applicablePlans)?p.applicablePlans:[];return plans.length?plans.map(x=>planNames[x]||x).join(', '):'all paid plans';}

  async function validatePromo(code,events=[]){
    const res=await fetch(PUBLIC_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':LIW_CONFIG.supabaseKey,'x-liw-staging-promo':'cards-staging-promo-public-v1'},
      body:JSON.stringify({code,visitorId:getVisitor(),events,campaign:campaign()})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'Promo code could not be verified.');
    return data.promo;
  }

  function stopCountdown(){if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null;}}
  function renderCountdown(expiresAt){
    stopCountdown();
    const box=document.getElementById('liw-staging-promo-countdown');
    if(!box)return;
    if(!expiresAt){box.hidden=true;return;}
    const target=new Date(expiresAt).getTime();
    const tick=()=>{
      const left=Math.max(0,target-Date.now());
      if(left<=0){box.textContent='Offer ended';box.hidden=false;stopCountdown();return;}
      const days=Math.floor(left/86400000),hours=Math.floor((left%86400000)/3600000),mins=Math.floor((left%3600000)/60000),secs=Math.floor((left%60000)/1000);
      const parts=[];if(days)parts.push(`${days}d`);parts.push(`${String(hours).padStart(2,'0')}h`,`${String(mins).padStart(2,'0')}m`,`${String(secs).padStart(2,'0')}s`);
      box.textContent=`Offer ends in ${parts.join(' ')}`;box.hidden=false;
    };
    tick();countdownTimer=setInterval(tick,1000);
  }

  function showPromo(promo){
    const status=document.getElementById('liw-staging-promo-status');
    const offer=document.getElementById('liw-staging-promo-offer');
    const title=document.getElementById('liw-staging-promo-offer-title');
    const details=document.getElementById('liw-staging-promo-offer-details');
    if(status){status.textContent=`${promo.code} verified and ready for checkout.`;status.classList.add('liw-staging-promo-applied');}
    if(title)title.textContent=`${discountText(promo)} with ${promo.code}`;
    if(details){
      const pieces=[`Valid on ${plansText(promo)}`];
      if(promo.remaining!==null && promo.remaining<=10)pieces.push(`${promo.remaining} use${promo.remaining===1?'':'s'} remaining`);
      if(promo.description)pieces.push(promo.description);
      details.textContent=pieces.join(' · ');
    }
    if(offer)offer.hidden=false;
    renderCountdown(promo.expiresAt);
  }

  function clearPromoUI(message='Promo codes are verified securely when you choose a paid plan.'){
    stopCountdown();
    const offer=document.getElementById('liw-staging-promo-offer');if(offer)offer.hidden=true;
    const status=document.getElementById('liw-staging-promo-status');if(status){status.textContent=message;status.classList.remove('liw-staging-promo-applied');}
  }

  async function applyCode(rawCode,events=[],quiet=false){
    const input=document.getElementById('liw-staging-promo-code');
    const code=normalize(rawCode);if(input)input.value=code;
    if(!code){window.toast?.('Enter a promo code first.');return null;}
    const button=document.getElementById('liw-staging-promo-apply');
    const old=button?.textContent;if(button){button.disabled=true;button.textContent='Checking…';}
    try{
      const promo=await validatePromo(code,events);
      setStored(code);showPromo(promo);if(!quiet)window.toast?.(`${code} applied.`);return promo;
    }catch(error){
      setStored('');clearPromoUI(error.message);if(!quiet)window.toast?.(error.message);return null;
    }finally{if(button){button.disabled=false;button.textContent=old||'Apply';}}
  }

  window.LIWStagingPromo={
    getCode(){const input=document.getElementById('liw-staging-promo-code');return normalize(input?.value || getStored());},
    clear(){setStored('');const input=document.getElementById('liw-staging-promo-code');if(input)input.value='';clearPromoUI();}
  };

  // Staging-only transport shim: billing.js remains production-identical.
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string' ? input : input instanceof URL ? input.href : input?.url || '';
    if(!url.includes('/functions/v1/create-checkout-session') || url.includes('/create-checkout-session-staging')) return nativeFetch(input,init);
    const nextUrl=url.replace('/functions/v1/create-checkout-session','/functions/v1/create-checkout-session-staging-v2');
    const nextInit={...(init||{})};
    const headers=new Headers(nextInit.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('x-liw-staging-checkout','cards-staging-checkout-v1');
    nextInit.headers=headers;
    if(nextInit.body && typeof nextInit.body==='string'){
      try{const body=JSON.parse(nextInit.body);body.promoCode=window.LIWStagingPromo.getCode() || null;nextInit.body=JSON.stringify(body);}catch(_){}
    }
    return nativeFetch(nextUrl,nextInit);
  };

  function mount(){
    if(document.getElementById('liw-staging-promo')) return;
    const shell=document.querySelector('#individual-plans .pricing-matrix-shell') || document.querySelector('#individual-plans .container');
    if(!shell) return setTimeout(mount,150);
    shell.insertAdjacentHTML('beforebegin',`<div class="liw-staging-promo" id="liw-staging-promo"><div class="liw-staging-promo-head"><strong>Have a promo code?</strong><span class="liw-staging-promo-badge">STAGING TEST</span></div><div class="liw-staging-promo-row"><input class="input" id="liw-staging-promo-code" autocomplete="off" maxlength="32" placeholder="Enter code"><button class="btn btn-primary" type="button" id="liw-staging-promo-apply">Apply</button><button class="btn btn-light" type="button" id="liw-staging-promo-clear">Clear</button></div><small id="liw-staging-promo-status">Promo codes are verified securely when you choose a paid plan.</small><div class="liw-staging-promo-offer" id="liw-staging-promo-offer" hidden><div><span>LIMITED OFFER</span><strong id="liw-staging-promo-offer-title"></strong><small id="liw-staging-promo-offer-details"></small></div><b id="liw-staging-promo-countdown" hidden></b></div></div>`);
    const input=document.getElementById('liw-staging-promo-code');
    const queryCode=normalize(new URLSearchParams(location.search).get('promo'));
    const stored=getStored();
    input.value=queryCode||stored;
    document.getElementById('liw-staging-promo-apply').addEventListener('click',()=>applyCode(input.value,['applied']));
    document.getElementById('liw-staging-promo-clear').addEventListener('click',()=>{input.value='';setStored('');clearPromoUI();window.toast?.('Promo cleared.');});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyCode(input.value,['applied']);}});
    if(queryCode) applyCode(queryCode,['visit','applied'],true);
    else if(stored) applyCode(stored,[],true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
