/* LIW Cards — cards-staging only: make Filled / Soft / Outline visibly selectable and live in the phone preview. */
(function(){
  const OPTIONS=[['filled','Filled'],['soft','Soft'],['outline','Outline']];
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const field=name=>q(`[name="${name}"]`);

  function injectStyles(){
    if(document.getElementById('liw-button-style-staging-css'))return;
    const style=document.createElement('style');
    style.id='liw-button-style-staging-css';
    style.textContent=`
      .liw-button-style-picker{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:2px}
      .liw-button-style-choice{position:relative;min-height:48px;border:1px solid #dfe3ea;border-radius:12px;background:#fff;color:#344054;font:inherit;font-size:.78rem;font-weight:850;cursor:pointer;transition:.15s ease}
      .liw-button-style-choice:hover{border-color:color-mix(in srgb,var(--primary,#0b1438) 45%,#dfe3ea);transform:translateY(-1px)}
      .liw-button-style-choice.is-active{border:2px solid var(--primary,#0b1438);background:color-mix(in srgb,var(--primary,#0b1438) 8%,#fff);color:var(--primary,#0b1438);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#0b1438) 10%,transparent)}
      .liw-button-style-choice.is-active:after{content:'✓';position:absolute;right:7px;top:5px;width:16px;height:16px;display:grid;place-items:center;border-radius:50%;background:var(--primary,#0b1438);color:#fff;font-size:.6rem}
      .liw-button-style-help{display:block;margin-top:6px;color:#667085;font-size:.7rem;line-height:1.35}
      @media(max-width:560px){.liw-button-style-picker{gap:6px}.liw-button-style-choice{min-height:44px;font-size:.72rem}}
    `;
    document.head.appendChild(style);
  }

  function styleValues(){
    return {
      style:String(field('button_style')?.value||'filled').toLowerCase(),
      color:String(field('button_color')?.value||field('primary_color')?.value||'#0b1438'),
      text:String(field('button_text_color')?.value||'#ffffff'),
      radius:`${Number(field('border_radius')?.value||16)}px`
    };
  }

  function paintButton(element,values){
    if(!element)return;
    element.style.borderRadius=values.radius;
    if(values.style==='outline'){
      element.style.background='transparent';
      element.style.border=`1px solid ${values.color}`;
      element.style.color=values.color;
      element.style.boxShadow='none';
    }else if(values.style==='soft'){
      element.style.background=`color-mix(in srgb, ${values.color} 14%, transparent)`;
      element.style.border=`1px solid color-mix(in srgb, ${values.color} 28%, transparent)`;
      element.style.color=values.color;
      element.style.boxShadow='none';
    }else{
      element.style.background=values.color;
      element.style.border='1px solid transparent';
      element.style.color=values.text;
    }
  }

  function previewTargets(){
    const phone=q('#phone-preview');
    if(!phone)return [];
    phone.dataset.buttonStyle=styleValues().style;
    const targets=[
      ...qa('.preview-save-contact',phone),
      ...qa('.preview-business-action.primary',phone),
      ...qa('.preview-payment-action',phone),
      ...qa('#preview-public-mirror .business-action.primary',phone),
      ...qa('#preview-public-mirror .business-action.payment-action',phone),
      ...qa('#preview-public-mirror .payment-share-button',phone),
      ...qa('#preview-public-mirror .primary-card-cta',phone)
    ];
    qa('.preview-business-action',phone).forEach(item=>{
      if(/make a payment/i.test(item.textContent||''))targets.push(item);
    });
    return [...new Set(targets)];
  }

  function syncPreview(){
    const values=styleValues();
    previewTargets().forEach(element=>paintButton(element,values));
  }

  function syncPicker(){
    const select=field('button_style');
    if(!select)return;
    const value=String(select.value||'filled');
    qa('[data-liw-button-style]').forEach(button=>{
      const active=button.dataset.liwButtonStyle===value;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function syncAll(){
    syncPicker();
    requestAnimationFrame(syncPreview);
    setTimeout(syncPreview,35);
    setTimeout(syncPreview,120);
  }

  function chooseStyle(value){
    const select=field('button_style');
    if(!select||select.value===value){syncAll();return;}
    select.value=value;
    select.dispatchEvent(new Event('input',{bubbles:true}));
    select.dispatchEvent(new Event('change',{bubbles:true}));
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof applyPreviewButtonStyles==='function')applyPreviewButtonStyles();}catch(_){ }
    try{window.LIWStagingPreviewMirror?.refresh?.();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    syncAll();
  }

  function mount(){
    const select=field('button_style');
    const group=select?.closest('.form-group');
    if(!select||!group)return false;
    if(group.querySelector('.liw-button-style-picker')){syncAll();return true;}
    injectStyles();
    const picker=document.createElement('div');
    picker.className='liw-button-style-picker';
    picker.setAttribute('role','group');
    picker.setAttribute('aria-label','Button style');
    picker.innerHTML=OPTIONS.map(([value,label])=>`<button type="button" class="liw-button-style-choice" data-liw-button-style="${value}" aria-pressed="false">${label}</button>`).join('');
    const help=document.createElement('small');
    help.className='liw-button-style-help';
    help.textContent='Your selection updates the live card preview immediately.';
    select.hidden=true;
    select.insertAdjacentElement('afterend',picker);
    picker.insertAdjacentElement('afterend',help);
    picker.querySelectorAll('[data-liw-button-style]').forEach(button=>button.addEventListener('click',()=>chooseStyle(button.dataset.liwButtonStyle)));
    select.addEventListener('change',syncAll);
    ['button_color','button_text_color','primary_color','border_radius'].forEach(name=>{
      field(name)?.addEventListener('input',syncAll);
      field(name)?.addEventListener('change',syncAll);
    });
    syncAll();
    return true;
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('.editor-tab[data-tab="design"],.design-advanced-details'))setTimeout(syncAll,0);
  });
  document.addEventListener('input',event=>{
    if(['button_style','button_color','button_text_color','primary_color','border_radius'].includes(event.target?.name))syncAll();
  });
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(mount()&&attempts>8)clearInterval(timer);
    if(attempts>50)clearInterval(timer);
  },250);
  mount();
  window.LIWButtonStyleStaging={refresh:syncAll};
})();
