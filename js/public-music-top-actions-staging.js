/* LIW Cards staging — Music-only top Share + QR actions. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_TOP_ACTIONS__)return;
  window.__LIW_MUSIC_TOP_ACTIONS__=true;

  function data(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function artistName(){return String(document.getElementById('name')?.textContent||data()?.full_name||'Artist').trim()||'Artist';}
  function slug(){return String(data()?.slug||new URLSearchParams(location.search).get('slug')||'').trim();}
  function cardUrl(){
    try{
      const u=new URL(location.href);u.hash='';u.search='';
      if(slug())u.searchParams.set('slug',slug());
      return u.href;
    }catch(_){return location.href;}
  }
  function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function closeDialog(dialog){if(!dialog)return;try{if(dialog.open&&typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}catch(_){dialog.removeAttribute('open');}}
  function showDialog(dialog){if(!dialog)return;try{if(!dialog.open&&typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}catch(_){dialog.setAttribute('open','');}}
  async function copyLink(){
    const value=cardUrl();
    try{await navigator.clipboard.writeText(value);window.toast?.('Artist card link copied');return true;}catch(_){
      try{const ta=document.createElement('textarea');ta.value=value;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();window.toast?.('Artist card link copied');return true;}catch(__){return false;}
    }
  }

  function ensureStyle(){
    if(document.getElementById('music-top-actions-style'))return;
    const s=document.createElement('style');s.id='music-top-actions-style';s.textContent=`
      .music-card-active .public-top-actions{z-index:80!important;pointer-events:auto!important}
      .music-card-active .public-top-actions .public-round-btn{pointer-events:auto!important;cursor:pointer!important}
      .music-fan-share-dialog,.music-home-save-dialog{border:0;padding:0;background:transparent;max-width:none}
      .music-fan-share-dialog::backdrop,.music-home-save-dialog::backdrop{background:rgba(0,0,0,.72);backdrop-filter:blur(7px)}
      .music-fan-panel,.music-home-save-panel{width:min(92vw,430px);box-sizing:border-box;padding:18px;border:1px solid rgba(163,130,255,.28);border-radius:22px;background:radial-gradient(circle at 90% 0,rgba(123,61,255,.2),transparent 34%),linear-gradient(155deg,#111522,#070910);color:#fff;box-shadow:0 30px 80px rgba(0,0,0,.5)}
      .music-fan-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px}.music-fan-head small{display:block;color:#a99dce;font-size:.62rem;font-weight:900;letter-spacing:.12em}.music-fan-head h2,.music-home-save-panel h2{margin:4px 0 0;font-size:1.2rem}.music-fan-close{width:34px;height:34px;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:#151928;color:#fff;font-size:1.25rem;cursor:pointer}
      .music-fan-actions{display:grid;gap:8px}.music-fan-action{width:100%;display:grid;grid-template-columns:42px minmax(0,1fr) 18px;align-items:center;gap:10px;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.035);color:#fff;text-align:left;cursor:pointer}.music-fan-action:hover{border-color:rgba(142,94,255,.5)}.music-fan-action-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(145deg,rgba(169,49,255,.24),rgba(55,103,255,.18));color:#b879ff}.music-fan-action strong{display:block;font-size:.78rem}.music-fan-action small{display:block;margin-top:2px;color:#9098ad;font-size:.62rem}.music-fan-action>svg{color:#737d95}
      .music-home-save-panel p{margin:8px 0 12px;color:#aab1c4;font-size:.76rem;line-height:1.5}.music-home-save-panel ol{margin:0 0 14px;padding-left:20px;color:#e7e9f4;font-size:.75rem;line-height:1.65}.music-home-save-panel .btn{width:100%}
    `;document.head.appendChild(s);
  }

  function homeSteps(){
    const ua=navigator.userAgent;
    if(/iphone|ipad|ipod/i.test(ua))return ['Open this artist card in Safari.','Tap Safari Share.','Choose Add to Home Screen, then tap Add.'];
    if(/android/i.test(ua))return ['Open your browser menu (⋮).','Choose Add to Home screen or Install app.','Confirm Add or Install.'];
    return ['Open your browser menu.','Choose Install app, Install page as app, or Add to Home Screen.','Confirm the shortcut.'];
  }
  function openHomeSave(){
    let d=document.getElementById('music-home-save-dialog');
    if(!d){d=document.createElement('dialog');d.id='music-home-save-dialog';d.className='music-home-save-dialog';document.body.appendChild(d);}
    d.innerHTML=`<div class="music-home-save-panel"><h2>Add ${esc(artistName())} to Home Screen</h2><p>Keep this artist card one tap away on your phone.</p><ol>${homeSteps().map(x=>`<li>${x}</li>`).join('')}</ol><button type="button" class="btn btn-primary" data-music-home-done>Got it</button></div>`;
    d.querySelector('[data-music-home-done]')?.addEventListener('click',()=>closeDialog(d));
    d.onclick=e=>{if(e.target===d)closeDialog(d);};
    showDialog(d);
    try{window.track?.('home_screen_save_click',null,{experience:'music',entry:'top_share_menu'});}catch(_){ }
  }
  async function nativeShare(dialog){
    closeDialog(dialog);const url=cardUrl();
    try{
      if(navigator.share){await navigator.share({title:artistName(),text:`Connect with ${artistName()}`,url});window.track?.('share_click',null,{experience:'music',method:'native_share'});}
      else await copyLink();
    }catch(_){ }
  }
  function openShare(){
    ensureStyle();
    let d=document.getElementById('music-fan-share-dialog');
    if(!d){d=document.createElement('dialog');d.id='music-fan-share-dialog';d.className='music-fan-share-dialog';document.body.appendChild(d);}
    d.innerHTML=`<div class="music-fan-panel"><div class="music-fan-head"><div><small>ARTIST CARD</small><h2>Share ${esc(artistName())}</h2></div><button type="button" class="music-fan-close" aria-label="Close">×</button></div><div class="music-fan-actions"><button type="button" class="music-fan-action" data-music-native-share><span class="music-fan-action-icon"><i data-lucide="share-2" size="23"></i></span><span><strong>Share card</strong><small>Text, email, WhatsApp and more</small></span><i data-lucide="chevron-right" size="18"></i></button><button type="button" class="music-fan-action" data-music-copy><span class="music-fan-action-icon"><i data-lucide="copy" size="23"></i></span><span><strong>Copy link</strong><small>Copy this artist card link</small></span><i data-lucide="chevron-right" size="18"></i></button><button type="button" class="music-fan-action" data-music-home><span class="music-fan-action-icon"><i data-lucide="smartphone" size="24"></i></span><span><strong>Add to Home Screen</strong><small>Save this artist one tap away</small></span><i data-lucide="chevron-right" size="18"></i></button></div></div>`;
    d.querySelector('.music-fan-close')?.addEventListener('click',()=>closeDialog(d));
    d.querySelector('[data-music-native-share]')?.addEventListener('click',()=>nativeShare(d));
    d.querySelector('[data-music-copy]')?.addEventListener('click',async()=>{if(await copyLink())closeDialog(d);});
    d.querySelector('[data-music-home]')?.addEventListener('click',()=>{closeDialog(d);openHomeSave();});
    d.onclick=e=>{if(e.target===d)closeDialog(d);};
    showDialog(d);if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }
  function openQr(){
    ensureStyle();const d=document.getElementById('qr-dialog');if(!d)return;
    showDialog(d);try{window.track?.('qr_scan',null,{experience:'music',entry:'top_action'});}catch(_){ }
  }

  document.addEventListener('click',event=>{
    if(!isMusic())return;
    const share=event.target instanceof Element?event.target.closest('#share-top'):null;
    const qr=event.target instanceof Element?event.target.closest('#qr-top'):null;
    if(!share&&!qr)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(share)openShare();else openQr();
  },true);

  let tries=0;const timer=setInterval(()=>{
    tries+=1;if(!isMusic()){if(tries>100)clearInterval(timer);return;}
    ensureStyle();const share=document.getElementById('share-top');const qr=document.getElementById('qr-top');
    if(share){share.setAttribute('aria-label','Share artist card or add to Home Screen');share.title='Share / Add to Home Screen';}
    if(qr){qr.setAttribute('aria-label','Show artist card QR code');qr.title='Show QR code';}
    if(share&&qr&&tries>12)clearInterval(timer);
  },100);
})();