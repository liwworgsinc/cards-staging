/* LIW Cards — STAGING ONLY — Virtual Background Generator */
const virtualBackgroundState = {
  user: null,
  cards: [],
  selectedCard: null,
  template: 'executive',
  profileImage: null,
  qrCanvas: null,
  assetToken: 0
};

const $vb = id => document.getElementById(id);

(async function initVirtualBackgroundGenerator(){
  const user = await requireUser();
  if(!user) return;
  virtualBackgroundState.user = user;
  wireVirtualBackgroundEvents();
  setVbStatus('Loading your cards…');

  const {data:cards,error} = await supabaseClient
    .from('digital_cards')
    .select('id,internal_label,full_name,job_title,company_name,profile_image_url,slug,status,primary_color,button_color,updated_at')
    .eq('user_id',user.id)
    .order('updated_at',{ascending:false});

  if(error){
    setVbStatus(error.message,true);
    return;
  }

  virtualBackgroundState.cards = cards || [];
  populateVirtualBackgroundCards();
  const email = $vb('vb-user-email');
  if(email) email.textContent = user.email || '';

  if(virtualBackgroundState.cards.length){
    await loadVirtualBackgroundCard(virtualBackgroundState.cards[0].id);
  }else{
    $vb('vb-empty-note')?.removeAttribute('hidden');
    $vb('vb-download')?.setAttribute('disabled','disabled');
    $vb('vb-copy-link')?.setAttribute('disabled','disabled');
    renderVirtualBackground();
    setVbStatus('Create a LIW card first to generate a branded background.');
  }

  document.getElementById('sidebar-toggle')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.toggle('open'));
  if(window.lucide) lucide.createIcons();
})();

function wireVirtualBackgroundEvents(){
  $vb('vb-card-select')?.addEventListener('change',event=>loadVirtualBackgroundCard(event.target.value));
  $vb('vb-reset-card')?.addEventListener('click',()=>{
    const id=$vb('vb-card-select')?.value;
    if(id) loadVirtualBackgroundCard(id);
  });

  document.querySelectorAll('[data-vb-template]').forEach(button=>{
    button.addEventListener('click',()=>{
      virtualBackgroundState.template=button.dataset.vbTemplate || 'executive';
      document.querySelectorAll('[data-vb-template]').forEach(item=>{
        const active=item===button;
        item.classList.toggle('active',active);
        item.setAttribute('aria-pressed',active?'true':'false');
      });
      renderVirtualBackground();
    });
  });

  document.querySelectorAll('[data-vb-input]').forEach(input=>{
    input.addEventListener('input',()=>{
      if(input.id==='vb-accent') syncVirtualAccentValue();
      renderVirtualBackground();
    });
    input.addEventListener('change',()=>{
      if(input.id==='vb-accent') syncVirtualAccentValue();
      renderVirtualBackground();
    });
  });

  $vb('vb-download')?.addEventListener('click',downloadVirtualBackground);
  $vb('vb-copy-link')?.addEventListener('click',copyVirtualBackgroundCardLink);
}

function populateVirtualBackgroundCards(){
  const select=$vb('vb-card-select');
  if(!select) return;
  if(!virtualBackgroundState.cards.length){
    select.innerHTML='<option value="">No cards yet</option>';
    select.disabled=true;
    return;
  }
  select.disabled=false;
  select.innerHTML=virtualBackgroundState.cards.map(card=>{
    const name=card.internal_label||card.company_name||card.full_name||'Untitled card';
    const status=card.status==='published'?'Published':'Draft';
    return `<option value="${escapeVbHtml(card.id)}">${escapeVbHtml(name)} · ${status}</option>`;
  }).join('');
}

