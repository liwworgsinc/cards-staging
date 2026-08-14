(function(){
  'use strict';

  const raw=new URLSearchParams(location.search).get('external_host');
  if(!raw)return;

  let externalUrl='';
  try{
    const parsed=new URL(raw);
    if(!['http:','https:'].includes(parsed.protocol))return;
    externalUrl=parsed.href.slice(0,2048);
  }catch(_){return;}

  function notify(message){
    const el=document.getElementById('toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(window.__externalHostToastTimer);
    window.__externalHostToastTimer=setTimeout(()=>el.classList.remove('show'),2800);
  }

  function patchQr(){
    const qr=document.getElementById('qr');
    if(!qr?.src)return;
    try{
      const url=new URL(qr.src);
      if(url.searchParams.has('data')){
        url.searchParams.set('data',externalUrl);
        qr.src=url.toString();
      }
    }catch(_){}
  }

  function patchActions(){
    const card=document.getElementById('card');
    if(!card||card.hidden)return false;

    patchQr();

    const share=document.getElementById('share-top');
    if(share){
      share.onclick=async()=>{
        const name=document.getElementById('name')?.textContent?.trim()||'Digital business card';
        const data={title:name,text:`Connect with ${name}`,url:externalUrl};
        try{
          if(navigator.share)await navigator.share(data);
          else await navigator.clipboard.writeText(externalUrl);
          if(typeof window.track==='function')window.track('share_click',null,{external_host:true});
          notify(navigator.share?'Share sheet opened':'Card link copied');
        }catch(_){}
      };
    }

    const copy=document.getElementById('copy-link');
    if(copy){
      copy.onclick=async()=>{
        try{
          await navigator.clipboard.writeText(externalUrl);
          if(typeof window.track==='function')window.track('share_click',null,{external_host:true});
          notify('Card link copied');
        }catch(_){notify('Could not copy the card link');}
      };
    }

    return true;
  }

  if(patchActions())return;

  const observer=new MutationObserver(()=>{
    if(patchActions())observer.disconnect();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  setTimeout(()=>observer.disconnect(),15000);
})();
