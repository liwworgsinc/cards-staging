(function(){
  'use strict';
  const raw=document.referrer||'';
  if(!raw)return;
  let external='';
  try{
    const parsed=new URL(raw);
    if(!['http:','https:'].includes(parsed.protocol)||parsed.origin===location.origin)return;
    parsed.hash='';
    external=parsed.href;
  }catch(_){return;}

  function apply(){
    const card=document.getElementById('card');
    if(!card||card.hidden)return false;
    const qr=document.getElementById('qr');
    if(qr?.src){
      try{
        const url=new URL(qr.src);
        if(url.searchParams.has('data')){
          url.searchParams.set('data',external);
          qr.src=url.toString();
        }
      }catch(_){}
    }
    const share=document.getElementById('share-top');
    if(share)share.onclick=async()=>{
      const name=document.getElementById('name')?.textContent?.trim()||'Digital business card';
      try{
        if(navigator.share)await navigator.share({title:name,text:`Connect with ${name}`,url:external});
        else await navigator.clipboard.writeText(external);
      }catch(_){}
    };
    const copy=document.getElementById('copy-link');
    if(copy)copy.onclick=()=>navigator.clipboard.writeText(external).catch(()=>{});
    return true;
  }

  if(apply())return;
  const card=document.getElementById('card');
  if(!card)return;
  const observer=new MutationObserver(()=>{if(apply())observer.disconnect();});
  observer.observe(card,{attributes:true,attributeFilter:['hidden']});
  setTimeout(()=>observer.disconnect(),12000);
})();
