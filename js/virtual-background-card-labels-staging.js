/* LIW Cards — STAGING ONLY — Virtual Background enhancements */
(function(){
  'use strict';

  let customBackgroundImage=null;
  let customBackgroundName='';
  let originalDrawBase=null;

  function cardLabel(card){
    const company=String(card?.company_name||'').trim();
    const person=String(card?.full_name||'').trim();
    const fallback=String(card?.internal_label||'Untitled card').trim()||'Untitled card';
    const identity=[company,person].filter(Boolean).join(' · ')||fallback;
    const status=card?.status==='published'?'Published':'Draft';
    return `${identity} · ${status}`;
  }

  function syncCardLabels(){
    const select=document.getElementById('vb-card-select');
    if(!select)return;

    let cards=[];
    try{
      if(typeof virtualBackgroundState!=='undefined'&&Array.isArray(virtualBackgroundState.cards)){
        cards=virtualBackgroundState.cards;
      }
    }catch(_){return;}
    if(!cards.length)return;

    const selected=select.value;
    cards.forEach(card=>{
      const option=Array.from(select.options).find(item=>item.value===String(card.id));
      if(!option)return;
      const label=cardLabel(card);
      if(option.textContent!==label)option.textContent=label;
    });
    if(selected)select.value=selected;
  }

  function injectCustomBackgroundStyles(){
    if(document.querySelector('style[data-liw-vb-custom-bg]'))return;
    const style=document.createElement('style');
    style.dataset.liwVbCustomBg='true';
    style.textContent=`
      .vb-custom-upload{display:grid;gap:11px;padding:14px;border:1px solid #e6e9f1;border-radius:16px;background:#f9fafc}
      .vb-custom-drop{display:flex;align-items:center;gap:12px;padding:14px;border:1px dashed #cfd5e3;border-radius:14px;background:#fff;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease}
      .vb-custom-drop:hover,.vb-custom-drop.is-dragging{border-color:var(--primary,#0b1438);box-shadow:0 8px 20px rgba(11,20,56,.09);transform:translateY(-1px)}
      .vb-custom-drop-icon{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:12px;background:#eef0ff;color:#4d4ed8}
      .vb-custom-drop-copy{display:grid;gap:2px;min-width:0}.vb-custom-drop-copy strong{font-size:.88rem;color:#101828}.vb-custom-drop-copy small{font-size:.74rem;color:#667085;line-height:1.35}
      .vb-custom-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.vb-custom-name{font-size:.76rem;color:#667085;font-weight:700;overflow-wrap:anywhere}.vb-custom-name.active{color:#344054}
      .vb-custom-remove{min-height:36px;padding:0 11px;border:1px solid #dfe3eb;border-radius:10px;background:#fff;color:#344054;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.vb-custom-remove:hover{background:#f8f9fb}
      .vb-custom-privacy{display:flex;align-items:flex-start;gap:7px;color:#667085;font-size:.71rem;line-height:1.35}.vb-custom-privacy svg{flex:0 0 auto;margin-top:1px;color:#128a68}
      .vb-custom-badge{display:none;align-items:center;gap:6px;width:max-content;padding:6px 9px;border-radius:999px;background:#ecfdf3;color:#067647;font-size:.69rem;font-weight:800}.vb-custom-badge.show{display:inline-flex}
      @media(max-width:470px){.vb-custom-drop{align-items:flex-start}.vb-custom-meta{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function uploadSectionMarkup(){
    return `
      <div class="vb-section" data-liw-vb-custom-background>
        <div class="vb-section-head">
          <div><h3>Use your own background</h3><p>Upload your own image and keep your LIW card branding on top.</p></div>
          <span class="vb-custom-badge" id="vb-custom-badge"><i data-lucide="check" size="13"></i> Custom active</span>
        </div>
        <div class="vb-custom-upload">
          <label class="vb-custom-drop" id="vb-custom-drop" for="vb-custom-background-input">
            <span class="vb-custom-drop-icon"><i data-lucide="image-up" size="19"></i></span>
            <span class="vb-custom-drop-copy"><strong>Upload background image</strong><small>JPG, PNG, or WebP · 1920 × 1080 recommended · max 12 MB</small></span>
          </label>
          <input id="vb-custom-background-input" type="file" accept="image/jpeg,image/png,image/webp" hidden/>
          <div class="vb-custom-meta">
            <span class="vb-custom-name" id="vb-custom-background-name">No custom background selected</span>
            <button class="vb-custom-remove" id="vb-custom-background-remove" type="button" hidden><i data-lucide="trash-2" size="14"></i> Remove</button>
          </div>
          <div class="vb-custom-privacy"><i data-lucide="shield-check" size="14"></i><span>Your image stays in this browser session. LIW does not upload or store it.</span></div>
        </div>
      </div>`;
  }

  function injectCustomBackgroundSection(){
    if(document.querySelector('[data-liw-vb-custom-background]'))return;
    const templateButton=document.querySelector('[data-vb-template]');
    const templateSection=templateButton?.closest('.vb-section');
    if(!templateSection)return;
    templateSection.insertAdjacentHTML('afterend',uploadSectionMarkup());

    const input=document.getElementById('vb-custom-background-input');
    const drop=document.getElementById('vb-custom-drop');
    const remove=document.getElementById('vb-custom-background-remove');

    input?.addEventListener('change',event=>{
      const file=event.target.files?.[0];
      if(file)loadCustomBackground(file);
      event.target.value='';
    });

    remove?.addEventListener('click',clearCustomBackground);

    ['dragenter','dragover'].forEach(type=>drop?.addEventListener(type,event=>{
      event.preventDefault();
      drop.classList.add('is-dragging');
    }));
    ['dragleave','drop'].forEach(type=>drop?.addEventListener(type,event=>{
      event.preventDefault();
      drop.classList.remove('is-dragging');
    }));
    drop?.addEventListener('drop',event=>{
      const file=event.dataTransfer?.files?.[0];
      if(file)loadCustomBackground(file);
    });

    if(window.lucide)lucide.createIcons();
  }

  function setStatus(message,isError){
    try{
      if(typeof setVbStatus==='function')setVbStatus(message,Boolean(isError));
    }catch(_){/* no-op */}
  }

  function loadCustomBackground(file){
    if(!file)return;
    if(!/^image\/(jpeg|png|webp)$/i.test(String(file.type||''))){
      setStatus('Please upload a JPG, PNG, or WebP background.',true);
      return;
    }
    if(file.size>12*1024*1024){
      setStatus('Please keep your background image under 12 MB.',true);
      return;
    }

    setStatus('Loading your custom background…');
    const objectUrl=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{
      URL.revokeObjectURL(objectUrl);
      customBackgroundImage=image;
      customBackgroundName=file.name||'Custom background';
      syncCustomBackgroundUi();
      try{if(typeof renderVirtualBackground==='function')renderVirtualBackground();}catch(_){/* no-op */}
      setStatus('Custom background ready — your LIW card details and QR stay on top.');
    };
    image.onerror=()=>{
      URL.revokeObjectURL(objectUrl);
      setStatus('That background image could not be loaded. Try another image.',true);
    };
    image.src=objectUrl;
  }

  function clearCustomBackground(){
    customBackgroundImage=null;
    customBackgroundName='';
    syncCustomBackgroundUi();
    try{if(typeof renderVirtualBackground==='function')renderVirtualBackground();}catch(_){/* no-op */}
    setStatus('Custom background removed — using the selected LIW style again.');
  }

  function syncCustomBackgroundUi(){
    const name=document.getElementById('vb-custom-background-name');
    const remove=document.getElementById('vb-custom-background-remove');
    const badge=document.getElementById('vb-custom-badge');
    if(name){
      name.textContent=customBackgroundName||'No custom background selected';
      name.classList.toggle('active',Boolean(customBackgroundImage));
    }
    if(remove)remove.hidden=!customBackgroundImage;
    badge?.classList.toggle('show',Boolean(customBackgroundImage));
    if(window.lucide)lucide.createIcons();
  }

  function drawCover(ctx,image,x,y,width,height){
    const sourceWidth=image.naturalWidth||image.width||1;
    const sourceHeight=image.naturalHeight||image.height||1;
    const scale=Math.max(width/sourceWidth,height/sourceHeight);
    const drawWidth=sourceWidth*scale;
    const drawHeight=sourceHeight*scale;
    const drawX=x+(width-drawWidth)/2;
    const drawY=y+(height-drawHeight)/2;
    ctx.drawImage(image,drawX,drawY,drawWidth,drawHeight);
  }

  function applyReadabilityOverlay(ctx,width,height,template,accent,side){
    const right=side==='right';
    const light=template==='studio';
    const gradient=ctx.createLinearGradient(0,0,width,0);
    if(light){
      if(right){
        gradient.addColorStop(0,'rgba(255,255,255,.06)');
        gradient.addColorStop(.5,'rgba(255,255,255,.10)');
        gradient.addColorStop(1,'rgba(255,255,255,.82)');
      }else{
        gradient.addColorStop(0,'rgba(255,255,255,.82)');
        gradient.addColorStop(.5,'rgba(255,255,255,.10)');
        gradient.addColorStop(1,'rgba(255,255,255,.06)');
      }
    }else{
      if(right){
        gradient.addColorStop(0,'rgba(7,16,39,.05)');
        gradient.addColorStop(.5,'rgba(7,16,39,.16)');
        gradient.addColorStop(1,'rgba(7,16,39,.82)');
      }else{
        gradient.addColorStop(0,'rgba(7,16,39,.82)');
        gradient.addColorStop(.5,'rgba(7,16,39,.16)');
        gradient.addColorStop(1,'rgba(7,16,39,.05)');
      }
    }
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,width,height);

    if(template==='spotlight'){
      let rgba='rgba(91,92,240,.30)';
      try{
        if(typeof hexToVbRgba==='function')rgba=hexToVbRgba(accent,.30);
      }catch(_){/* fallback */}
      const gx=right?width*.87:width*.13;
      const glow=ctx.createRadialGradient(gx,height*.28,20,gx,height*.28,width*.28);
      glow.addColorStop(0,rgba);
      glow.addColorStop(1,'rgba(91,92,240,0)');
      ctx.fillStyle=glow;
      ctx.fillRect(0,0,width,height);
    }
  }

  function patchCanvasBase(){
    if(originalDrawBase)return;
    try{
      if(typeof drawVirtualBackgroundBase!=='function')return;
      originalDrawBase=drawVirtualBackgroundBase;
      drawVirtualBackgroundBase=function(ctx,width,height,template,accent,side){
        if(!customBackgroundImage){
          return originalDrawBase(ctx,width,height,template,accent,side);
        }
        ctx.clearRect(0,0,width,height);
        drawCover(ctx,customBackgroundImage,0,0,width,height);
        applyReadabilityOverlay(ctx,width,height,template,accent,side);
      };
    }catch(_){/* no-op */}
  }

  function boot(){
    injectCustomBackgroundStyles();
    injectCustomBackgroundSection();
    patchCanvasBase();
    syncCardLabels();

    const select=document.getElementById('vb-card-select');
    if(select){
      const observer=new MutationObserver(syncCardLabels);
      observer.observe(select,{childList:true,subtree:true});
    }

    setTimeout(()=>{injectCustomBackgroundSection();patchCanvasBase();syncCardLabels();},150);
    setTimeout(()=>{injectCustomBackgroundSection();patchCanvasBase();syncCardLabels();},600);
    setTimeout(()=>{injectCustomBackgroundSection();patchCanvasBase();syncCardLabels();},1400);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();