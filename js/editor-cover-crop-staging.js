/* LIW Cards — cards-staging only: drag, zoom and crop cover images before upload. */
(function(){
  'use strict';
  if(window.__LIW_COVER_CROP_STAGING__)return;
  window.__LIW_COVER_CROP_STAGING__=true;

  const MAX_BYTES=5*1024*1024;
  const OUTPUT_WIDTH=1600;
  const state={file:null,url:'',image:null,zoom:1,offsetX:0,offsetY:0,drag:null,busy:false,editingExisting:false};
  const q=(selector,root=document)=>root.querySelector(selector);

  const layoutHeights={
    classic:190,executive:190,split:190,bold:190,soft:190,playful:190,property:190,beauty:190,automotive:190,artist:190,dining:190,diamond:190,
    minimal:86,spotlight:275,luxe:230,editorial:118
  };

  function selectedLayout(){
    try{return String(field('card_layout')?.value||'classic').toLowerCase();}catch(_){return 'classic';}
  }

  function layoutLabel(){
    const value=selectedLayout();
    return value ? value.charAt(0).toUpperCase()+value.slice(1) : 'Classic';
  }

  function targetRatio(){
    const height=layoutHeights[selectedLayout()]||190;
    return 470/height;
  }

  function injectStyles(){
    if(document.getElementById('liw-cover-crop-staging-css'))return;
    const style=document.createElement('style');
    style.id='liw-cover-crop-staging-css';
    style.textContent=`
      .liw-cover-crop-dialog{width:min(94vw,820px);max-width:820px;border:0;border-radius:24px;padding:0;background:#fff;color:#182033;box-shadow:0 32px 90px rgba(11,20,56,.30)}
      .liw-cover-crop-dialog::backdrop{background:rgba(8,15,35,.70);backdrop-filter:blur(6px)}
      .liw-cover-crop-shell{padding:20px}
      .liw-cover-crop-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:15px}
      .liw-cover-crop-head h2{margin:0 0 4px;font-size:1.22rem;color:#0b1438}.liw-cover-crop-head p{margin:0;color:#667085;font-size:.84rem;line-height:1.45;max-width:590px}
      .liw-cover-crop-close{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;border:1px solid #e3e7ee;border-radius:11px;background:#fff;color:#475467;cursor:pointer}
      .liw-cover-crop-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;font-size:.74rem;color:#667085}
      .liw-cover-crop-layout{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#eef4ff;color:#274690;font-weight:850}
      .liw-cover-crop-stage-wrap{padding:10px;border:1px solid #e4e8ef;border-radius:20px;background:linear-gradient(135deg,#f7f8fb,#eef2f7)}
      .liw-cover-crop-stage{position:relative;width:100%;overflow:hidden;touch-action:none;cursor:grab;border-radius:14px;background:#dfe5ec;box-shadow:inset 0 0 0 1px rgba(11,20,56,.08)}
      .liw-cover-crop-stage.is-dragging{cursor:grabbing}
      .liw-cover-crop-stage img{position:absolute;max-width:none;user-select:none;-webkit-user-drag:none;pointer-events:none}
      .liw-cover-crop-guide{position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 0 2px rgba(255,255,255,.92),inset 0 0 0 3px rgba(11,20,56,.12)}
      .liw-cover-crop-guide:before,.liw-cover-crop-guide:after{content:'';position:absolute;pointer-events:none;background:rgba(255,255,255,.70)}
      .liw-cover-crop-guide:before{left:33.333%;top:0;bottom:0;width:1px;box-shadow:calc(var(--liw-cover-stage-width,600px)/3) 0 0 rgba(255,255,255,.70)}
      .liw-cover-crop-guide:after{top:50%;left:0;right:0;height:1px}
      .liw-cover-crop-tip{display:flex;align-items:center;justify-content:center;gap:7px;margin:10px 0 0;color:#667085;font-size:.73rem;font-weight:750;text-align:center}
      .liw-cover-crop-controls{display:grid;gap:12px;margin-top:16px}.liw-cover-crop-zoom{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px}.liw-cover-crop-zoom span{font-size:.76rem;font-weight:850;color:#344054}.liw-cover-crop-zoom output{min-width:46px;text-align:right;font-size:.74rem;color:#667085}.liw-cover-crop-zoom input{width:100%;accent-color:#0b1438}
      .liw-cover-crop-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px}.liw-cover-crop-actions-left{display:flex;gap:8px}.liw-cover-crop-actions .btn{min-height:42px}.liw-cover-crop-primary{min-width:150px}
      .liw-cover-crop-dialog[data-busy="true"] button,.liw-cover-crop-dialog[data-busy="true"] input{pointer-events:none;opacity:.62}
      .cover-upload-editor[data-liw-cover-crop-ready="true"] label[for="cover-file"]{font-weight:850}
      .liw-cover-recrop{white-space:nowrap}
      @media(max-width:620px){
        .liw-cover-crop-dialog{width:100vw;max-width:none;min-height:100dvh;border-radius:0;margin:0;padding:0}
        .liw-cover-crop-shell{padding:16px 14px 18px}.liw-cover-crop-head{margin-bottom:12px}.liw-cover-crop-stage-wrap{padding:7px;border-radius:16px}
        .liw-cover-crop-meta{align-items:flex-start;flex-direction:column}.liw-cover-crop-tip{font-size:.69rem}
        .liw-cover-crop-actions{position:sticky;bottom:0;margin:16px -14px -18px;padding:12px 14px 16px;background:rgba(255,255,255,.97);border-top:1px solid #e7eaf0;backdrop-filter:blur(10px)}
        .liw-cover-crop-primary{flex:1}.liw-cover-crop-actions-left .btn{padding-inline:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDialog(){
    let dialog=q('#liw-cover-crop-dialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='liw-cover-crop-dialog';
    dialog.className='liw-cover-crop-dialog';
    dialog.innerHTML=`<div class="liw-cover-crop-shell">
      <div class="liw-cover-crop-head"><div><h2>Position your cover image</h2><p>Drag the image to move it and use Zoom to frame the important part. The crop window matches the cover shape of your selected card design.</p></div><button type="button" class="liw-cover-crop-close" data-liw-cover-crop-close aria-label="Close cover crop editor">×</button></div>
      <div class="liw-cover-crop-meta"><span class="liw-cover-crop-layout" id="liw-cover-crop-layout">Classic cover</span><span>Anything outside this frame will be cropped.</span></div>
      <div class="liw-cover-crop-stage-wrap"><div class="liw-cover-crop-stage" id="liw-cover-crop-stage"><img alt="Cover crop preview" id="liw-cover-crop-image"><span class="liw-cover-crop-guide"></span></div><div class="liw-cover-crop-tip"><span>↔</span><span>Drag in any direction · Zoom in for tighter framing</span></div></div>
      <div class="liw-cover-crop-controls"><label class="liw-cover-crop-zoom"><span>Zoom</span><input id="liw-cover-crop-zoom" type="range" min="100" max="300" step="1" value="100"><output id="liw-cover-crop-zoom-value">100%</output></label></div>
      <div class="liw-cover-crop-actions"><div class="liw-cover-crop-actions-left"><button type="button" class="btn btn-light btn-sm" data-liw-cover-crop-reset>Reset</button><button type="button" class="btn btn-light btn-sm" data-liw-cover-crop-close>Cancel</button></div><button type="button" class="btn btn-primary liw-cover-crop-primary" data-liw-cover-crop-apply>Use this cover</button></div>
    </div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-liw-cover-crop-close]').forEach(button=>button.addEventListener('click',closeDialog));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
    dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();});
    q('[data-liw-cover-crop-reset]',dialog)?.addEventListener('click',resetCrop);
    q('[data-liw-cover-crop-apply]',dialog)?.addEventListener('click',applyCrop);
    q('#liw-cover-crop-zoom',dialog)?.addEventListener('input',event=>{
      state.zoom=Math.max(1,Math.min(3,Number(event.target.value||100)/100));
      q('#liw-cover-crop-zoom-value',dialog).textContent=`${Math.round(state.zoom*100)}%`;
      clampOffsets();renderCrop();
    });
    wireDrag(dialog);
    return dialog;
  }

  function stageSize(){
    const stage=q('#liw-cover-crop-stage');
    if(!stage)return;
    const ratio=targetRatio();
    stage.style.aspectRatio=String(ratio);
    const label=q('#liw-cover-crop-layout');
    if(label)label.textContent=`${layoutLabel()} cover`;
    requestAnimationFrame(()=>{
      const width=stage.getBoundingClientRect().width;
      stage.style.setProperty('--liw-cover-stage-width',`${Math.round(width)}px`);
      renderCrop();
    });
  }

  function cropMetrics(){
    const stage=q('#liw-cover-crop-stage');
    const image=state.image;
    if(!stage||!image?.naturalWidth||!image?.naturalHeight)return null;
    const rect=stage.getBoundingClientRect();
    const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
    const base=Math.max(width/image.naturalWidth,height/image.naturalHeight);
    const scale=base*state.zoom;
    const displayWidth=image.naturalWidth*scale,displayHeight=image.naturalHeight*scale;
    return {width,height,scale,displayWidth,displayHeight};
  }

  function clampOffsets(){
    const m=cropMetrics();if(!m)return;
    const maxX=Math.max(0,(m.displayWidth-m.width)/2);
    const maxY=Math.max(0,(m.displayHeight-m.height)/2);
    state.offsetX=Math.max(-maxX,Math.min(maxX,state.offsetX));
    state.offsetY=Math.max(-maxY,Math.min(maxY,state.offsetY));
  }

  function renderCrop(){
    const m=cropMetrics(),image=q('#liw-cover-crop-image');if(!m||!image)return;
    clampOffsets();
    image.style.width=`${m.displayWidth}px`;
    image.style.height=`${m.displayHeight}px`;
    image.style.left=`${(m.width-m.displayWidth)/2+state.offsetX}px`;
    image.style.top=`${(m.height-m.displayHeight)/2+state.offsetY}px`;
  }

  function resetCrop(){
    state.zoom=1;state.offsetX=0;state.offsetY=0;
    const slider=q('#liw-cover-crop-zoom');if(slider)slider.value='100';
    const out=q('#liw-cover-crop-zoom-value');if(out)out.textContent='100%';
    renderCrop();
  }

  function wireDrag(dialog){
    const stage=q('#liw-cover-crop-stage',dialog);if(!stage)return;
    stage.addEventListener('pointerdown',event=>{
      if(!state.image||state.busy)return;
      event.preventDefault();stage.setPointerCapture?.(event.pointerId);
      state.drag={id:event.pointerId,x:event.clientX,y:event.clientY,offsetX:state.offsetX,offsetY:state.offsetY};
      stage.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove',event=>{
      if(!state.drag||state.drag.id!==event.pointerId)return;
      state.offsetX=state.drag.offsetX+(event.clientX-state.drag.x);
      state.offsetY=state.drag.offsetY+(event.clientY-state.drag.y);
      clampOffsets();renderCrop();
    });
    const end=event=>{
      if(!state.drag||(event.pointerId!==undefined&&state.drag.id!==event.pointerId))return;
      state.drag=null;stage.classList.remove('is-dragging');
    };
    stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',end);
  }

  function cleanupObjectUrl(){
    if(state.url&&state.url.startsWith('blob:'))URL.revokeObjectURL(state.url);
    state.url='';
  }

  function closeDialog(){
    const dialog=q('#liw-cover-crop-dialog');
    if(dialog?.open)dialog.close();
    const input=q('#cover-file');if(input)input.value='';
    cleanupObjectUrl();
    state.file=null;state.image=null;state.drag=null;state.busy=false;state.editingExisting=false;
    if(dialog){dialog.dataset.busy='false';const button=q('[data-liw-cover-crop-apply]',dialog);if(button)button.textContent='Use this cover';}
  }

  function openSource(src,file=null,editingExisting=false){
    injectStyles();
    const dialog=ensureDialog();
    cleanupObjectUrl();
    state.file=file;state.url=src;state.image=new Image();state.zoom=1;state.offsetX=0;state.offsetY=0;state.editingExisting=editingExisting;
    state.image.crossOrigin='anonymous';
    state.image.onload=()=>{
      const cropImage=q('#liw-cover-crop-image');if(cropImage){cropImage.crossOrigin='anonymous';cropImage.src=src;}
      resetCrop();stageSize();requestAnimationFrame(renderCrop);
    };
    state.image.onerror=()=>{toast?.('That cover image could not be opened. Try uploading it again.');closeDialog();};
    state.image.src=src;
    stageSize();
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }

  function openFile(file){
    if(!file)return;
    const input=q('#cover-file');
    if(file.size>MAX_BYTES){if(input)input.value='';toast?.('Cover image must be smaller than 5 MB.');return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){if(input)input.value='';toast?.('Choose a JPG, PNG, or WebP cover image.');return;}
    openSource(URL.createObjectURL(file),file,false);
  }

  async function openExisting(){
    const url=String((typeof coverUrl!=='undefined'&&coverUrl)||field('cover_image_url')?.value||'').trim();
    if(!url)return toast?.('Upload a cover image first.');
    try{
      setSaveState?.('saving','Opening cover editor…');
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)throw new Error('Unable to load current cover.');
      const blob=await response.blob();
      const type=['image/jpeg','image/png','image/webp'].includes(blob.type)?blob.type:'image/jpeg';
      const file=new File([blob],`cover-edit-${Date.now()}.${type==='image/png'?'png':type==='image/webp'?'webp':'jpg'}`,{type,lastModified:Date.now()});
      openFile(file);state.editingExisting=true;
      setSaveState?.('saved','Saved');
    }catch(error){
      setSaveState?.('saved','Saved');
      toast?.('Re-upload the original cover to crop or reposition it.');
    }
  }

  function canvasBlob(canvas){
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create the cropped cover.')),'image/jpeg',0.91));
  }

  async function buildCroppedFile(){
    const m=cropMetrics();
    if(!m||!state.image)throw new Error('Cover image is not ready yet.');
    clampOffsets();
    const left=(m.width-m.displayWidth)/2+state.offsetX;
    const top=(m.height-m.displayHeight)/2+state.offsetY;
    const sx=Math.max(0,(0-left)/m.scale);
    const sy=Math.max(0,(0-top)/m.scale);
    const sw=Math.min(state.image.naturalWidth,m.width/m.scale);
    const sh=Math.min(state.image.naturalHeight,m.height/m.scale);
    const ratio=targetRatio();
    const outputHeight=Math.max(290,Math.round(OUTPUT_WIDTH/ratio));
    const canvas=document.createElement('canvas');canvas.width=OUTPUT_WIDTH;canvas.height=outputHeight;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,OUTPUT_WIDTH,outputHeight);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(state.image,sx,sy,sw,sh,0,0,OUTPUT_WIDTH,outputHeight);
    const blob=await canvasBlob(canvas);
    return new File([blob],`cover-cropped-${Date.now()}.jpg`,{type:'image/jpeg',lastModified:Date.now()});
  }

  async function uploadCroppedFile(file){
    if(typeof supabaseClient==='undefined'||typeof user==='undefined'||!user?.id)throw new Error('Your account is still loading. Try again in a moment.');
    const path=`${user.id}/${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-')}`;
    setSaveState?.('saving','Uploading cropped cover…');
    const {error}=await supabaseClient.storage.from('profile-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:'image/jpeg'});
    if(error)throw error;
    const {data}=supabaseClient.storage.from('profile-images').getPublicUrl(path);
    if(!data?.publicUrl)throw new Error('The cropped cover uploaded but no public URL was returned.');
    return data.publicUrl;
  }

  async function applyCrop(){
    if(state.busy)return;
    const dialog=q('#liw-cover-crop-dialog');
    try{
      state.busy=true;if(dialog)dialog.dataset.busy='true';
      const button=q('[data-liw-cover-crop-apply]',dialog);if(button)button.textContent='Saving cover…';
      const cropped=await buildCroppedFile();
      const publicUrl=await uploadCroppedFile(cropped);
      coverUrl=publicUrl;
      if(field('cover_image_url'))field('cover_image_url').value=coverUrl;
      if(field('cover_position'))field('cover_position').value='center';
      updateCoverPreview?.();render?.();
      await save?.({silent:true});
      closeDialog();
      polishCoverUi();
      toast?.('Cover cropped, positioned, and saved');
    }catch(error){
      state.busy=false;if(dialog)dialog.dataset.busy='false';
      const button=q('[data-liw-cover-crop-apply]',dialog);if(button)button.textContent='Use this cover';
      setSaveState?.('saved','Saved');
      toast?.(error?.message||'Unable to crop and save this cover image.');
    }
  }

  function interceptUpload(){
    const input=q('#cover-file');if(!input||input.dataset.liwCoverCropIntercept==='true')return false;
    input.dataset.liwCoverCropIntercept='true';
    input.addEventListener('change',event=>{
      const file=event.target.files?.[0];
      if(!file)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(typeof hasEntitlement==='function'&&!hasEntitlement('cover_image')){
        input.value='';
        toast?.('Cover images are not included with this plan.');
        return;
      }
      openFile(file);
    },true);
    return true;
  }

  function polishCoverUi(){
    const editor=q('.cover-upload-editor'),label=q('label[for="cover-file"]');
    if(!editor||!label)return false;
    editor.dataset.liwCoverCropReady='true';
    const hasCover=Boolean(String((typeof coverUrl!=='undefined'&&coverUrl)||field('cover_image_url')?.value||'').trim());
    label.innerHTML=`<i data-lucide="${hasCover?'replace':'crop'}" size="15"></i> ${hasCover?'Change & crop':'Choose & crop cover'}`;
    const actions=label.closest('.upload-actions');
    if(actions){
      let recrop=q('#liw-recrop-cover',actions);
      if(!recrop){
        recrop=document.createElement('button');recrop.type='button';recrop.id='liw-recrop-cover';recrop.className='btn btn-ghost btn-sm liw-cover-recrop';
        recrop.innerHTML='<i data-lucide="move" size="14"></i> Reposition / crop';
        recrop.addEventListener('click',openExisting);
        actions.appendChild(recrop);
      }
      recrop.hidden=!hasCover;
      recrop.disabled=typeof hasEntitlement==='function'&&!hasEntitlement('cover_image');
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  injectStyles();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;interceptUpload();polishCoverUi();
    if(attempts>=60)clearInterval(timer);
  },250);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{interceptUpload();polishCoverUi();},{once:true});
  else {interceptUpload();polishCoverUi();}
  window.addEventListener('resize',()=>{if(q('#liw-cover-crop-dialog')?.open){stageSize();requestAnimationFrame(renderCrop);}});
  document.addEventListener('change',event=>{
    if(event.target?.name==='card_layout'||event.target?.name==='template_id'){
      if(q('#liw-cover-crop-dialog')?.open){stageSize();resetCrop();}
      setTimeout(polishCoverUi,0);
    }
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('#remove-cover'))setTimeout(polishCoverUi,20);
    if(event.target.closest('.template-card'))setTimeout(()=>{if(q('#liw-cover-crop-dialog')?.open){stageSize();resetCrop();}},40);
  });
  window.LIWCoverCropStaging={openFile,openExisting,refresh:polishCoverUi};
})();
