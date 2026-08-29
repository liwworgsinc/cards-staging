(async function(){
  'use strict';

  const theme=document.createElement('link');
  theme.rel='stylesheet';
  theme.href='css/domains-liw-theme-staging.css?v=20260829-5';
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
  if(heroCopy)heroCopy.textContent='Search live domain availability, compare popular extensions, and choose the LIW price that works for you.';
  const heroPricingPoint=document.querySelector('.domain-hero-points span:nth-child(2)');
  if(heroPricingPoint)heroPricingPoint.innerHTML='<i data-lucide="receipt-text" size="16"></i> Compare multiple extensions';
  const searchIntro=document.querySelector('.domain-panel-heading p');
  if(searchIntro)searchIntro.textContent='Enter your business name or a full domain. We’ll compare popular options like .com, .net, .org, .co, .me and .shop.';
  const priceLabels=document.querySelectorAll('.domain-price-grid>div');
  if(priceLabels[0]){
    const label=priceLabels[0].querySelector('span');
    if(label)label.textContent='First year';
  }
  if(priceLabels[1]){
    const label=priceLabels[1].querySelector('span');
    const small=priceLabels[1].querySelector('small');
    if(label)label.textContent='Renews at';
    if(small)small.textContent='Per year after year 1';
  }
  const cardLabel=document.querySelector('label[for="domain-card-select"]');
  if(cardLabel)cardLabel.textContent='Card / person to connect';

  let optionsPanel=document.getElementById('domain-options-panel');
  if(!optionsPanel){
    optionsPanel=document.createElement('section');
    optionsPanel.id='domain-options-panel';
    optionsPanel.className='domain-options-panel';
    optionsPanel.hidden=true;
    optionsPanel.innerHTML=`
      <div class="domain-options-heading">
        <div><span>DOMAIN OPTIONS</span><strong>Choose the address you want</strong></div>
        <small id="domain-options-count"></small>
      </div>
      <div class="domain-option-grid" id="domain-option-grid"></div>`;
    status.insertAdjacentElement('afterend',optionsPanel);
  }

  const priceGrid=document.querySelector('.domain-price-grid');
  let termPanel=document.getElementById('domain-term-panel');
  if(priceGrid&&!termPanel){
    termPanel=document.createElement('div');
    termPanel.className='domain-term-panel';
    termPanel.id='domain-term-panel';
    termPanel.hidden=true;
    termPanel.innerHTML=`
      <div class="domain-term-heading">
        <div><span>Registration length</span><strong>Choose how many years</strong></div>
        <small>Pay the selected term upfront</small>
      </div>
      <div class="domain-term-options" role="group" aria-label="Domain registration length">
        <button type="button" class="active" data-domain-years="1" aria-pressed="true"><strong>1</strong><span>year</span></button>
        <button type="button" data-domain-years="2" aria-pressed="false"><strong>2</strong><span>years</span></button>
        <button type="button" data-domain-years="3" aria-pressed="false"><strong>3</strong><span>years</span></button>
        <button type="button" data-domain-years="5" aria-pressed="false"><strong>5</strong><span>years</span></button>
        <button type="button" data-domain-years="10" aria-pressed="false"><strong>10</strong><span>years</span></button>
      </div>
      <div class="domain-term-summary">
        <div><span>Estimated total today</span><strong id="domain-term-total">—</strong></div>
        <p id="domain-term-breakdown">Final registration total will be confirmed before payment.</p>
      </div>`;
    priceGrid.insertAdjacentElement('afterend',termPanel);
  }

  let activePricing=null;
  let selectedYears=1;
  let activeSearchPayload=null;
  let selectedDomainIndex=-1;

  termPanel?.addEventListener('click',event=>{
    const termButton=event.target.closest('[data-domain-years]');
    if(!termButton||termButton.disabled)return;
    selectedYears=Number(termButton.dataset.domainYears)||1;
    renderTermPricing(selectedYears);
  });

  optionsPanel?.addEventListener('click',event=>{
    const option=event.target.closest('[data-domain-option]');
    if(!option||option.disabled||!activeSearchPayload)return;
    const index=Number(option.dataset.domainOption);
    const items=getItems(activeSearchPayload);
    if(!Number.isInteger(index)||!items[index]||!items[index].available)return;
    selectDomain(index,false);
  });

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
      setStatus('error','Enter a name first','Try your business name or a domain like yourbusiness.com.','circle-alert');
      input.focus();
      return;
    }

    setBusy(true);
    result.hidden=true;
    activePricing=null;
    activeSearchPayload=null;
    selectedDomainIndex=-1;
    if(optionsPanel)optionsPanel.hidden=true;
    if(termPanel)termPanel.hidden=true;
    setStatus('loading','Checking domain options…','Comparing popular extensions and calculating LIW customer pricing.','loader-circle');

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
      if(!response.ok)throw new Error(payload?.error||'Unable to check domains right now.');

      activeSearchPayload=payload;
      renderOptions(payload);
    }catch(error){
      setStatus('error','Search could not finish',error?.message||'Unable to check domains right now.','circle-alert');
      result.hidden=true;
      if(optionsPanel)optionsPanel.hidden=true;
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

  function getItems(data){
    if(Array.isArray(data?.items)&&data.items.length)return data.items;
    if(data?.domain)return [data];
    return [];
  }

  function firstYearPrice(item,policy){
    const prices=Array.isArray(item?.retailPrices)?item.retailPrices:[];
    const oneYear=prices.find(price=>Number(price?.period)===1)||prices[0]||null;
    if(oneYear?.price)return oneYear.price;
    return String(item?.inventory||'STANDARD').toUpperCase()==='STANDARD'?policy?.standardFirstYearFrom||null:null;
  }

  function renewalPrice(item,policy){
    const prices=Array.isArray(item?.retailPrices)?item.retailPrices:[];
    const oneYear=prices.find(price=>Number(price?.period)===1)||prices[0]||null;
    if(oneYear?.renewalPrice)return oneYear.renewalPrice;
    return String(item?.inventory||'STANDARD').toUpperCase()==='STANDARD'?policy?.standardRenewalFrom||null:null;
  }

  function renderOptions(data){
    const items=getItems(data);
    const grid=document.getElementById('domain-option-grid');
    const count=document.getElementById('domain-options-count');
    if(!grid||!optionsPanel||!items.length){
      setStatus('error','No domain options returned','Try a different business name or domain.','circle-alert');
      return;
    }

    const policy=data?.pricingPolicy||{};
    const availableCount=items.filter(item=>item?.available).length;
    optionsPanel.hidden=false;
    if(count)count.textContent=`${availableCount} available of ${items.length}`;
    grid.innerHTML=items.map((item,index)=>{
      const available=Boolean(item?.available);
      const inventory=String(item?.inventory||'STANDARD').toUpperCase();
      const first=firstYearPrice(item,policy);
      const renewal=renewalPrice(item,policy);
      const priceCopy=available
        ? `${formatMoney(first)} first year · ${formatMoney(renewal)} renewal`
        : 'Not available';
      return `<button type="button" class="domain-option${available?' available':' taken'}" data-domain-option="${index}" ${available?'':'disabled'}>
        <span class="domain-option-main"><strong>${escapeHtml(item?.domain||'Domain')}</strong><em>${available?'Available':'Taken'}</em></span>
        <span class="domain-option-meta">${escapeHtml(priceCopy)}${inventory==='PREMIUM'?' · Premium':''}</span>
      </button>`;
    }).join('');

    const firstAvailable=items.findIndex(item=>item?.available);
    if(firstAvailable>=0){
      selectDomain(firstAvailable,true);
      setStatus('success',`${availableCount} domain option${availableCount===1?'':'s'} available`,'Pick the address you like, choose the number of years, then connect it to your card.','circle-check-big');
    }else{
      result.hidden=true;
      if(termPanel)termPanel.hidden=true;
      setStatus('error','Those domain options are taken','Try another business name. We’ll check multiple extensions again.','circle-x');
    }

    if(window.lucide)lucide.createIcons();
    optionsPanel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function selectDomain(index,initial){
    if(!activeSearchPayload)return;
    const items=getItems(activeSearchPayload);
    const item=items[index];
    if(!item||!item.available)return;
    selectedDomainIndex=index;
    document.querySelectorAll('[data-domain-option]').forEach((option,optionIndex)=>{
      const active=optionIndex===index;
      option.classList.toggle('selected',active);
      option.setAttribute('aria-pressed',active?'true':'false');
    });
    renderSelectedDomain(item,activeSearchPayload?.pricingPolicy||{},!initial);
    input.value=item.domain||input.value;
  }

  function renderSelectedDomain(item,policy,scrollToResult){
    const domain=String(item?.domain||'').trim();
    const available=Boolean(item?.available);
    const inventory=String(item?.inventory||'STANDARD').toUpperCase();
    const prices=Array.isArray(item?.retailPrices)?item.retailPrices:[];
    const oneYear=prices.find(price=>Number(price?.period)===1)||prices[0]||null;
    const firstPrice=oneYear?.price||(inventory==='STANDARD'?policy?.standardFirstYearFrom||null:null);
    const renewal=oneYear?.renewalPrice||(inventory==='STANDARD'?policy?.standardRenewalFrom||null:null);

    result.hidden=!available;
    if(!available)return;
    result.className='domain-result available';
    document.getElementById('domain-result-name').textContent=domain||'Domain';
    document.getElementById('domain-result-label').textContent='Selected · Available';
    document.getElementById('domain-availability-icon').innerHTML='<i data-lucide="circle-check-big" size="24"></i>';

    const badge=document.getElementById('domain-inventory-badge');
    badge.textContent=inventory==='PREMIUM'?'Premium':'Standard';
    badge.classList.toggle('premium',inventory==='PREMIUM');

    document.getElementById('domain-registration-price').textContent=formatMoney(firstPrice);
    document.getElementById('domain-renewal-price').textContent=formatMoney(renewal);
    document.getElementById('domain-registration-term').textContent='Year 1 · LIW price';

    activePricing={domain,inventory,firstPrice,renewalPrice:renewal};
    selectedYears=1;
    if(termPanel){
      termPanel.hidden=false;
      renderTermPricing(1);
    }

    const premiumNote=document.getElementById('domain-premium-note');
    premiumNote.hidden=inventory!=='PREMIUM';
    if(inventory==='PREMIUM'){
      const note=premiumNote.querySelector('span');
      if(note)note.textContent='This is a premium domain, so its customer price is higher than standard domains.';
    }

    updatePurchaseButton(true);
    if(window.lucide)lucide.createIcons();
    if(scrollToResult)result.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function renderTermPricing(years){
    if(!termPanel||!activePricing)return;
    const first=activePricing.firstPrice;
    const renewal=activePricing.renewalPrice;
    const canMultiYear=first&&typeof first.value==='number'&&renewal&&typeof renewal.value==='number'&&(first.currencyCode||'USD')===(renewal.currencyCode||'USD');

    termPanel.querySelectorAll('[data-domain-years]').forEach(termButton=>{
      const value=Number(termButton.dataset.domainYears)||1;
      const active=value===years;
      termButton.classList.toggle('active',active);
      termButton.setAttribute('aria-pressed',active?'true':'false');
      termButton.disabled=value>1&&!canMultiYear;
    });

    const totalEl=document.getElementById('domain-term-total');
    const breakdownEl=document.getElementById('domain-term-breakdown');
    if(!first||typeof first.value!=='number'){
      if(totalEl)totalEl.textContent='—';
      if(breakdownEl)breakdownEl.textContent='Final registration total will be confirmed before payment.';
      return;
    }

    const currencyCode=first.currencyCode||'USD';
    const renewalValue=renewal&&typeof renewal.value==='number'?renewal.value:null;
    const totalValue=years===1
      ? first.value
      : renewalValue===null
        ? null
        : first.value+(renewalValue*(years-1));

    if(totalEl)totalEl.textContent=totalValue===null?'—':formatMoney({currencyCode,value:totalValue});
    if(breakdownEl){
      if(years===1){
        breakdownEl.textContent=`1 year at ${formatMoney(first)}. Renewal pricing is shown above.`;
      }else if(totalValue!==null){
        breakdownEl.textContent=`${formatMoney(first)} for year 1 + ${years-1} year${years-1===1?'':'s'} at ${formatMoney(renewal)} each. Final quote confirmed before payment.`;
      }else{
        breakdownEl.textContent='Multi-year pricing will be confirmed before payment.';
      }
    }
    updatePurchaseButton(true);
  }

  function updatePurchaseButton(available){
    const next=document.getElementById('domain-next-button');
    if(!next)return;
    next.hidden=!available;
    next.disabled=true;
    next.innerHTML=available
      ? `<i data-lucide="shopping-bag" size="18"></i> Continue with ${selectedYears} year${selectedYears===1?'':'s'}`
      : '';
    if(window.lucide)lucide.createIcons();
  }

  function formatMoney(money){
    if(!money||typeof money.value!=='number')return 'Price unavailable';
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