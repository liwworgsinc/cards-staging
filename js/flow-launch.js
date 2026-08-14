(function(){
  const root=document.querySelector('[data-flow-home-demo]');
  if(!root)return;
  const track=root.querySelector('[data-flow-track]');
  const tabs=[...root.querySelectorAll('[data-flow-tab]')];
  const dots=[...root.querySelectorAll('[data-flow-dot]')];
  const actions=[...root.querySelectorAll('.flow-home-action')];
  let index=0;
  let timer=null;
  let visible=true;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function normalizeActionLabels(){
    actions.forEach(action=>{
      if(action.querySelector('.flow-home-action-label'))return;
      const textNode=[...action.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
      if(!textNode)return;
      const label=document.createElement('span');
      label.className='flow-home-action-label';
      label.textContent=textNode.textContent.trim();
      textNode.replaceWith(label);
    });
    if(!document.getElementById('flow-home-label-fix')){
      const style=document.createElement('style');
      style.id='flow-home-label-fix';
      style.textContent='.flow-home-action-label{display:block!important;margin-top:0;color:#16264a!important;font-size:.62rem!important;font-weight:850!important;line-height:1.15!important;white-space:nowrap;opacity:1!important;visibility:visible!important}.flow-home-action{transform:none!important}';
      document.head.appendChild(style);
    }
  }

  function show(next,user=false){
    index=(next+tabs.length)%tabs.length;
    if(track)track.style.transform=`translateX(-${index*100}%)`;
    tabs.forEach((tab,i)=>tab.classList.toggle('active',i===index));
    dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));
    // Keep quick actions fixed in place. The older nudge animation clipped labels
    // on narrow phones once the Flow section became active while scrolling.
    actions.forEach(action=>{action.style.transform='none';});
    if(user)restart();
  }
  function restart(){
    if(timer)clearInterval(timer);
    if(reduced||!visible)return;
    timer=setInterval(()=>show(index+1),2600);
  }
  normalizeActionLabels();
  tabs.forEach((tab,i)=>tab.addEventListener('click',()=>show(i,true)));
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting);
      restart();
    },{threshold:.2});
    observer.observe(root);
  }
  if(window.lucide)lucide.createIcons();
  show(0);
  restart();
})();
