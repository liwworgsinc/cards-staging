/* LIW Cards staging — Super Studio V7 stability hotfix.
   Repairs app screens and keeps profession icon/label synced in full and compact headers.
   Freeze guard: avoid self-triggering DOM repair loops in the editor/public preview. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_STABILITY_HOTFIX_V7__)return;
  window.__LIW_SUPER_STUDIO_STABILITY_HOTFIX_V7__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const professionCache=new Map();
  let lastPublicCardId='';
  const PROFESSION_ICONS={barber:'scissors','hair-stylist':'paintbrush',braider:'waves',loctician:'waves','nail-tech':'hand','makeup-artist':'sparkles','lash-tech':'eye','brow-artist':'eye',esthetician:'flower-2','tattoo-artist':'pen-tool',piercer:'circle-dot','massage-therapist':'heart-pulse',salon:'store',spa:'flower-2',other:'sparkles'};

  function professionLabel(key){return window.LIWSuperStudio?.PROFESSIONS?.[key]?.label||'';}
  function professionIcon(key){return PROFESSION_ICONS[key]||'sparkles';}
  function keyFromLabel(label){const wanted=String(label||'').trim().toLowerCase();if(!wanted)return '';return Object.entries(window.LIWSuperStudio?.PROFESSIONS||{}).find(([,item])=>String(item?.label||'').trim().toLowerCase()===wanted)?.[0]||'';}
  function currentEditorProfession(){try{const value=window.LIWSuperStudioEditor?.getState?.()?.studioProfession;if(value)return value;}catch(_){}const select=q('#super-studio-control-center [data-ss-path="studioProfession"]');return select?.value||'';}
  function publicCardId(){if(lastPublicCardId)return lastPublicCardId;try{if(typeof publicCard!=='undefined'&&publicCard?.id)return publicCard.id;}catch(_){}try{if(window.publicCard?.id)return window.publicCard.id;}catch(_){}const params=new URLSearchParams(location.search);return params.get('id')||params.get('card_id')||'';}
  function publicClient(){try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return null;}}
  function resolving(chip,on){if(!chip)return;chip.classList.toggle('ss-profession-resolving',on);chip.style.visibility='';if(on)chip.setAttribute('aria-busy','true');else chip.removeAttribute('aria-busy');}

  function professionChipIsCurrent(chip,key,label){
    if(!chip)return false;
    const text=q('span',chip)?.textContent||'';
    const hasIcon=!!q('svg,i[data-lucide]',chip);
    return chip.dataset.ssProfession===key&&text===label&&hasIcon;
  }

  function renderProfessionChip(chip,key,label){
    if(!chip)return;
    if(professionChipIsCurrent(chip,key,label)){resolving(chip,false);return;}
    chip.dataset.ssProfession=key;
    chip.innerHTML=`<i data-lucide="${professionIcon(key)}" aria-hidden="true"></i><span>${label}</span>`;
    resolving(chip,false);
    if(window.lucide)try{lucide.createIcons({nodes:[chip]});}catch(_){try{lucide.createIcons();}catch(__){}}
  }

  function setProfession(root,key){
    if(!root||!key)return false;
    const label=professionLabel(key);if(!label)return false;
    root.dataset.ssResolvedProfession=key;
    renderProfessionChip(q('.ss-brand-chip:not(.ss-compact-profession)',root),key,label);
    renderProfessionChip(q('.ss-compact-profession',root),key,label);
    return true;
  }

  async function resolveProfession(root){
    if(!root||root.dataset.ssProfessionResolving==='true')return;
    const editorKey=currentEditorProfession();if(editorKey){setProfession(root,editorKey);return;}
    const chip=q('.ss-brand-chip:not(.ss-compact-profession)',root);
    const visibleKey=keyFromLabel(chip?.textContent||'');
    if(visibleKey&&visibleKey!=='other'){setProfession(root,visibleKey);return;}
    const cardId=publicCardId();if(!cardId){if(visibleKey)setProfession(root,visibleKey);return;}
    if(professionCache.has(cardId)){setProfession(root,professionCache.get(cardId));return;}
    const client=publicClient();if(!client)return;
    root.dataset.ssProfessionResolving='true';resolving(chip,true);
    try{
      const {data,error}=await client.from('super_studio_state_staging').select('data').eq('card_id',cardId).maybeSingle();
      if(error)throw error;
      const key=String(data?.data?.studioProfession||'').trim()||visibleKey||'other';professionCache.set(cardId,key);setProfession(root,key);
    }catch(error){console.warn('[Super Studio profession repair]',error);if(visibleKey)setProfession(root,visibleKey);else resolving(chip,false);}
    finally{delete root.dataset.ssProfessionResolving;}
  }

  function moveWorkContent(root){
    const shell=q('.ss-app-shell',root),work=q('[data-ss-screen="work"]',shell);if(!shell||!work)return;
    const candidates=qa('[data-ss-section="featured"],[data-ss-section="work"],.ss-portfolio-support,.ss-portfolio-gallery-v3',root);
    candidates.forEach(node=>{if(node!==work&&!work.contains(node)&&!node.closest('.ss-app-nav'))work.appendChild(node);});
    qa('.ss-ba-list',root).forEach(list=>{const section=list.closest('.ss-section');if(section&&!work.contains(section))work.appendChild(section);});
    if(!q('.ss-section,.ss-featured-grid,.ss-work-grid,.ss-ba-list',work)&&!q('.ss-work-empty',work)){
      const empty=document.createElement('div');empty.className='ss-work-empty';empty.innerHTML='<i data-lucide="images"></i><strong>Work portfolio</strong><span>No portfolio photos have been added yet.</span>';work.appendChild(empty);
    }
  }
  function activateScreen(root,name){
    if(!root||!['home','services','work','more'].includes(name))return;
    moveWorkContent(root);root.dataset.ssActiveScreen=name;
    qa('.ss-app-screen',root).forEach(screen=>{const active=screen.dataset.ssScreen===name;screen.hidden=!active;screen.classList.toggle('is-active',active);screen.setAttribute('aria-hidden',active?'false':'true');});
    qa('[data-ss-app-screen]',root).forEach(button=>{const active=button.dataset.ssAppScreen===name;button.classList.toggle('is-active',active);button.setAttribute('aria-current',active?'page':'false');});
  }
  function repair(root){if(!root||!root.classList.contains('super-studio-experience'))return;moveWorkContent(root);void resolveProfession(root);activateScreen(root,root.dataset.ssActiveScreen||'home');if(window.lucide)try{lucide.createIcons({nodes:[root]});}catch(_){} }

  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-ss-app-screen]');if(!button)return;const root=button.closest('.super-studio-experience');if(!root)return;event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();activateScreen(root,button.dataset.ssAppScreen);},true);
  const syncProfession=event=>{if(!event.target?.matches?.('[data-ss-path="studioProfession"]'))return;const key=event.target.value;qa('.super-studio-experience').forEach(root=>setProfession(root,key));};
  document.addEventListener('input',syncProfession,true);document.addEventListener('change',syncProfession,true);
  document.addEventListener('liw:public-card-ready',event=>{const card=event.detail?.card;if(String(card?.card_experience||'').toLowerCase()==='super-studio'&&card?.id)lastPublicCardId=card.id;});
  document.addEventListener('liw:public-card-rendered',event=>{const card=event.detail?.card;if(String(card?.card_experience||'').toLowerCase()==='super-studio'&&card?.id)lastPublicCardId=card.id;queue();});

  let queued=false;
  const scan=()=>{queued=false;qa('.super-studio-experience').forEach(repair);};
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(scan);};
  const addsSuperStudioRoot=record=>Array.from(record.addedNodes||[]).some(node=>node?.nodeType===1&&(node.matches?.('.super-studio-experience')||node.querySelector?.('.super-studio-experience')));
  new MutationObserver(records=>{if(records.some(addsSuperStudioRoot))queue();}).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:editor-card-hydrated',queue);
  window.addEventListener('pageshow',queue);
  scan();
})();
