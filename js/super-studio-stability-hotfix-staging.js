/* LIW Cards staging — Super Studio V4 stability hotfix.
   Fixes app-screen navigation, async profession label timing, and keeps repairs isolated to Super Studio. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_STABILITY_HOTFIX__)return;
  window.__LIW_SUPER_STUDIO_STABILITY_HOTFIX__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const professionCache=new Map();

  function professionLabel(key){
    const map=window.LIWSuperStudio?.PROFESSIONS||{};
    return map[key]?.label||'';
  }

  function currentEditorProfession(){
    try{
      const value=window.LIWSuperStudioEditor?.getState?.()?.studioProfession;
      if(value&&value!=='other')return value;
    }catch(_){}
    const select=q('#super-studio-control-center [data-ss-path="studioProfession"]');
    if(select?.value&&select.value!=='other')return select.value;
    return '';
  }

  function publicCardId(){
    try{
      if(typeof publicCard!=='undefined'&&publicCard?.id)return publicCard.id;
    }catch(_){}
    try{if(window.publicCard?.id)return window.publicCard.id;}catch(_){}
    return '';
  }

  function publicClient(){
    try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return null;}
  }

  function setProfession(root,key){
    if(!root||!key)return false;
    const label=professionLabel(key);
    if(!label)return false;
    root.dataset.ssResolvedProfession=key;
    const chip=q('.ss-brand-chip',root);
    if(chip){
      chip.textContent=label;
      chip.classList.remove('ss-profession-resolving');
      chip.removeAttribute('aria-busy');
    }
    return true;
  }

  async function resolveProfession(root){
    if(!root||root.dataset.ssProfessionResolving==='true')return;
    const editorKey=currentEditorProfession();
    if(editorKey){setProfession(root,editorKey);return;}

    const cardId=publicCardId();
    if(!cardId){
      const chip=q('.ss-brand-chip',root);
      if(chip&&String(chip.textContent||'').trim().toLowerCase()==='other'){
        chip.classList.add('ss-profession-resolving');
        chip.setAttribute('aria-busy','true');
      }
      return;
    }

    if(professionCache.has(cardId)){
      setProfession(root,professionCache.get(cardId));
      return;
    }

    const client=publicClient();
    if(!client)return;
    root.dataset.ssProfessionResolving='true';
    const chip=q('.ss-brand-chip',root);
    if(chip&&String(chip.textContent||'').trim().toLowerCase()==='other'){
      chip.classList.add('ss-profession-resolving');
      chip.setAttribute('aria-busy','true');
    }
    try{
      const {data,error}=await client.from('super_studio_state_staging').select('data').eq('card_id',cardId).maybeSingle();
      if(error)throw error;
      const key=String(data?.data?.studioProfession||'').trim();
      if(key){professionCache.set(cardId,key);setProfession(root,key);}
    }catch(error){console.warn('[Super Studio profession repair]',error);}
    finally{delete root.dataset.ssProfessionResolving;}
  }

  function moveWorkContent(root){
    const shell=q('.ss-app-shell',root);
    const work=q('[data-ss-screen="work"]',shell);
    if(!shell||!work)return;

    const candidates=qa('[data-ss-section="featured"],[data-ss-section="work"],.ss-portfolio-support,.ss-portfolio-gallery-v3',root);
    candidates.forEach(node=>{
      if(node===work||work.contains(node)||node.closest('.ss-app-nav'))return;
      work.appendChild(node);
    });

    // Before/after belongs with visual work as well. Move its section, not only the inner slider.
    qa('.ss-ba-list',root).forEach(list=>{
      const section=list.closest('.ss-section');
      if(section&&!work.contains(section))work.appendChild(section);
    });
  }

  function activateScreen(root,name){
    if(!root||!['home','services','work','more'].includes(name))return;
    moveWorkContent(root);
    root.dataset.ssActiveScreen=name;
    qa('.ss-app-screen',root).forEach(screen=>{
      const active=screen.dataset.ssScreen===name;
      screen.hidden=!active;
      screen.classList.toggle('is-active',active);
      screen.setAttribute('aria-hidden',active?'false':'true');
    });
    qa('[data-ss-app-screen]',root).forEach(button=>{
      const active=button.dataset.ssAppScreen===name;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-current',active?'page':'false');
    });

    const active=q(`.ss-app-screen[data-ss-screen="${name}"]`,root);
    if(active){
      active.removeAttribute('inert');
      // Keep navigation stable. Do not scroll the whole page back to the hero.
      const scrollable=active.closest('.ss-body')||active;
      try{scrollable.scrollTop=0;}catch(_){}
    }
  }

  function repair(root){
    if(!root||!root.classList.contains('super-studio-experience'))return;
    moveWorkContent(root);
    void resolveProfession(root);
    const active=root.dataset.ssActiveScreen||'home';
    activateScreen(root,active);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-ss-app-screen]');
    if(!button)return;
    const root=button.closest('.super-studio-experience');
    if(!root)return;
    event.preventDefault();
    event.stopPropagation();
    activateScreen(root,button.dataset.ssAppScreen);
  },true);

  document.addEventListener('input',event=>{
    if(event.target?.matches?.('[data-ss-path="studioProfession"]')){
      const key=event.target.value;
      qa('.super-studio-experience').forEach(root=>setProfession(root,key));
    }
  },true);
  document.addEventListener('change',event=>{
    if(event.target?.matches?.('[data-ss-path="studioProfession"]')){
      const key=event.target.value;
      qa('.super-studio-experience').forEach(root=>setProfession(root,key));
    }
  },true);

  let queued=false;
  const scan=()=>{
    queued=false;
    qa('.super-studio-experience').forEach(repair);
  };
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(scan);};
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-rendered',queue);
  document.addEventListener('liw:editor-card-hydrated',queue);
  window.addEventListener('pageshow',queue);
  scan();
})();
