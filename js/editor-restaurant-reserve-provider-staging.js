/* LIW Cards — STAGING ONLY — 2026-10-24.
   Adds a premium LIW Reserve / External provider choice to the Restaurant
   Order & Reserve editor without changing the saved restaurant data shape.
   The existing reservation_url remains the single source of truth so older
   cards and the public Restaurant experience stay backward compatible. */
(function(){
  'use strict';
  if(window.__LIW_RESTAURANT_RESERVE_PROVIDER_STAGING__)return;
  window.__LIW_RESTAURANT_RESERVE_PROVIDER_STAGING__=true;

  const STYLE_ID='liw-restaurant-reserve-provider-staging-style';
  const UI_ID='liw-restaurant-reserve-provider-staging';
  let manualChoice='';

  function isRestaurant(){
    const field=document.querySelector('[name="card_experience"]');
    return String(field?.value||'').trim().toLowerCase()==='restaurant';
  }

  function isLiwReserveUrl(value){
    const url=String(value||'').trim().toLowerCase();
    if(!url)return false;
    return /liwworgs\.com/.test(url)&&/(^|[./_-])reserve([./?_-]|$)|reservation/.test(url);
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${UI_ID}{margin:4px 0 14px}
      #${UI_ID} .liw-reserve-heading{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:9px}
      #${UI_ID} .liw-reserve-heading strong{font-size:.72rem;color:#111827}
      #${UI_ID} .liw-reserve-heading span{font-size:.58rem;color:#667085;line-height:1.35;text-align:right}
      #${UI_ID} .liw-reserve-provider-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #${UI_ID} .liw-reserve-provider{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:center;width:100%;min-height:76px;padding:12px;border:1px solid #e5e7eb;border-radius:15px;background:#fff;color:#111827;text-align:left;font:inherit;cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease,background .16s ease}
      #${UI_ID} .liw-reserve-provider:hover{border-color:#cbd5e1;box-shadow:0 8px 20px rgba(15,23,42,.06);transform:translateY(-1px)}
      #${UI_ID} .liw-reserve-provider.is-active{border-color:#f59e0b;background:#fffaf0;box-shadow:0 0 0 3px rgba(245,158,11,.12)}
      #${UI_ID} .liw-reserve-provider-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#f3f4f6;color:#334155}
      #${UI_ID} .liw-reserve-provider.is-active .liw-reserve-provider-icon{background:#111827;color:#fbbf24}
      #${UI_ID} .liw-reserve-provider-copy{min-width:0;display:block}
      #${UI_ID} .liw-reserve-provider-title{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:.69rem;font-weight:900;line-height:1.2}
      #${UI_ID} .liw-reserve-provider-copy small{display:block;margin-top:4px;color:#667085;font-size:.57rem;line-height:1.35;font-weight:650}
      #${UI_ID} .liw-reserve-badge{display:inline-flex;align-items:center;padding:3px 6px;border-radius:999px;background:#111827;color:#fff;font-size:.46rem;font-weight:950;letter-spacing:.05em;text-transform:uppercase}
      #${UI_ID} .liw-reserve-native-note{display:none;align-items:flex-start;gap:8px;margin-top:9px;padding:9px 10px;border-radius:11px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:.58rem;line-height:1.4}
      #${UI_ID}[data-provider="liw"] .liw-reserve-native-note{display:flex}
      #${UI_ID} .liw-reserve-native-note svg{flex:0 0 auto;margin-top:1px;color:#d97706}
      #${UI_ID} .liw-reserve-check{position:absolute;right:9px;top:9px;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:#111827;color:#fff;opacity:0;transform:scale(.8);transition:opacity .16s ease,transform .16s ease}
      #${UI_ID} .liw-reserve-provider.is-active .liw-reserve-check{opacity:1;transform:scale(1)}
      [data-liw-reserve-url-group="true"] .liw-reserve-url-help{margin-top:6px;color:#667085;font-size:.57rem;line-height:1.4}
      @media(max-width:620px){
        #${UI_ID} .liw-reserve-provider-grid{grid-template-columns:1fr}
        #${UI_ID} .liw-reserve-heading{align-items:flex-start;flex-direction:column;gap:3px}
        #${UI_ID} .liw-reserve-heading span{text-align:left}
      }
    `;
    document.head.appendChild(style);
  }

  function setChoice(root,input,choice,{fromUrl=false}={}){
    if(!root||!input)return;
    const next=choice==='external'?'external':'liw';
    if(!fromUrl)manualChoice=next;
    root.dataset.provider=next;
    root.querySelectorAll('[data-liw-reserve-provider]').forEach(button=>{
      const active=button.dataset.liwReserveProvider===next;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });

    const group=input.closest('.form-group');
    if(group){
      group.dataset.liwReserveUrlGroup='true';
      const label=group.querySelector(':scope > label');
      if(label)label.textContent=next==='liw'?'LIW Reserve booking URL':'Reservation booking URL';
      input.placeholder=next==='liw'?'Paste your LIW Reserve public booking link':'https://...';
      let help=group.querySelector('.liw-reserve-url-help');
      if(!help){
        help=document.createElement('div');
        help.className='liw-reserve-url-help';
        group.appendChild(help);
      }
      help.textContent=next==='liw'
        ?'Use the public booking link from LIW Reserve. Your card’s Reserve button will open that reservation experience.'
        :'Use OpenTable, Resy, Tock, your website, or another reservation provider.';
    }
  }

  function syncFromUrl(root,input){
    const value=String(input?.value||'').trim();
    if(value){
      manualChoice='';
      setChoice(root,input,isLiwReserveUrl(value)?'liw':'external',{fromUrl:true});
    }else if(manualChoice){
      setChoice(root,input,manualChoice,{fromUrl:true});
    }else{
      setChoice(root,input,'liw',{fromUrl:true});
    }
  }

  function mount(){
    if(!isRestaurant())return false;
    const actions=document.querySelector('[data-restaurant-panel="actions"]');
    const input=actions?.querySelector('[data-restaurant-setting="reservation_url"]');
    if(!actions||!input)return false;

    ensureStyle();
    let root=document.getElementById(UI_ID);
    if(!root){
      root=document.createElement('div');
      root.id=UI_ID;
      root.innerHTML=`
        <div class="liw-reserve-heading">
          <strong>Reservation provider</strong>
          <span>Choose how guests reserve from this card.</span>
        </div>
        <div class="liw-reserve-provider-grid" role="group" aria-label="Reservation provider">
          <button type="button" class="liw-reserve-provider" data-liw-reserve-provider="liw" aria-pressed="false">
            <span class="liw-reserve-provider-icon"><i data-lucide="calendar-check-2" size="18"></i></span>
            <span class="liw-reserve-provider-copy"><span class="liw-reserve-provider-title">LIW Reserve <span class="liw-reserve-badge">Recommended</span></span><small>Use the LIW reservation experience built for your ecosystem.</small></span>
            <span class="liw-reserve-check"><i data-lucide="check" size="12"></i></span>
          </button>
          <button type="button" class="liw-reserve-provider" data-liw-reserve-provider="external" aria-pressed="false">
            <span class="liw-reserve-provider-icon"><i data-lucide="external-link" size="18"></i></span>
            <span class="liw-reserve-provider-copy"><span class="liw-reserve-provider-title">External link</span><small>Keep an existing reservation service or website.</small></span>
            <span class="liw-reserve-check"><i data-lucide="check" size="12"></i></span>
          </button>
        </div>
        <div class="liw-reserve-native-note"><i data-lucide="sparkles" size="15"></i><span><strong>Built for LIW.</strong> Paste the restaurant’s public LIW Reserve booking link below. The saved card continues using the same Reserve action, so existing cards stay compatible.</span></div>`;

      const group=input.closest('.form-group');
      group?.insertAdjacentElement('beforebegin',root);
      root.querySelectorAll('[data-liw-reserve-provider]').forEach(button=>{
        button.addEventListener('click',()=>setChoice(root,input,button.dataset.liwReserveProvider));
      });
      input.addEventListener('input',()=>syncFromUrl(root,input));
      input.addEventListener('change',()=>syncFromUrl(root,input));
    }

    syncFromUrl(root,input);
    try{window.lucide?.createIcons?.();}catch(_){ }
    return true;
  }

  function boot(){
    mount();
    [80,220,500,1000,1800].forEach(delay=>setTimeout(mount,delay));
    document.addEventListener('click',event=>{
      if(event.target.closest?.('[data-card-experience="restaurant"],[data-restaurant-tab="actions"],.editor-tab'))setTimeout(mount,30);
    },true);
    document.addEventListener('change',event=>{
      if(event.target?.matches?.('[name="card_experience"]'))setTimeout(mount,20);
    },true);
    const observer=new MutationObserver(()=>{
      if(isRestaurant()&&!document.getElementById(UI_ID))mount();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