async function loadVirtualBackgroundCard(cardId){
  const card=virtualBackgroundState.cards.find(item=>item.id===cardId);
  if(!card) return;
  virtualBackgroundState.selectedCard=card;
  const select=$vb('vb-card-select');
  if(select) select.value=card.id;

  const cardUrl=card.slug?liwUrl(`card.html?slug=${encodeURIComponent(card.slug)}`):'';
  const accent=normalizeVbHex(card.button_color||card.primary_color||'#5B5CF0');
  setVbValue('vb-name',card.full_name||'');
  setVbValue('vb-title',card.job_title||'');
  setVbValue('vb-company',card.company_name||'');
  setVbValue('vb-accent',accent);
  setVbValue('vb-profile-image',card.profile_image_url||'');
  setVbValue('vb-card-url',cardUrl);
  syncVirtualAccentValue();

  const token=++virtualBackgroundState.assetToken;
  virtualBackgroundState.profileImage=null;
  virtualBackgroundState.qrCanvas=null;
  renderVirtualBackground();
  setVbStatus('Preparing your profile image and scan-to-card QR…');

  const [profile,qr] = await Promise.all([
    loadVbImage(card.profile_image_url||''),
    buildVirtualQr(cardUrl)
  ]);
  if(token!==virtualBackgroundState.assetToken) return;
  virtualBackgroundState.profileImage=profile;
  virtualBackgroundState.qrCanvas=qr;
  renderVirtualBackground();
  setVbStatus('Ready — download your 1920 × 1080 PNG.');
  $vb('vb-download')?.removeAttribute('disabled');
  if(cardUrl) $vb('vb-copy-link')?.removeAttribute('disabled');
}

async function buildVirtualQr(cardUrl){
  if(!cardUrl||!window.LIWQr?.composeCanvas) return null;
  try{
    const result=await LIWQr.composeCanvas(cardUrl,{size:420,foreground:'#111827',background:'#FFFFFF'});
    return result.canvas||null;
  }catch(error){
    console.warn('Virtual background QR could not load:',error);
    return null;
  }
}

function loadVbImage(url){
  const source=String(url||'').trim();
  if(!/^https?:\/\//i.test(source)) return Promise.resolve(null);
  return new Promise(resolve=>{
    const image=new Image();
    image.crossOrigin='anonymous';
    const timeout=setTimeout(()=>resolve(null),9000);
    image.onload=()=>{clearTimeout(timeout);resolve(image);};
    image.onerror=()=>{clearTimeout(timeout);resolve(null);};
    image.src=source;
  });
}

function renderVirtualBackground(){
  const canvas=$vb('virtual-background-canvas');
  if(!canvas) return;
  canvas.width=1920;
  canvas.height=1080;
  const ctx=canvas.getContext('2d');
  const data=readVirtualBackgroundForm();
  const accent=normalizeVbHex(data.accent);
  drawVirtualBackgroundBase(ctx,canvas.width,canvas.height,virtualBackgroundState.template,accent,data.side);
  drawVirtualBackgroundBranding(ctx,canvas.width,canvas.height,data,accent,virtualBackgroundState.template);
}

function readVirtualBackgroundForm(){
  return {
    name:($vb('vb-name')?.value||'').trim(),
    title:($vb('vb-title')?.value||'').trim(),
    company:($vb('vb-company')?.value||'').trim(),
    accent:normalizeVbHex($vb('vb-accent')?.value||'#5B5CF0'),
    side:$vb('vb-side')?.value==='left'?'left':'right',
    showPhoto:Boolean($vb('vb-show-photo')?.checked),
    showCompany:Boolean($vb('vb-show-company')?.checked),
    showQr:Boolean($vb('vb-show-qr')?.checked),
    showUrl:Boolean($vb('vb-show-url')?.checked),
    cardUrl:($vb('vb-card-url')?.value||'').trim()
  };
}

function drawVirtualBackgroundBase(ctx,width,height,template,accent,side){
  ctx.clearRect(0,0,width,height);
  if(template==='studio'){
    const gradient=ctx.createLinearGradient(0,0,width,height);
    gradient.addColorStop(0,'#F8F9FC');
    gradient.addColorStop(.62,'#FFFFFF');
    gradient.addColorStop(1,mixVbHex(accent,'#FFFFFF',.9));
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle=hexToVbRgba(accent,.07);
    ctx.beginPath();
    ctx.arc(side==='right'?1770:150,150,330,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='rgba(11,20,56,.045)';
    ctx.beginPath();
    ctx.arc(width*.52,height*.96,420,0,Math.PI*2);
    ctx.fill();
    drawVbCornerLines(ctx,width,height,accent,side,.22);
    return;
  }

  if(template==='spotlight'){
    const base=ctx.createLinearGradient(0,0,width,height);
    base.addColorStop(0,'#081128');
    base.addColorStop(.58,'#10183B');
    base.addColorStop(1,mixVbHex(accent,'#0B1438',.38));
    ctx.fillStyle=base;
    ctx.fillRect(0,0,width,height);
    const glow=ctx.createRadialGradient(side==='right'?1650:270,290,20,side==='right'?1650:270,290,520);
    glow.addColorStop(0,hexToVbRgba(accent,.58));
    glow.addColorStop(.48,hexToVbRgba(accent,.18));
    glow.addColorStop(1,hexToVbRgba(accent,0));
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,width,height);
    const floor=ctx.createRadialGradient(width*.5,height*1.12,10,width*.5,height*1.12,700);
    floor.addColorStop(0,'rgba(255,255,255,.10)');
    floor.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=floor;
    ctx.fillRect(0,0,width,height);
    return;
  }

  const gradient=ctx.createLinearGradient(0,0,width,height);
  gradient.addColorStop(0,'#071027');
  gradient.addColorStop(.55,'#0B1438');
  gradient.addColorStop(1,mixVbHex(accent,'#0B1438',.48));
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,width,height);
  ctx.fillStyle='rgba(255,255,255,.035)';
  for(let i=0;i<5;i+=1){
    ctx.beginPath();
    ctx.arc(side==='right'?width-(120+i*76):120+i*76,78+i*54,140+i*55,0,Math.PI*2);
    ctx.fill();
  }
  drawVbCornerLines(ctx,width,height,accent,side,.34);
}

