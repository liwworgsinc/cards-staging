/* LIW Cards staging — Music-only grid label preference.
   Keeps labels by default. When the artist turns them off in Dressing Room,
   the 3x3 launcher becomes an icon-first app grid with larger icons.
   Also moves the existing Classic Share/QR controls out of the Music cover
   stacking context so the exact Classic handlers remain tappable, and adds
   a Music-only Save-to-Home-Screen top action for fans. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_GRID_LABELS__)return;
  window.__LIW_MUSIC_GRID_LABELS__=true;

  let showLabels=true;
  let loaded=false;
  let previewShareProbeStarted=false;

  function cardData(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(cardData()?.card_experience||'').toLowerCase()==='music';}
  function isEditorPreview(){return new URLSearchParams(location.search).get('editor_preview')==='1';}

  function unlockExactPreviewActions(){
    if(!isEditorPreview())return;
    if(!document.getElementById('music-preview-actions-unlock')){
      const style=document.createElement('style');
      style.id='music-preview-actions-unlock';
      style.textContent=`
        #share-top,#qr-top,#music-save-home-top,#qr-dialog,#qr-dialog *,
        #safe-card-share-dialog,#safe-card-share-dialog *,
        #safe-card-home-dialog,#safe-card-home-dialog *{
          pointer-events:auto!important;
        }
      `;
      document.head.appendChild(style);
    }
    try{
      const frame=window.frameElement;
      if(frame){
        const allow=String(frame.getAttribute('allow')||'');
        if(!/web-share/i.test(allow))frame.setAttribute('allow',`${allow}${allow.trim()?'; ':''}web-share; clipboard-write`);
        const sandbox=String(frame.getAttribute('sandbox')||'');
        if(sandbox&&!/allow-modals/i.test(sandbox))frame.setAttribute('sandbox',`${sandbox} allow-modals`);
      }
    }catch(_){ }
  }

  function enableClassicShareHomeForPreview(){
    if(!isEditorPreview()||previewShareProbeStarted||!isMusic())return;
    const card=document.getElementById('card');
    const banner=document.getElementById('preview-banner');
    if(!card||card.hidden||!banner)return;
    previewShareProbeStarted=true;
    const originalHidden=banner.hidden;
    const started=Date.now();
    banner.hidden=true;
    const timer=setInterval(()=>{
      const ready=document.documentElement.classList.contains('safe-card-share-home-active');
      if(ready||Date.now()-started>2800){
        clearInterval(timer);
        banner.hidden=originalHidden;
      }
    },100);
  }

  function openSaveHome(){
    if(!isMusic())return;
    enableClassicShareHomeForPreview();

    const launch=()=>{
      if(!document.documentElement.classList.contains('safe-card-share-home-active'))return false;
      const share=document.getElementById('share-top');
      if(!share)return false;
      share.click();
      const home=document.querySelector('#safe-card-share-dialog [data-safe-share-home]');
      if(home&&home.hidden){
        window.toast?.('This artist is already on your Home Screen.');
        return true;
      }
      if(home){
        home.click();
        return true;
      }
      return false;
    };

    if(launch())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(launch()||attempts>=36){
        clearInterval(timer);
        if(attempts>=36)window.toast?.('Use Share → Add to Home Screen.');
      }
    },75);
  }

  function mountClassicTopActions(){
    if(!isMusic())return false;
    const card=document.querySelector('.music-card-active');
    const actions=document.querySelector('.public-top-actions');
    if(!card||!actions)return false;
    if(actions.parentElement!==card)card.appendChild(actions);
    actions.classList.add('music-classic-top-actions');

    let save=actions.querySelector('#music-save-home-top');
    if(!save){
      save=document.createElement('button');
      save.type='button';
      save.id='music-save-home-top';
      save.className='public-round-btn music-save-home-top';
      save.setAttribute('aria-label','Save artist to Home Screen');
      save.title='Save to Home Screen';
      save.innerHTML='<i data-lucide="bookmark-plus" size="19"></i>';
      save.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        openSaveHome();
      });
      actions.appendChild(save);
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }

    unlockExactPreviewActions();
    return true;
  }

  function apply(){
    if(!isMusic())return false;
    const card=document.querySelector('.music-card-active');
    const launcher=card?.querySelector('.music-luxe-launcher');
    mountClassicTopActions();
    enableClassicShareHomeForPreview();
    if(!card||!launcher)return false;

    launcher.classList.toggle('music-grid-icon-only',!showLabels);
    card.classList.toggle('music-grid-labels-off',!showLabels);
    launcher.querySelectorAll('.music-luxe-tile').forEach(button=>{
      const text=String(button.querySelector('strong')?.textContent||'').trim();
      if(text)button.setAttribute('aria-label',text);
    });
    return true;
  }

  async function loadPreference(){
    if(loaded)return;
    const data=cardData();
    if(!data||!isMusic()||typeof supabaseClient==='undefined'||!supabaseClient)return;
    loaded=true;
    const slug=String(data.slug||new URLSearchParams(location.search).get('slug')||'').trim();
    if(!slug)return;
    try{
      const {data:settings,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});
      if(error)throw error;
      showLabels=settings?.grid_labels!==false;
    }catch(error){
      showLabels=true;
      console.warn('[LIW Music] Grid label preference unavailable:',error);
    }
    apply();
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(!loaded)loadPreference();
    const actionsReady=mountClassicTopActions();
    if(actionsReady)enableClassicShareHomeForPreview();
    const done=loaded&&apply();
    if((done&&actionsReady&&attempts>18)||attempts>120)clearInterval(timer);
  },80);

  const observer=new MutationObserver(()=>{
    mountClassicTopActions();
    enableClassicShareHomeForPreview();
    if(loaded)apply();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  loadPreference();
})();