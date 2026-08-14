(function(){
  const track=document.querySelector('[data-flow-live-track]');
  const tabs=[...document.querySelectorAll('[data-flow-live-tab]')];
  const dots=[...document.querySelectorAll('[data-flow-live-dot]')];
  const toast=document.getElementById('flow-demo-toast');
  const qr=document.getElementById('flow-qr-modal');
  let index=0;
  let settleTimer=null;

  function normalizeActionLabels(){
    document.querySelectorAll('.flow-action').forEach(button=>{
      if(button.querySelector('.flow-action-label'))return;
      const textNode=[...button.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
      if(!textNode)return;
      const label=document.createElement('span');
      label.className='flow-action-label';
      label.textContent=textNode.textContent.trim();
      textNode.replaceWith(label);
    });
    const style=document.createElement('style');
    style.textContent='.flow-action-label{display:block!important;color:#18335f!important;font-size:.7rem!important;font-weight:900!important;line-height:1.15!important;white-space:nowrap}.flow-action{overflow:visible!important}';
    document.head.appendChild(style);
  }

  function notify(message){
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__flowDemoToast);
    window.__flowDemoToast=setTimeout(()=>toast.classList.remove('show'),2200);
  }
  function sync(next,scroll=true){
    index=Math.max(0,Math.min(tabs.length-1,next));
    tabs.forEach((tab,i)=>tab.classList.toggle('active',i===index));
    dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));
    tabs[index]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    if(scroll&&track)track.scrollTo({left:index*track.clientWidth,behavior:'smooth'});
  }
  normalizeActionLabels();
  tabs.forEach((tab,i)=>tab.addEventListener('click',()=>sync(i,true)));
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>sync(i,true)));
  track?.addEventListener('scroll',()=>{
    clearTimeout(settleTimer);
    settleTimer=setTimeout(()=>{
      const width=track.clientWidth||1;
      sync(Math.round(track.scrollLeft/width),false);
    },80);
  },{passive:true});
  window.addEventListener('resize',()=>track?.scrollTo({left:index*track.clientWidth,behavior:'auto'}));

  document.querySelectorAll('[data-demo-action]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.demoAction;
    if(action==='share'&&navigator.share){navigator.share({title:'Maya Bennett — Nova Luxe Realty',text:'Flow demo by LIW Cards',url:location.href}).catch(()=>{});return;}
    if(action==='qr'){qr?.showModal();return;}
    if(action==='save'){
      const vcard=['BEGIN:VCARD','VERSION:3.0','FN:Maya Bennett','ORG:Nova Luxe Realty','TITLE:Luxury Real Estate Advisor','TEL:+17185550148','EMAIL:hello@novaluxerealty.com','END:VCARD'].join('\n');
      const blob=new Blob([vcard],{type:'text/vcard'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='maya-bennett.vcf';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);notify('Demo contact ready to save.');return;
    }
    const messages={call:'Demo call action',email:'Demo email action',website:'Demo website action',directions:'Demo directions action'};
    notify(messages[action]||'Demo action');
  }));
  document.querySelector('[data-flow-qr-close]')?.addEventListener('click',()=>qr?.close());
  sync(0,false);
  if(window.lucide)lucide.createIcons();
})();