function drawVbCornerLines(ctx,width,height,accent,side,alpha){
  const direction=side==='right'?-1:1;
  const anchor=side==='right'?width:0;
  ctx.save();
  ctx.strokeStyle=hexToVbRgba(accent,alpha);
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(anchor,120);
  ctx.lineTo(anchor+direction*360,0);
  ctx.moveTo(anchor,height-90);
  ctx.lineTo(anchor+direction*500,height);
  ctx.stroke();
  ctx.restore();
}

function drawVirtualBackgroundBranding(ctx,width,height,data,accent,template){
  const dark=template!=='studio';
  const sideRight=data.side==='right';
  const blockWidth=485;
  const blockX=sideRight?width-blockWidth-70:70;
  const contentX=sideRight?blockX+blockWidth:blockX;
  const align=sideRight?'right':'left';
  const textColor=dark?'#FFFFFF':'#101828';
  const subColor=dark?'rgba(255,255,255,.76)':'#5E687B';
  const faint=dark?'rgba(255,255,255,.56)':'#7A8497';

  if(template==='spotlight'){
    const panelX=blockX-28;
    ctx.save();
    ctx.fillStyle='rgba(255,255,255,.08)';
    ctx.strokeStyle='rgba(255,255,255,.14)';
    ctx.lineWidth=2;
    roundedVbRect(ctx,panelX,160,blockWidth+56,760,34);
    ctx.fill();ctx.stroke();
    ctx.restore();
  }

  const photoSize=138;
  const photoX=sideRight?blockX+blockWidth-photoSize:blockX;
  const photoY=238;
  if(data.showPhoto){
    drawVirtualPhoto(ctx,photoX,photoY,photoSize,accent,data.name,textColor,dark);
  }

  const top=data.showPhoto?414:300;
  ctx.textAlign=align;
  ctx.textBaseline='alphabetic';
  ctx.fillStyle=textColor;
  ctx.font='700 56px Inter, Arial, sans-serif';
  const name=data.name||'Your Name';
  drawVbFittedText(ctx,name,contentX,top,blockWidth,56,40,align);

  let cursor=top+48;
  if(data.title){
    ctx.fillStyle=subColor;
    ctx.font='600 27px Inter, Arial, sans-serif';
    drawVbFittedText(ctx,data.title,contentX,cursor,blockWidth,27,21,align);
    cursor+=38;
  }
  if(data.showCompany&&data.company){
    ctx.fillStyle=textColor;
    ctx.font='700 24px Inter, Arial, sans-serif';
    drawVbFittedText(ctx,data.company,contentX,cursor,blockWidth,24,19,align);
    cursor+=38;
  }

  const ruleY=Math.max(cursor+12,560);
  ctx.fillStyle=accent;
  if(sideRight) ctx.fillRect(blockX+blockWidth-96,ruleY,96,6);
  else ctx.fillRect(blockX,ruleY,96,6);

  const qrSize=224;
  const qrY=ruleY+42;
  if(data.showQr&&data.cardUrl){
    const qrX=sideRight?blockX+blockWidth-qrSize:blockX;
    drawVirtualQr(ctx,qrX,qrY,qrSize,dark);
    ctx.fillStyle=faint;
    ctx.font='800 16px Inter, Arial, sans-serif';
    ctx.textAlign=align;
    ctx.fillText('SCAN MY DIGITAL CARD',contentX,qrY+qrSize+31);
  }else{
    ctx.fillStyle=faint;
    ctx.font='700 18px Inter, Arial, sans-serif';
    ctx.textAlign=align;
    ctx.fillText('LIW DIGITAL CARD',contentX,qrY+24);
  }

  if(data.showUrl&&data.cardUrl){
    ctx.fillStyle=subColor;
    ctx.font='600 17px Inter, Arial, sans-serif';
    ctx.textAlign=align;
    const readable=readableVbCardUrl(data.cardUrl);
    const y=(data.showQr?qrY+qrSize+61:qrY+58);
    drawVbFittedText(ctx,readable,contentX,y,blockWidth,17,14,align);
  }

  ctx.save();
  ctx.globalAlpha=dark?.72:.64;
  ctx.fillStyle=textColor;
  ctx.font='700 14px Inter, Arial, sans-serif';
  ctx.textAlign=sideRight?'right':'left';
  ctx.fillText('LIW DIGITAL CARDS',sideRight?width-72:72,height-54);
  ctx.restore();
}

