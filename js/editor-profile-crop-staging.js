/* LIW Cards — cards-staging only: mobile-friendly profile photo crop-before-upload UX. */
(function(){
  'use strict';
  if(window.__LIW_PROFILE_CROP_STAGING__)return;
  window.__LIW_PROFILE_CROP_STAGING__=true;

  const MAX_BYTES=5*1024*1024;
  const OUTPUT_SIZE=720;
  const state={file:null,url:'',image:null,zoom:1,offsetX:0,offsetY:0,drag:null,busy:false};
  const q=(selector,root=document)=>root.querySelector(selector);

  function injectStyles(){
    if(document.getElementById('liw-profile-crop-staging-css'))return;
    const style=document.createElement('style');
    style.id='liw-profile-crop-staging-css';
    style.textContent=`
      .liw-profile-crop-dialog{width:min(94vw,560px);max-width:560px;border:0;border-radius:24px;padding:0;background:#fff;color:#182033;box-shadow:0 32px 90px rgba(11,20,56,.30)}
      .liw-profile-crop-dialog::backdrop{background:rgba(8,15,35,.68);backdrop-filter:blur(6px)}
      .liw-profile-crop-shell{padding:20px}
      .liw-profile-crop-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:16px}
      .liw-profile-crop-head h2{margin:0 0 4px;font-size:1.18rem;color:#0b1438}.liw-profile-crop-head p{margin:0;color:#667085;font-size:.82rem;line-height:1.45}
      .liw-profile-crop-close{width:36px;height:36px;display:grid;place-items:center;flex:0 0 auto;border:1px solid #e3e7ee;border-radius:11px;background:#fff;color:#475467;cursor:pointer}
      .liw-profile-crop-stage-wrap{display:grid;place-items:center;padding:10px;border:1px solid #e4e8ef;border-radius:20px;background:linear-gradient(135deg,#f7f8fb,#eef2f7)}
      .liw-profile-crop-stage{position:relative;width:min(72vw,330px);aspect-ratio:1/1;overflow:hidden;touch-action:none;cursor:grab;border-radius:18px;background:#dfe5ec;box-shadow:inset 0 0 0 1px rgba(11,20,56,.08)}
      .liw-profile-crop-stage.is-dragging{cursor:grabbing}
      .liw-profile-crop-stage img{position:absolute;max-width:none;user-select:none;-webkit-user-drag:none;pointer-events:none}
      .liw-profile-crop-guide{position:absolute;inset:8%;z-index:2;pointer-events:none;border:2px solid rgba(255,255,255,.96);box-shadow:0 0 0 999px rgba(0,0,0,.32),0 0 0 1px rgba(11,20,56,.18);border-radius:50%}
      .liw-profile-crop-guide[data-shape="rounded"]{border-radius:24px}.liw-profile-crop-guide[data-shape="square"]{border-radius:12px}
      .liw-profile-crop-center{position:absolute;inset:50% auto auto 50%;width:22px;height:22px;z-index:3;transform:translate(-50%,-50%);pointer-events:none;opacity:.72}
      .liw-profile-crop-center:before,.liw-profile-crop-center:after{content:'';position:absolute;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25)}
      .liw-profile-crop-center:before{width:22px;height:1px;left:0;top:10px}.liw-profile-crop-center:after{width:1px;height:22px;left:10px;top:0}
      .liw-profile-crop-tip{display:flex;align-items:center;justify-content:center;gap:7px;margin:10px 0 0;color:#667085;font-size:.72rem;font-weight:750}
      .liw-profile-crop-controls{display:grid;gap:12px;margin-top:16px}.liw-profile-crop-zoom{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px}.liw-profile-crop-zoom span{font-size:.74rem;font-weight:850;color:#344054}.liw-profile-crop-zoom output{min-width:44px;text-align:right;font-size:.72rem;color:#667085}.liw-profile-crop-zoom input{width:100%;accent-color:#0b1438}
      .liw-profile-crop-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px}.liw-profile-crop-actions-left{display:flex;gap:8px}.liw-profile-crop-actions .btn{min-height:42px}
      .liw-profile-crop-primary{min-width:132px}
      .liw-profile-crop-dialog[data-busy="true"] button,.liw-profile-crop-dialog[data-busy="true"] input{pointer-events:none;opacity:.62}
      .profile-photo-editor[data-liw-crop-ready="true"] .profile-photo-copy>p{max-width:540px}.profile-photo-editor[data-liw-crop-ready="true"] label[for="profile-file"]{font-weight:850}
      .liw-profile-crop-badge{display:inline-flex;align-items:center;gap:5px;margin:7px 0 0;padding:5px 8px;border-radius:999px;background:#eef4ff;color:#274690;font-size:.64rem;font-weight:850}
      @media(max-width:620px){
        .liw-profile-crop-dialog{width:100vw;max-width:none;min-height:100dvh;border-radius:0;margin:0;padding:0}
        .liw-profile-crop-shell{padding:16px 14px 18px}.liw-profile-crop-head{margin-bottom:12px}.liw-profile-crop-stage-wrap{padding:8px;border-radius:17px}.liw-profile-crop-stage{width:min(86vw,360px)}
        .liw-profile-crop-actions{position:sticky;bottom:0;margin:16px -14px -18px;padding:12px 14px 16px;background:rgba(255,255,255,.96);border-top:1px solid #e7eaf0;backdrop-filter:blur(10px)}
        .liw-profile-crop-primary{flex:1}.liw-profile-crop-actions-left .btn{padding-inline:11px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDialog(){
    let dialog=document.getElementById('liw-profile-crop-dialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='liw-profile-crop-dialog';
    dialog.className='liw-profile-crop-dialog';
    dialog.innerHTML=`<div class="liw-profile-crop-shell">
      <div class="liw-profile-crop-head"><div><h2>Crop your profile photo</h2><p>Drag the photo so your face or logo sits comfortably inside the frame.</p></div><button type="button" class="liw-profile-crop-close" data-liw-crop-close aria-label="Close crop editor">×</button></div>
      <div class="liw-profile-crop-stage-wrap"><div class="liw-profile-crop-stage" id="liw-profile-crop-stage"><img alt="Photo crop preview" id="liw-profile-crop-image"><span class="liw-profile-crop-guide" id="liw-profile-crop-guide"></span><span class="liw-profile-crop-center"></span></div><div class="liw-profile-crop-tip"><span>↕</span><span>Drag to reposition · use Zoom for the right framing</span></div></div>
      <div class="liw-profile-crop-controls"><label class="liw-profile-crop-zoom"><span>Zoom</span><input id="liw-profile-crop-zoom" type="range" min="100" max="280" step="1" value="100"><output id="liw-profile-crop-zoom-value">100%</output></label></div>
      <div class="liw-profile-crop-actions"><div class="liw-profile-crop-actions-left"><button type="button" class="btn btn-light btn-sm" data-liw-crop-reset>Reset</button><button type="button" class="btn btn-light btn-sm" data-liw-crop-close>Cancel</button></div><button type="button" class="btn btn-primary liw-profile-crop-primary" data-liw-crop-apply>Use this photo</button></div>
    </div>`;
    document.body.appendChild(dialog);

    dialog.querySelectorAll('[data-liw-crop-close]').forEach(button=>button.addEventListener('click',closeDialog));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
    dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog();});
    q('[data-liw-crop-reset]',dialog)?.addEventListener('click',resetCrop);
    q('[data-liw-crop-apply]',dialog)?.addEventListener('click',applyCrop);
    q('#liw-profile-crop-zoom',dialog)?.addEventListener('input',event=>{
      state.zoom=Math.max(1,Math.min(2.8,Number(event.target.value||100)/100));
      q('#liw-profile-crop-zoom-value',dialog).textContent=`${Math.round(state.zoom*100)}%`;
      clampOffsets();renderCrop();
    });
    wireDrag(dialog);
    return dialog;
  }

  function currentShape(){
    try{
      const value=String(field('profile_image_shape')?.value||'circle').toLowerCase();
      return value==='square'?'square':value==='rounded'?'rounded':'circle';
    }catch(_){return 'circle';}
  }

  function cropMetrics(){
    const stage=q('#liw-profile-crop-stage');
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
    const m=cropMetrics(),image=q('#liw-profile-crop-image');if(!m||!image)return;
    clampOffsets();
    image.style.width=`${m.displayWidth}px`;
    image.style.height=`${m.displayHeight}px`;
    image.style.left=`${(m.width-m.displayWidth)/2+state.offsetX}px`;
    image.style.top=`${(m.height-m.displayHeight)/2+state.offsetY}px`;
    const guide=q('#liw-profile-crop-guide');if(guide)guide.dataset.shape=currentShape();
  }

  function resetCrop(){
    state.zoom=1;state.offsetX=0;state.offsetY=0;
    const slider=q('#liw-profile-crop-zoom');if(slider)slider.value='100';
    const out=q('#liw-profile-crop-zoom-value');if(out)out.textContent='100%';
    renderCrop();
  }

  function wireDrag(dialog){
    const stage=q('#liw-profile-crop-stage',dialog);if(!stage)return;
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

  function closeDialog(){
    const dialog=q('#liw-profile-crop-dialog');
    if(dialog?.open)dialog.close();
    const input=q('#profile-file');if(input)input.value='';
    if(state.url){URL.revokeObjectURL(state.url);state.url='';}
    state.file=null;state.image=null;state.drag=null;state.busy=false;
    if(dialog)dialog.dataset.busy='false';
  }

  function openFile(file){
    if(!file)return;
    const input=q('#profile-file');
    if(file.size>MAX_BYTES){if(input)input.value='';toast?.('Photo must be smaller than 5 MB');return;}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){if(input)input.value='';toast?.('Choose a JPG, PNG, or WebP photo.');return;}
    injectStyles();
    const dialog=ensureDialog();
    if(state.url)URL.revokeObjectURL(state.url);
    state.file=file;state.url=URL.createObjectURL(file);state.image=new Image();state.zoom=1;state.offsetX=0;state.offsetY=0;
    state.image.onload=()=>{
      const cropImage=q('#liw-profile-crop-image');
      if(cropImage)cropImage.src=state.url;
      resetCrop();
      requestAnimationFrame(renderCrop);
    };
    state.image.onerror=()=>{toast?.('That photo could not be opened. Try another image.');closeDialog();};
    state.image.src=state.url;
    const guide=q('#liw-profile-crop-guide');if(guide)guide.dataset.shape=currentShape();
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }

  function canvasBlob(canvas){
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create the cropped photo.')),'image/jpeg',0.9));
  }

  async function buildCroppedFile(){
    const m=cropMetrics();
    if(!m||!state.image)throw new Error('Photo is not ready yet.');
    clampOffsets();
    const left=(m.width-m.displayWidth)/2+state.offsetX;
    const top=(m.height-m.displayHeight)/2+state.offsetY;
    const sx=Math.max(0,(0-left)/m.scale);
    const sy=Math.max(0,(0-top)/m.scale);
    const sw=Math.min(state.image.naturalWidth,m.width/m.scale);
    const sh=Math.min(state.image.naturalHeight,m.height/m.scale);
    const canvas=document.createElement('canvas');canvas.width=OUTPUT_SIZE;canvas.height=OUTPUT_SIZE;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,OUTPUT_SIZE,OUTPUT_SIZE);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(state.image,sx,sy,sw,sh,0,0,OUTPUT_SIZE,OUTPUT_SIZE);
    const blob=await canvasBlob(canvas);
    return new File([blob],`profile-cropped-${Date.now()}.jpg`,{type:'image/jpeg',lastModified:Date.now()});
  }

  async function uploadCroppedFile(file){
    if(typeof supabaseClient==='undefined'||typeof user==='undefined'||!user?.id)throw new Error('Your account is still loading. Try again in a moment.');
    const safeName=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');
    const path=`${user.id}/${Date.now()}-${safeName}`;
    setSaveState?.('saving','Uploading cropped photo…');
    const {error}=await supabaseClient.storage.from('profile-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||'image/jpeg'});
    if(error)throw error;
    const {data}=supabaseClient.storage.from('profile-images').getPublicUrl(path);
    if(!data?.publicUrl)throw new Error('The cropped photo uploaded but no public URL was returned.');
    return data.publicUrl;
  }

  async function applyCrop(){
    if(state.busy)return;
    const dialog=q('#liw-profile-crop-dialog');
    try{
      state.busy=true;if(dialog)dialog.dataset.busy='true';
      const button=q('[data-liw-crop-apply]',dialog);if(button)button.textContent='Saving photo…';
      const cropped=await buildCroppedFile();
      const publicUrl=await uploadCroppedFile(cropped);
      profileUrl=publicUrl;
      if(field('profile_image_url'))field('profile_image_url').value=profileUrl;
      if(field('profile_position_x'))field('profile_position_x').value='50';
      if(field('profile_position_y'))field('profile_position_y').value='50';
      if(field('profile_zoom'))field('profile_zoom').value='110';
      updatePhoto?.();render?.();
      await save?.({silent:true});
      closeDialog();
      polishPhotoUi();
      toast?.('Profile photo cropped and saved');
    }catch(error){
      state.busy=false;if(dialog)dialog.dataset.busy='false';
      const button=q('[data-liw-crop-apply]',dialog);if(button)button.textContent='Use this photo';
      setSaveState?.('saved','Saved');
      toast?.(error?.message||'Unable to crop and save this photo.');
    }
  }

  function polishPhotoUi(){
    const editor=q('.profile-photo-editor'),label=q('label[for="profile-file"]');
    if(!editor||!label)return false;
    editor.dataset.liwCropReady='true';
    label.innerHTML=`<i data-lucide="crop" size="15"></i> ${typeof profileUrl!=='undefined'&&profileUrl?'Change & crop':'Choose & crop photo'}`;
    const copy=q('.profile-photo-copy',editor);
    if(copy&&!q('.liw-profile-crop-badge',copy)){
      const badge=document.createElement('span');badge.className='liw-profile-crop-badge';badge.innerHTML='<i data-lucide="sparkles" size="12"></i> Crop before saving';
      copy.querySelector('p')?.insertAdjacentElement('afterend',badge);
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function interceptUpload(){
    const input=q('#profile-file');if(!input||input.dataset.liwCropIntercept==='true')return false;
    input.dataset.liwCropIntercept='true';
    input.addEventListener('change',event=>{
      const file=event.target.files?.[0];
      if(!file)return;
      event.preventDefault();event.stopImmediatePropagation();
      openFile(file);
    },true);
    return true;
  }

  injectStyles();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;interceptUpload();polishPhotoUi();
    if(attempts>=40)clearInterval(timer);
  },250);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{interceptUpload();polishPhotoUi();},{once:true});
  else {interceptUpload();polishPhotoUi();}
  window.addEventListener('resize',()=>{if(q('#liw-profile-crop-dialog')?.open)requestAnimationFrame(renderCrop);});
  document.addEventListener('change',event=>{if(event.target?.name==='profile_image_shape')setTimeout(()=>{const guide=q('#liw-profile-crop-guide');if(guide)guide.dataset.shape=currentShape();},0);});
  window.LIWProfileCropStaging={openFile,refresh:polishPhotoUi};
})();
