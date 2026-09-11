/* LIW Cards staging — optimize non-QR editor image uploads before they reach Supabase Storage. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_IMAGE_OPTIMIZE_STAGING__)return;
  window.__LIW_EDITOR_IMAGE_OPTIMIZE_STAGING__=true;

  const MAX_SOURCE_BYTES=20*1024*1024;
  const DEFAULT_MAX_EDGE=1600;
  const DEFAULT_QUALITY=0.84;
  const KEEP_SMALL_BYTES=420*1024;
  const bypass=new WeakSet();

  function isImageFile(file){
    return Boolean(file&&['image/jpeg','image/png','image/webp'].includes(String(file.type||'').toLowerCase()));
  }

  function contextText(input){
    const ancestor=input.closest('[id],[class]');
    return [input.id,input.name,input.className,Object.keys(input.dataset||{}).join(' '),ancestor?.id,ancestor?.className]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function shouldSkip(input){
    const text=contextText(input);
    // Profile and cover have dedicated crop+resize modules. QR images must remain on
    // their scan-safe path and are deliberately never recompressed here.
    return input.id==='profile-file'||input.id==='cover-file'||/\bqr\b|qr-|payment-qr|scan-safe/.test(text);
  }

  function targetEdge(input){
    const text=contextText(input);
    if(text.includes('release')||text.includes('artwork')||text.includes('merch'))return 1400;
    return DEFAULT_MAX_EDGE;
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const image=new Image();
      image.onload=()=>resolve({image,url});
      image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Unable to read image'));};
      image.src=url;
    });
  }

  function canvasBlob(canvas,type,quality){
    return new Promise((resolve,reject)=>canvas.toBlob(
      blob=>blob?resolve(blob):reject(new Error('Unable to optimize image')),
      type,
      quality
    ));
  }

  async function optimizeFile(file,input){
    if(!isImageFile(file)||file.size>MAX_SOURCE_BYTES)return file;
    const {image,url}=await loadImage(file);
    try{
      const width=image.naturalWidth||image.width;
      const height=image.naturalHeight||image.height;
      if(!width||!height)return file;
      const maxEdge=targetEdge(input);
      const scale=Math.min(1,maxEdge/Math.max(width,height));
      if(scale===1&&file.size<=KEEP_SMALL_BYTES)return file;

      const outWidth=Math.max(1,Math.round(width*scale));
      const outHeight=Math.max(1,Math.round(height*scale));
      const canvas=document.createElement('canvas');
      canvas.width=outWidth;canvas.height=outHeight;
      const ctx=canvas.getContext('2d',{alpha:true});
      if(!ctx)return file;
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(image,0,0,outWidth,outHeight);

      // WebP keeps transparency when present while usually cutting gallery/artwork
      // storage and transfer size substantially compared with phone JPG/PNG originals.
      let blob=await canvasBlob(canvas,'image/webp',DEFAULT_QUALITY);
      if(!blob||blob.size<=0)return file;
      if(scale===1&&blob.size>=file.size)return file;

      const base=String(file.name||'image').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'image';
      return new File([blob],`${base}-optimized.webp`,{type:'image/webp',lastModified:Date.now()});
    }finally{
      URL.revokeObjectURL(url);
    }
  }

  async function intercept(event){
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.type!=='file'||shouldSkip(input))return;
    if(bypass.has(input)){bypass.delete(input);return;}

    const originals=Array.from(input.files||[]);
    if(!originals.some(isImageFile))return;

    // Stop the original upload event; after optimization we replace the FileList and
    // replay change once so the existing gallery/Showtime/other uploader continues.
    event.preventDefault();
    event.stopImmediatePropagation();

    try{
      const optimized=[];
      for(const file of originals){
        try{optimized.push(await optimizeFile(file,input));}
        catch(error){console.warn('[LIW image optimizer] keeping original',error);optimized.push(file);}
      }

      if(typeof DataTransfer!=='undefined'){
        const transfer=new DataTransfer();
        optimized.forEach(file=>transfer.items.add(file));
        input.files=transfer.files;
      }
    }finally{
      bypass.add(input);
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  document.addEventListener('change',intercept,true);
  window.LIWImageOptimizeStaging={optimizeFile};
})();