function drawVirtualPhoto(ctx,x,y,size,accent,name,textColor,dark){
  ctx.save();
  ctx.beginPath();
  ctx.arc(x+size/2,y+size/2,size/2+7,0,Math.PI*2);
  ctx.fillStyle=dark?'rgba(255,255,255,.10)':'rgba(11,20,56,.08)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x+size/2,y+size/2,size/2+2,0,Math.PI*2);
  ctx.strokeStyle=accent;
  ctx.lineWidth=6;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x+size/2,y+size/2,size/2-2,0,Math.PI*2);
  ctx.clip();
  if(virtualBackgroundState.profileImage){
    drawVbCoverImage(ctx,virtualBackgroundState.profileImage,x,y,size,size);
  }else{
    ctx.fillStyle=dark?'rgba(255,255,255,.11)':'#E8EAF2';
    ctx.fillRect(x,y,size,size);
    ctx.fillStyle=textColor;
    ctx.font='800 46px Inter, Arial, sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(vbInitials(name),x+size/2,y+size/2+2);
  }
  ctx.restore();
}

function drawVirtualQr(ctx,x,y,size,dark){
  ctx.save();
  ctx.fillStyle='#FFFFFF';
  roundedVbRect(ctx,x,y,size,size,20);
  ctx.fill();
  if(virtualBackgroundState.qrCanvas){
    const pad=15;
    ctx.drawImage(virtualBackgroundState.qrCanvas,x+pad,y+pad,size-pad*2,size-pad*2);
  }else{
    ctx.fillStyle='#F1F3F7';
    roundedVbRect(ctx,x+15,y+15,size-30,size-30,12);
    ctx.fill();
    ctx.fillStyle='#667085';
    ctx.font='700 18px Inter, Arial, sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('QR loading…',x+size/2,y+size/2);
  }
  ctx.strokeStyle=dark?'rgba(255,255,255,.14)':'rgba(11,20,56,.10)';
  ctx.lineWidth=2;
  roundedVbRect(ctx,x,y,size,size,20);
  ctx.stroke();
  ctx.restore();
}

function drawVbCoverImage(ctx,image,x,y,width,height){
  const sourceWidth=image.naturalWidth||image.width||1;
  const sourceHeight=image.naturalHeight||image.height||1;
  const scale=Math.max(width/sourceWidth,height/sourceHeight);
  const drawWidth=sourceWidth*scale;
  const drawHeight=sourceHeight*scale;
  const drawX=x+(width-drawWidth)/2;
  const drawY=y+(height-drawHeight)/2;
  ctx.drawImage(image,drawX,drawY,drawWidth,drawHeight);
}

