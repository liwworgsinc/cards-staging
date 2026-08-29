(async function(){
  'use strict';

  const theme=document.createElement('link');
  theme.rel='stylesheet';
  theme.href='css/domains-liw-theme-staging.css?v=20260829-2';
  theme.dataset.liwDomainTheme='true';
  document.head.appendChild(theme);

  const form=document.getElementById('domain-search-form');
  const input=document.getElementById('domain-search-input');
  const button=document.getElementById('domain-search-button');
  const status=document.getElementById('domain-status');
  const result=document.getElementById('domain-result');
  const cardSelect=document.getElementById('domain-card-select');
  if(!form||!input||!button||!status||!result)return;

  const heroCopy=document.querySelector('.domain-hero-copy>p');
  if(heroCopy)heroCopy.textContent='Search live domain availability and see the LIW price your customer pays. GoDaddy wholesale cost stays protected on the server.';
  const heroPricingPoint=document.querySelector('.domain-hero-points span:nth-child(2)');
  if(heroPricingPoint)heroPricingPoint.innerHTML='<i data-lucide="receipt-text" size="16"></i> Standard domains from $24.99/yr';
  const searchIntro=document.querySelector('.domain-panel-heading p');
  if(searchIntro)searchIntro.textContent='Enter a full domain or just your business name. If you leave off the extension, we’ll check .com. Standard domains start at $24.99 for the first year.';
  const priceLabels=document.querySelectorAll('.domain-price-grid>div');
  if(priceLabels[0]){
    const label=priceLabels[0].querySelector('span');
    if(label)label.textContent='Your price';
  }
  if(priceLabels[1]){
    const label=priceLabels[1].querySelector('span');
    const small=priceLabels[1].querySelector('small');
    if(label)label.textContent='Renews at';
    if(small)small.textContent='Annual renewal';
  }
  const cardLabel=document.querySelector('label[for="domain-card-select"]');
  if(cardLabel)cardLabel.textContent='Card / person to connect';

  const user=await requireUser();
  if(!user)return;
  const userEmail=document.getElementById('domain-user-email');
  if(userEmail)userEmail.textContent=user.email||'Give your LIW Card its own web address.';

  document.getElementById('sidebar-toggle')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.toggle('open'));

  document.querySelectorAll('[data-domain-example]').forEach(example=>{
    example.addEventListener('click',()=>{
      input.value=example.dataset.domainExample||'';
      input.focus();
    });
  });

  await loadCards(user.id);

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const requested=String(input.value||'').trim();
    if(!requested){
      setStatus('error','Enter a domain first','Try something like yourbusiness.com.','circle-alert');
      input.focus();
      return;
    }

    setBusy(true);
    result.hidden=true;
    setStatus('loading','Checking availability…','Looking up live GoDaddy inventory and calculating the LIW customer price.','loader-circle');

    try{
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session?.access_token)throw new Error('Your session expired. Log in again.');

      const response=await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/godaddy-domain-search`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey':LIW_CONFIG.supabaseKey,
          'Authorization':`Bearer ${session.access_token}`
        },
        body:JSON.stringify({domain:requested})
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload?.error||'Unable to check this domain right now.');

      renderResult(payload);
      input.value=payload.domain||requested;
    }catch(error){
      setStatus('error','Search could not finish',error?.message||'Unable to check this domain right now.','circle-alert');
      result.hidden=true;
    }finally{
      setBusy(false);
    }
  });

  function setBusy(isBusy){
    button.disabled=isBusy;
    button.innerHTML=isBusy
      ? '<i data-lucide="loader-circle" size="18"></i><span>Checking…</span>'
      : '<i data-lucide="search" size="18"></i><span>Search</span>';
    if(window.lucide)lucide.createIcons();
  }

  function setStatus(kind,title,copy,icon){
    status.className=`domain-status${kind?` ${kind}`:''}`;
    status.innerHTML=`<span class="domain-status-icon"><i data-lucide="${icon||'sparkles'}" size="19"></i></span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>`;
    if(window.lucide)lucide.createIcons();
  }

  function renderResult(data){
    const domain=String(data?.domain||'').trim();
    const available=Boolean(data?.available);
    const inventory=String(data?.inventory||'STANDARD').toUpperCase();
    const prices=Array.isArray(data?.retailPrices)?data.retailPrices:[];
    const oneYear=prices.find(item=>Number(item?.period)===1)||prices[0]||null;
    const fallbackFirst=data?.pricingPolicy?.standardFirstYearFrom||null;
    const fallbackRenewal=data?.pricingPolicy?.standardRenewalFrom||null;

    result.hidden=false;
    result.className=`domain-result ${available?'available':'unavailable'}`;
    document.getElementById('domain-result-name').textContent=domain||'Domain';
    document.getElementById('domain-result-label').textContent=available?'Available':'Not available';
    document.getElementById('domain-availability-icon').innerHTML=available
      ? '<i data-lucide="circle-check-big" size="24"></i>'
      : '<i data-lucide="circle-x" size="24"></i>';

    const badge=document.getElementById('domain-inventory-badge');
    badge.textContent=inventory==='PREMIUM'?'Premium':'Standard';
    badge.classList.toggle('premium',inventory==='PREMIUM');

    const firstPrice=oneYear?.price||(inventory==='STANDARD'?fallbackFirst:null);
    const renewalPrice=oneYear?.renewalPrice||(inventory==='STANDARD'?fallbackRenewal:null);
    document.getElementById('domain-registration-price').textContent=available?formatMoney(firstPrice):'—';
    document.getElementById('domain-renewal-price').textContent=available?formatMoney(renewalPrice):'—';
    document.getElementById('domain-registration-term').textContent=oneYear?.period?`${oneYear.period} year${Number(oneYear.period)===1?'':'s'} · LIW price`:'1 year · LIW price';

    const premiumNote=document.getElementById('domain-premium-note');
    premiumNote.hidden=inventory!=='PREMIUM';
    if(inventory==='PREMIUM'){
      const note=premiumNote.querySelector('span');
      if(note)note.textContent='Premium domains use live acquisition cost plus LIW’s service margin, so the customer price may be higher than standard domains.';
    }

    const next=document.getElementById('domain-next-button');
    next.disabled=true;
    next.innerHTML=available
      ? '<i data-lucide="shopping-bag" size="18"></i> Continue to purchase'
      : '<i data-lucide="search" size="18"></i> Search another name';

    setStatus(
      available?'success':'error',
      available?`${domain} is available`:`${domain} is already taken`,
      available
        ? 'This is live availability with LIW customer pricing. Checkout remains locked while we finish purchase testing.'
        : 'Try another name or extension. No registration or charge was attempted.',
      available?'circle-check-big':'circle-x'
    );

    if(window.lucide)lucide.createIcons();
    result.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function formatMoney(money){
    if(!money||typeof money.value!=='number')return '—';
    const currency=money.currencyCode||'USD';
    try{
      return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(money.value/100);
    }catch{
      return `$${(money.value/100).toFixed(2)}`;
    }
  }

  async function loadCards(userId){
    if(!cardSelect)return;
    const {data,error}=await supabaseClient
      .from('digital_cards')
      .select('id,slug,internal_label,company_name,full_name,status')
      .eq('user_id',userId)
      .order('updated_at',{ascending:false});

    if(error){
      cardSelect.innerHTML='<option value="">Could not load cards</option>';
      return;
    }

    const cards=data||[];
    if(!cards.length){
      cardSelect.innerHTML='<option value="">Create a card first</option>';
      cardSelect.disabled=true;
      return;
    }

    cardSelect.disabled=false;
    cardSelect.innerHTML=cards.map(card=>{
      const businessLabel=card.internal_label||card.company_name||card.slug||'Untitled card';
      const personName=String(card.full_name||'').trim();
      const displayName=personName&&personName.toLowerCase()!==String(businessLabel).trim().toLowerCase()
        ? `${businessLabel} · ${personName}`
        : businessLabel;
      const state=card.status==='published'?'Published':'Draft';
      return `<option value="${escapeHtml(card.id)}">${escapeHtml(displayName)} · ${escapeHtml(state)}</option>`;
    }).join('');
  }

  if(window.lucide)lucide.createIcons();
})();