(function(){
  const ENTITLEMENT='profile_border_color';
  let mounted=false;

  function currentAccess(){
    try{return typeof editorAccess!=='undefined'?editorAccess:null;}catch(_){return null;}
  }

  function isAllowed(){
    const access=currentAccess();
    return Boolean(access&&((access.isAdmin&&!access.isPlanPreview)||access.has?.(ENTITLEMENT)));
  }

  function hex(value){
    const normalized=String(value||'').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/.test(normalized)?normalized:'';
  }

  function hiddenField(){return document.querySelector('[name="profile_border_color"]');}
  function picker(){return document.getElementById('profile-border-custom');}
  function designColor(){return hex(document.querySelector('[name="primary_color"]')?.value)||'#ffffff';}

  function refreshUi(){
    const root=document.getElementById('profile-border-color-control');
    const stored=hex(hiddenField()?.value);
    const allowed=isAllowed();
    if(!root)return;

    root.classList.toggle('locked',!allowed);
    root.dataset.allowed=allowed?'true':'false';
    root.querySelectorAll('button,input[type="color"]').forEach(control=>{control.disabled=!allowed;});
    const badge=root.querySelector('[data-profile-border-badge]');
    if(badge){
      badge.className=`entitlement-badge ${allowed?'included':'locked'}`;
      badge.innerHTML=allowed?'<i data-lucide="circle-check" size="14"></i> Pro+ included':'<i data-lucide="lock" size="14"></i> Pro+';
    }
    if(!allowed&&hiddenField())hiddenField().value='';

    const display=stored||designColor();
    if(picker())picker().value=display;
    root.querySelectorAll('[data-profile-border-color]').forEach(button=>{
      button.classList.toggle('active',Boolean(stored)&&hex(button.dataset.profileBorderColor)===stored);
    });
    root.querySelector('[data-profile-border-auto]')?.classList.toggle('active',!stored);
    const code=root.querySelector('[data-profile-border-hex]');
    if(code)code.textContent=stored?stored.toUpperCase():'MATCH DESIGN';
    const ring=root.querySelector('[data-profile-border-preview]');
    if(ring)ring.style.setProperty('--profile-border-preview',stored||designColor());
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function apply(value){
    if(!isAllowed()){
      if(typeof toast==='function')toast('Profile border color is included with Pro and Agency plans.');
      return;
    }
    const field=hiddenField();
    if(!field)return;
    field.value=hex(value);
    refreshUi();
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
  }

  function mount(){
    if(mounted)return true;
    const stack=document.querySelector('.design-advanced-details .advanced-design-stack');
    if(!stack)return false;

    const section=document.createElement('div');
    section.className='form-section premium-profile-border-control';
    section.id='profile-border-color-control';
    section.innerHTML=`
      <input type="hidden" name="profile_border_color" value="">
      <div class="profile-border-control-head">
        <div><h3>Profile photo border</h3><p>Keep the template border or choose a custom ring color.</p></div>
        <span class="entitlement-badge" data-profile-border-badge>Checking</span>
      </div>
      <div class="profile-border-picker-shell">
        <div class="profile-border-preview" data-profile-border-preview aria-hidden="true"><span></span></div>
        <div class="profile-border-options">
          <div class="profile-border-presets" role="group" aria-label="Profile photo border presets">
            <button class="profile-border-auto" type="button" data-profile-border-auto><i data-lucide="wand-sparkles" size="14"></i><span>Match design</span></button>
            <button class="profile-border-swatch" type="button" aria-label="White border" data-profile-border-color="#ffffff" style="--swatch:#ffffff"></button>
            <button class="profile-border-swatch" type="button" aria-label="Gold border" data-profile-border-color="#d4a84f" style="--swatch:#d4a84f"></button>
            <button class="profile-border-swatch" type="button" aria-label="Navy border" data-profile-border-color="#0b1438" style="--swatch:#0b1438"></button>
            <button class="profile-border-swatch" type="button" aria-label="Black border" data-profile-border-color="#111827" style="--swatch:#111827"></button>
          </div>
          <div class="profile-border-custom-row">
            <label for="profile-border-custom">Custom color</label>
            <div class="profile-border-custom-control"><input id="profile-border-custom" type="color" value="#ffffff" aria-label="Custom profile photo border color"><code data-profile-border-hex>MATCH DESIGN</code></div>
          </div>
        </div>
      </div>`;

    const styleSection=Array.from(stack.children).find(child=>child.querySelector?.('h3')?.textContent?.trim()==='Style details');
    if(styleSection)styleSection.insertAdjacentElement('afterend',section);
    else stack.prepend(section);

    section.querySelector('[data-profile-border-auto]')?.addEventListener('click',()=>apply(''));
    section.querySelectorAll('[data-profile-border-color]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.profileBorderColor)));
    picker()?.addEventListener('input',event=>apply(event.target.value));
    mounted=true;
    refreshUi();
    return true;
  }

  window.LIWProfileBorder={refresh:refreshUi,designColor};

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(mount())refreshUi();
    if(mounted&&currentAccess()){refreshUi();clearInterval(timer);}
    else if(attempts>80)clearInterval(timer);
  },150);
  mount();
})();