function drawVbFittedText(ctx,text,x,y,maxWidth,startSize,minSize,align){
  const family='Inter, Arial, sans-serif';
  let size=startSize;
  const weight=/700|800/.test(ctx.font)?ctx.font.split(' ')[0]:'600';
  while(size>minSize){
    ctx.font=`${weight} ${size}px ${family}`;
    if(ctx.measureText(String(text||'')).width<=maxWidth) break;
    size-=1;
  }
  ctx.textAlign=align;
  ctx.fillText(String(text||''),x,y,maxWidth);
}

async function downloadVirtualBackground(){
  const canvas=$vb('virtual-background-canvas');
  if(!canvas) return;
  setVbStatus('Preparing your HD PNG…');
  renderVirtualBackground();
  try{
    const blob=await new Promise((resolve,reject)=>{
      try{canvas.toBlob(result=>result?resolve(result):reject(new Error('Could not create PNG')),'image/png',1);}catch(error){reject(error);}
    });
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    const name=($vb('vb-name')?.value||'liw-card').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'liw-card';
    link.href=url;
    link.download=`${name}-virtual-background-1920x1080.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
    setVbStatus('Downloaded — upload the PNG to Zoom, Meet, or Teams.');
  }catch(error){
    console.error(error);
    setVbStatus('The background could not be exported. Try again after the profile image finishes loading.',true);
  }
}

async function copyVirtualBackgroundCardLink(){
  const value=($vb('vb-card-url')?.value||'').trim();
  if(!value){setVbStatus('This card does not have a public address yet.',true);return;}
  try{
    await navigator.clipboard.writeText(value);
    setVbStatus('Card link copied.');
  }catch(_){
    const area=document.createElement('textarea');
    area.value=value;area.style.position='fixed';area.style.opacity='0';
    document.body.appendChild(area);area.select();
    document.execCommand('copy');area.remove();
    setVbStatus('Card link copied.');
  }
}

function setVbValue(id,value){const node=$vb(id);if(node)node.value=value??'';}
function syncVirtualAccentValue(){
  const color=normalizeVbHex($vb('vb-accent')?.value||'#5B5CF0');
  const label=$vb('vb-accent-value');
  if(label) label.textContent=color.toUpperCase();
}
function setVbStatus(message,isError=false){
  const node=$vb('vb-status');
  if(!node)return;
  node.textContent=message||'';
  node.classList.toggle('error',Boolean(isError));
}
function vbInitials(name){
  const parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return'LIW';
  return (parts.length===1?parts[0].slice(0,2):`${parts[0][0]}${parts[parts.length-1][0]}`).toUpperCase();
}
function readableVbCardUrl(url){
  try{
    const parsed=new URL(url,location.href);
    const slug=parsed.searchParams.get('slug');
    if(slug)return `${parsed.host}/${slug}`;
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/,'');
  }catch(_){return String(url||'');}
}
function normalizeVbHex(value){
  let raw=String(value||'#5B5CF0').trim();
  if(/^#[0-9a-f]{3}$/i.test(raw))raw='#'+raw.slice(1).split('').map(ch=>ch+ch).join('');
  if(!/^#[0-9a-f]{6}$/i.test(raw))return'#5B5CF0';
  return raw.toUpperCase();
}
function mixVbHex(first,second,amount){
  const a=vbHexToRgb(first),b=vbHexToRgb(second),t=Math.max(0,Math.min(1,Number(amount)||0));
  const channel=(x,y)=>Math.round(x+(y-x)*t).toString(16).padStart(2,'0');
  return `#${channel(a.r,b.r)}${channel(a.g,b.g)}${channel(a.b,b.b)}`.toUpperCase();
}
function vbHexToRgb(hex){
  const value=normalizeVbHex(hex).slice(1);
  return{r:parseInt(value.slice(0,2),16),g:parseInt(value.slice(2,4),16),b:parseInt(value.slice(4,6),16)};
}
function hexToVbRgba(hex,alpha){const c=vbHexToRgb(hex);return`rgba(${c.r},${c.g},${c.b},${alpha})`;}
function roundedVbRect(ctx,x,y,width,height,radius){
  const r=Math.min(radius,width/2,height/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+width,y,x+width,y+height,r);ctx.arcTo(x+width,y+height,x,y+height,r);ctx.arcTo(x,y+height,x,y,r);ctx.arcTo(x,y,x+width,y,r);ctx.closePath();
}
function escapeVbHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
