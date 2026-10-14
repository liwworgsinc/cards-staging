(function(){
  if (typeof LIW_IS_GITHUB_STAGING === 'undefined' || !LIW_IS_GITHUB_STAGING) return;
  if (!/\/pricing(?:\.html)?$/.test(location.pathname)) return;
  const KEY='liw_staging_promo_code';
  const normalize=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,32);
  function getStored(){try{return normalize(sessionStorage.getItem(KEY));}catch(_){return '';}}
  function setStored(v){try{v?sessionStorage.setItem(KEY,v):sessionStorage.removeItem(KEY);}catch(_){}}
  function mount(){
    if(document.getElementById('liw-staging-promo')) return;
    const shell=document.querySelector('#individual-plans .pricing-matrix-shell') || document.querySelector('#individual-plans .container');
    if(!shell) return setTimeout(mount,150);
    shell.insertAdjacentHTML('beforebegin',`<div class="liw-staging-promo" id="liw-staging-promo"><div class="liw-staging-promo-head"><strong>Have a promo code?</strong><span class="liw-staging-promo-badge">STAGING TEST</span></div><div class="liw-staging-promo-row"><input class="input" id="liw-staging-promo-code" autocomplete="off" maxlength="32" placeholder="Enter code"><button class="btn btn-primary" type="button" id="liw-staging-promo-apply">Apply</button><button class="btn btn-light" type="button" id="liw-staging-promo-clear">Clear</button></div><small id="liw-staging-promo-status">Promo codes are verified securely when you choose a paid plan.</small></div>`);
    const input=document.getElementById('liw-staging-promo-code');
    const status=document.getElementById('liw-staging-promo-status');
    input.value=getStored();
    if(input.value){status.textContent=`${input.value} saved — it will be verified at checkout.`;status.classList.add('liw-staging-promo-applied');}
    document.getElementById('liw-staging-promo-apply').addEventListener('click',()=>{
      const code=normalize(input.value); input.value=code;
      if(!code){window.toast?.('Enter a promo code first.');return;}
      setStored(code); status.textContent=`${code} saved — it will be verified at checkout.`; status.classList.add('liw-staging-promo-applied'); window.toast?.('Promo saved for staging checkout.');
    });
    document.getElementById('liw-staging-promo-clear').addEventListener('click',()=>{input.value='';setStored('');status.textContent='Promo codes are verified securely when you choose a paid plan.';status.classList.remove('liw-staging-promo-applied');window.toast?.('Promo cleared.');});
  }
  window.LIWStagingPromo={getCode(){const input=document.getElementById('liw-staging-promo-code');return normalize(input?.value || getStored());},clear(){setStored('');const input=document.getElementById('liw-staging-promo-code');if(input)input.value='';}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
