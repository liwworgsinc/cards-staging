(function(){
  const platformMeta={
    whatsapp:{label:'WhatsApp',icon:'message-circle'},
    sms:{label:'Text / SMS',icon:'message-square-text'},
    email:{label:'Email',icon:'mail'},
    facebook:{label:'Facebook',icon:'facebook'},
    linkedin:{label:'LinkedIn',icon:'linkedin'},
    x:{label:'X',icon:'at-sign'},
    instagram:{label:'Instagram',icon:'instagram'}
  };
  const platformOrder=['whatsapp','sms','email','facebook','linkedin','x','instagram'];

  function normalizePlatform(value){
    const key=String(value||'').trim().toLowerCase();
    if(['twitter','x-twitter'].includes(key))return 'x';
    if(['text','phone','sms_phone'].includes(key))return 'sms';
    return key;
  }

  function context(){
    const supplied=window.LIWEditorShareContext?.()||{};
    return {
      fullName:String(supplied.fullName||'').trim(),
      jobTitle:String(supplied.jobTitle||'').trim(),
      companyName:String(supplied.companyName||'').trim(),
      headline:String(supplied.headline||'').trim(),
      url:String(supplied.url||location.href).trim(),
      status:String(supplied.status||'draft').toLowerCase(),
      socialPlatforms:Array.isArray(supplied.socialPlatforms)?supplied.socialPlatforms.map(normalizePlatform).filter(Boolean):[]
    };
  }

  function sentence(value){
    const clean=String(value||'').replace(/\s+/g,' ').trim();
    if(!clean)return '';
    return /[.!?]$/.test(clean)?clean:`${clean}.`;
  }

  function buildMessage(data=context()){
    const intro=data.companyName
      ? `Check out my digital business card for ${data.companyName}.`
      : 'Check out my digital business card.';
    const identity=[data.fullName,data.jobTitle].filter(Boolean).join(' — ');
    const detail=sentence(data.headline||identity);
    return `${intro}${detail?` ${detail}`:''}\n\nSave my contact info and connect with me here:\n${data.url}`;
  }

  function shareTitle(data=context()){
    const owner=data.fullName||data.companyName||'My digital business card';
    return data.companyName&&data.fullName?`${data.fullName} | ${data.companyName}`:`${owner} | Digital Business Card`;
  }

  async function copyText(text,notice='Copied'){
    try{await navigator.clipboard.writeText(text);}
    catch(_){
      const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
    }
    if(typeof window.toast==='function')window.toast(notice);
  }

  function open(url){window.open(url,'_blank','noopener,noreferrer');}

  async function sharePlatform(key){
    const data=context();
    const message=buildMessage(data);
    const title=shareTitle(data);
    const textWithoutUrl=message.replace(data.url,'').trim();
    if(key==='whatsapp'){open(`https://wa.me/?text=${encodeURIComponent(message)}`);return;}
    if(key==='sms'){
      const separator=/iPad|iPhone|iPod/.test(navigator.userAgent)?'&':'?';
      location.href=`sms:${separator}body=${encodeURIComponent(message)}`;return;
    }
    if(key==='email'){location.href=`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`;return;}
    if(key==='x'){open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(textWithoutUrl)}&url=${encodeURIComponent(data.url)}`);return;}
    if(key==='facebook'){
      const shareUrl=`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`;
      const popup=window.open(shareUrl,'_blank');
      if(popup)try{popup.opener=null;}catch(_){}
      await copyText(message,popup?'Share message copied — paste it into Facebook if needed':'Share message copied — allow pop-ups and tap Facebook again');
      return;
    }
    if(key==='linkedin'){
      const shareUrl=`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}`;
      const popup=window.open(shareUrl,'_blank');
      if(popup)try{popup.opener=null;}catch(_){}
      await copyText(message,popup?'Share message copied — paste it into LinkedIn if needed':'Share message copied — allow pop-ups and tap LinkedIn again');
      return;
    }
    if(key==='instagram'){
      if(navigator.share){
        try{await navigator.share({title,text:textWithoutUrl,url:data.url});return;}catch(error){if(error?.name==='AbortError')return;}
      }
      await copyText(message,'Instagram caption copied — paste it into your post or story');
      open('https://www.instagram.com/');
    }
  }

  async function nativeShare(){
    const data=context();
    const message=buildMessage(data);
    const text=message.replace(data.url,'').trim();
    if(navigator.share){
      try{await navigator.share({title:shareTitle(data),text,url:data.url});return;}catch(error){if(error?.name==='AbortError')return;}
    }
    await copyText(message,'Share message copied');
  }

  function renderPlatforms(data){
    const container=document.getElementById('card-share-platforms');
    if(!container)return;
    const used=new Set(data.socialPlatforms.filter(key=>platformMeta[key]));
    const ordered=[...platformOrder.filter(key=>used.has(key)),...platformOrder.filter(key=>!used.has(key))];
    container.innerHTML=ordered.map(key=>{
      const meta=platformMeta[key];
      const usedOnCard=used.has(key);
      return `<button class="card-share-platform ${usedOnCard?'used-on-card':''}" data-card-share-platform="${key}" type="button"><i data-lucide="${meta.icon}" size="17"></i><span>${meta.label}</span>${usedOnCard?'<small>On your card</small>':''}</button>`;
    }).join('');
  }

  function refresh(options={}){
    const data=context();
    const published=typeof options.published==='boolean'?options.published:data.status==='published';
    const panel=document.getElementById('share-tools');
    if(!panel)return;
    panel.hidden=!published;
    if(!published)return;
    const message=document.getElementById('card-share-message-text');
    if(message)message.textContent=buildMessage(data);
    const summary=document.getElementById('card-share-summary');
    if(summary){
      const used=data.socialPlatforms.filter(key=>platformMeta[key]);
      summary.textContent=used.length
        ? 'Your message is ready. The social platforms already used on your card are shown first.'
        : 'Your message is ready. Choose any platform below, or use your phone’s Share button.';
    }
    renderPlatforms(data);
    if(window.lucide)lucide.createIcons();
  }

  function celebrate(){
    refresh({published:true});
    const panel=document.getElementById('share-tools');
    if(!panel)return;
    panel.classList.remove('share-celebrate');
    requestAnimationFrame(()=>panel.classList.add('share-celebrate'));
    setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'center'}),120);
    setTimeout(()=>panel.classList.remove('share-celebrate'),1000);
  }

  document.addEventListener('click',event=>{
    const platformButton=event.target.closest('[data-card-share-platform]');
    if(platformButton){sharePlatform(platformButton.dataset.cardSharePlatform);return;}
    if(event.target.closest('#copy-card-message')){copyText(buildMessage(),'Share message copied');return;}
    if(event.target.closest('#native-share-card')){nativeShare();return;}
  });

  window.LIWPostPublishShare={refresh,celebrate,buildMessage};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh());
  else refresh();
})();

// cards-staging: bridge guest-only draft extras into the authenticated editor.
(function loadGuestHandoffBridges(){
  const scripts=[
    ['editor-guest-photo-staging.js?v=20260825-funnel1','liw-editor-guest-photo'],
    ['editor-guest-product-staging.js?v=20260825-funnel1','liw-editor-guest-product']
  ];
  scripts.forEach(([src,key])=>{
    if(document.querySelector(`script[data-${key}]`))return;
    const script=document.createElement('script');
    script.src=`js/${src}`;
    script.defer=true;
    script.setAttribute(`data-${key}`,'true');
    document.head.appendChild(script);
  });
})();
