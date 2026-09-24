(function(){
'use strict';
const $=id=>document.getElementById(id);
const els={select:$('card-select'),name:$('card-name'),subtitle:$('card-subtitle'),img:$('qr-image'),placeholder:$('placeholder'),status:$('status'),link:$('card-link'),share:$('share'),copy:$('copy'),save:$('save'),view:$('view'),install:$('install')};
let user=null,cards=[],selected=null,qrData='',installPrompt=null,renderToken=0;
const storageKey=id=>'liw-qr-widget-v1:'+id;
function note(message,error=false){els.status.textContent=message;els.status.classList.toggle('error',error);}
function reset(){selected=null;qrData='';els.img.hidden=true;els.img.removeAttribute('src');els.placeholder.hidden=false;els.share.disabled=els.copy.disabled=els.save.disabled=true;els.view.href='../dashboard.html';els.link.textContent='';}
function cardUrl(card){return liwUrl('card.html?slug='+encodeURIComponent(card.slug));}
async function render(id){
const token=++renderToken;
selected=cards.find(c=>c.id===id&&c.status==='published'&&c.slug)||null;reset();
if(!selected){note('Select a published card.');return;}
const url=cardUrl(selected);
els.name.textContent=selected.full_name||selected.company_name||'My digital card';
els.subtitle.textContent=selected.company_name||selected.job_title||'Scan to connect';
els.link.textContent=url;els.view.href=url;els.share.disabled=els.copy.disabled=false;
note('Generating your QR…');
try{
const imageUrl=window.LIWQr?.buildImageUrl?.(url,{size:720,foreground:selected.qr_color||'#000000',background:selected.qr_background_color||'#FFFFFF'}).url;
if(!imageUrl)throw Error('QR service unavailable');
const response=await fetch(imageUrl,{mode:'cors'});
if(!response.ok)throw Error('QR image unavailable');
const blob=await response.blob();if(!blob.type.startsWith('image/'))throw Error('Invalid QR image');
const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Image could not be stored'));reader.readAsDataURL(blob);});
if(token!==renderToken)return;
qrData=encoded;els.img.src=qrData;els.img.hidden=false;els.placeholder.hidden=true;els.save.disabled=false;note('Ready to scan · saved for offline viewing');
try{localStorage.setItem(storageKey(user.id),JSON.stringify({id:selected.id,url,qr:qrData,name:els.name.textContent,subtitle:els.subtitle.textContent}));}catch(_){note('Ready to scan · offline storage unavailable');}
}catch(error){
if(token!==renderToken)return;
let cached=null;try{cached=JSON.parse(localStorage.getItem(storageKey(user.id))||'null');}catch(_){}
if(cached&&cached.id===selected.id&&cached.url===url&&/^data:image\//.test(cached.qr||'')){qrData=cached.qr;els.img.src=qrData;els.img.hidden=false;els.placeholder.hidden=true;els.save.disabled=false;note('Offline copy · verify that your card link remains published');}
else note('QR unavailable. Connect to the internet and try again.',true);
}
}
async function init(){
reset();note('Checking your LIW Cards account…');
try{
user=await getLiwSessionUser();
if(!user){els.select.innerHTML='<option>Sign in required</option>';els.placeholder.textContent='Sign in to load your published cards.';note('Sign in through LIW Cards first.');els.view.href='../login.html';els.view.textContent='Sign in';return;}
const {data,error}=await supabaseClient.from('digital_cards').select('id,user_id,slug,status,full_name,company_name,job_title,qr_color,qr_background_color').eq('user_id',user.id).eq('status','published').order('updated_at',{ascending:false});
if(error){let cached=null;try{cached=JSON.parse(localStorage.getItem(storageKey(user.id))||'null');}catch(_){}if(cached&&cached.id&&cached.url&&/^data:image\\//.test(cached.qr||'')){els.select.innerHTML='<option>Offline saved QR</option>';els.name.textContent=cached.name||'My digital card';els.subtitle.textContent=cached.subtitle||'Scan to connect';els.link.textContent=cached.url;els.img.src=cached.qr;els.img.hidden=false;els.placeholder.hidden=true;qrData=cached.qr;els.save.disabled=false;note('Offline saved QR · card availability cannot be checked');return;}throw error;}
cards=(data||[]).filter(c=>c.slug);
if(!cards.length){els.select.innerHTML='<option>No published cards yet</option>';els.placeholder.textContent='Publish a card from your dashboard to create your QR.';note('No published cards available.');return;}
els.select.replaceChildren(...cards.map(c=>{const option=document.createElement('option');option.value=c.id;option.textContent=c.company_name||c.full_name||c.slug;return option;}));
els.select.disabled=false;
let pref='';try{pref=new URLSearchParams(location.search).get('card')||JSON.parse(localStorage.getItem(storageKey(user.id))||'null')?.id||'';}catch(_){}
els.select.value=cards.some(c=>c.id===pref)?pref:cards[0].id;
await render(els.select.value);
}catch(error){note('Could not load your cards. Please try again online.',true);els.placeholder.textContent='Your card data is not available.';}
}
els.select.addEventListener('change',()=>render(els.select.value));
els.copy.addEventListener('click',async()=>{if(!selected)return;try{await navigator.clipboard.writeText(cardUrl(selected));note('Card link copied.');}catch(_){note('Could not copy the link.',true);}});
els.share.addEventListener('click',async()=>{if(!selected)return;const url=cardUrl(selected);try{if(navigator.share)await navigator.share({title:els.name.textContent,url});else{await navigator.clipboard.writeText(url);note('Card link copied.');}}catch(e){if(e.name!=='AbortError')note('Could not share this card.',true);}});
els.save.addEventListener('click',()=>{if(!qrData||!selected)return;const a=document.createElement('a');a.href=qrData;a.download='liw-card-qr-'+selected.slug+'.png';document.body.append(a);a.click();a.remove();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;els.install.hidden=false;});
els.install.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;els.install.hidden=true;});
window.addEventListener('appinstalled',()=>{els.install.hidden=true;installPrompt=null;});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
init();
})();