/* LIW Cards staging — smart, low-friction profile photo positioning. */
(function(){
  const SMART_DEFAULTS={x:50,y:68,zoom:125};
  let mounted=false;
  let adjustMode=false;

  function cropField(name){return document.querySelector(`[name="${name}"]`);}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

  function setCrop(x,y,zoom,{save=false}={}){
    const xField=cropField('profile_position_x');
    const yField=cropField('profile_position_y');
    const zoomField=cropField('profile_zoom');
    if(!xField||!yField||!zoomField)return;
    xField.value=String(Math.round(clamp(Number(x)||SMART_DEFAULTS.x,0,100)));
    yField.value=String(Math.round(clamp(Number(y)||SMART_DEFAULTS.y,0,100)));
    zoomField.value=String(Math.round(clamp(Number(zoom)||SMART_DEFAULTS.zoom,110,200)));
    try{if(typeof applyProfileImagePosition==='function')applyProfileImagePosition();}catch(_){ }
    try{if(typeof render==='function')render();}catch(_){ }
    if(save){try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }}
  }

  function heuristicCrop(width,height){
    const ratio=height/Math.max(1,width);
    if(ratio>=1.65)return{x:50,y:84,zoom:138};
    if(ratio>=1.25)return{x:50,y:74,zoom:130};
    if(ratio>=.92)return{x:50,y:64,zoom:122};
    return{x:50,y:52,zoom:120};
  }

  function faceCrop(face,width,height,fallback){
    const box=face?.boundingBox;
    if(!box||!width||!height)return fallback;
    const centerX=(box.x+(box.width/2))/width;
    const centerY=(box.y+(box.height/2))/height;
    const faceHeight=box.height/height;
    const x=50+((.5-centerX)*150);
    const y=50+((.48-centerY)*180);
    const zoom=clamp(118+Math.max(0,.34-faceHeight)*115,118,150);
    return{x:clamp(x,0,100),y:clamp(y,0,100),zoom};
  }

  async function analyzePhoto(file){
    if(!file)return;
    let bitmap=null;
    try{
      if(typeof createImageBitmap==='function'){
        bitmap=await createImageBitmap(file,{imageOrientation:'from-image'}).catch(()=>createImageBitmap(file));
      }
      if(bitmap){
        let crop=heuristicCrop(bitmap.width,bitmap.height);
        if('FaceDetector' in window){
          try{
            const detector=new FaceDetector({fastMode:true,maxDetectedFaces:3});
            const faces=await detector.detect(bitmap);
            if(faces?.length){
              const largest=faces.slice().sort((a,b)=>(b.boundingBox.width*b.boundingBox.height)-(a.boundingBox.width*a.boundingBox.height))[0];
              crop=faceCrop(largest,bitmap.width,bitmap.height,crop);
            }
          }catch(_){ }
        }
        setCrop(crop.x,crop.y,crop.zoom,{save:true});
        bitmap.close?.();
        return;
      }
    }catch(_){
      bitmap?.close?.();
    }

    const url=URL.createObjectURL(file);
    const image=new Image();
    image.onload=()=>{
      const crop=heuristicCrop(image.naturalWidth,image.naturalHeight);
      setCrop(crop.x,crop.y,crop.zoom,{save:true});
      URL.revokeObjectURL(url);
    };
    image.onerror=()=>URL.revokeObjectURL(url);
    image.src=url;
  }

  function injectStyle(){
    if(document.getElementById('liw-smart-photo-style'))return;
    const style=document.createElement('style');
    style.id='liw-smart-photo-style';
    style.textContent=`
      .photo-position-details,#reset-profile-position{display:none!important}
      #smart-adjust-photo[hidden]{display:none!important}
      .smart-photo-hint{margin:8px 0 0;font-size:.78rem;color:var(--muted);display:flex;align-items:center;gap:6px}
      .smart-photo-hint[hidden]{display:none!important}
      .profile-photo-editor.smart-adjusting .photo-preview{box-shadow:0 0 0 4px color-mix(in srgb,var(--primary) 18%,transparent);cursor:grab}
      .profile-photo-editor.smart-adjusting .photo-preview:after{content:'Drag to adjust';position:absolute;left:50%;bottom:6px;transform:translateX(-50%);white-space:nowrap;background:rgba(11,20,56,.82);color:#fff;border-radius:999px;padding:3px 7px;font-size:.58rem;font-weight:800;pointer-events:none}
      .profile-photo-editor.smart-adjusting .photo-preview{position:relative}
    `;
    document.head.appendChild(style);
  }

  function setAdjustMode(next){
    adjustMode=Boolean(next);
    const root=document.querySelector('.profile-photo-editor');
    const button=document.getElementById('smart-adjust-photo');
    const hint=document.getElementById('smart-photo-hint');
    root?.classList.toggle('smart-adjusting',adjustMode);
    if(button)button.innerHTML=adjustMode
      ? '<i data-lucide="check" size="14"></i> Done adjusting'
      : '<i data-lucide="move" size="14"></i> Adjust photo';
    if(hint)hint.hidden=!adjustMode;
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function syncPhotoUi(){
    const hasPhoto=Boolean(document.querySelector('#photo-preview img'));
    const button=document.getElementById('smart-adjust-photo');
    if(button)button.hidden=!hasPhoto;
    if(!hasPhoto&&adjustMode)setAdjustMode(false);
  }

  function mount(){
    if(mounted)return true;
    const fileInput=document.getElementById('profile-file');
    const actions=document.querySelector('.profile-photo-editor .upload-actions');
    const preview=document.getElementById('photo-preview');
    if(!fileInput||!actions||!preview)return false;

    injectStyle();
    const copy=document.querySelector('.profile-photo-editor .profile-photo-copy > p');
    if(copy)copy.textContent='Upload a clear photo — we’ll center it automatically. If needed, tap Adjust photo and drag.';

    const button=document.createElement('button');
    button.className='btn btn-ghost btn-sm';
    button.id='smart-adjust-photo';
    button.type='button';
    button.hidden=true;
    button.innerHTML='<i data-lucide="move" size="14"></i> Adjust photo';
    actions.appendChild(button);

    const hint=document.createElement('p');
    hint.className='smart-photo-hint';
    hint.id='smart-photo-hint';
    hint.hidden=true;
    hint.innerHTML='<i data-lucide="hand" size="14"></i> Drag the photo until your face looks right, then tap Done adjusting.';
    actions.insertAdjacentElement('afterend',hint);

    button.addEventListener('click',()=>setAdjustMode(!adjustMode));
    fileInput.addEventListener('change',event=>{
      const file=event.target.files?.[0];
      if(!file)return;
      setCrop(SMART_DEFAULTS.x,SMART_DEFAULTS.y,SMART_DEFAULTS.zoom);
      analyzePhoto(file);
    });

    [document.getElementById('photo-preview'),document.getElementById('preview-avatar')].filter(Boolean).forEach(container=>{
      container.addEventListener('pointerdown',event=>{
        if(!adjustMode)event.stopImmediatePropagation();
      },true);
    });

    const observer=new MutationObserver(syncPhotoUi);
    observer.observe(preview,{childList:true,subtree:true});
    syncPhotoUi();
    mounted=true;
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(mount()||attempts>40)clearInterval(timer);
  },100);
  mount();
})();
