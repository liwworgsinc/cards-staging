(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const presets=['#0B1438','#15234D','#2563EB','#0EA5E9','#06B6D4','#14B8A6','#16A34A','#84CC16','#F59E0B','#D4A84F','#F97316','#EF4444','#EC4899','#A855F7','#7C3AED','#111827','#64748B','#FFFFFF'];
let activeIndex=null,previousValue='#0B1438',draft='#0B1438';
function valid(v){return /^#[0-9A-F]{6}$/i.test(String(v||'').trim())}
function normalize(v){const x=String(v||'').trim().toUpperCase();return valid(x)?x:null}
function trigger(index){return document.getElementById(`brand_color_${index}_picker`)}
function field(index){return document.getElementById(`brand_color_${index}`)}
function sync(index,value,save=true){const hex=normalize(value);if(!hex)return false;const b=trigger(index),t=field(index);if(b){b.value=hex;b.style.setProperty('--swatch',hex);b.setAttribute('aria-label',`Choose ${index===1?'primary':index===2?'secondary':'accent'} color, current ${hex}`)}if(t&&t.value!==hex)t.value=hex;if(save&&typeof t?.dispatchEvent==='function')t.dispatchEvent(new Event('input',{bubbles:true}));return true}
function renderPresets(){const grid=$('#dw-color-preset-grid');if(!grid)return;grid.innerHTML=presets.map(c=>`<button type="button" class="dw-color-option" data-color="${c}" style="--option:${c}" aria-label="Choose ${c}"><span></span></button>`).join('');grid.querySelectorAll('[data-color]').forEach(btn=>btn.addEventListener('click',()=>selectDraft(btn.dataset.color)))}
function selectDraft(value){const hex=normalize(value);if(!hex)return;draft=hex;const input=$('#dw-color-custom-hex'),preview=$('#dw-color-preview');if(input)input.value=hex;if(preview)preview.style.setProperty('--preview',hex);$$('.dw-color-option').forEach(b=>b.classList.toggle('selected',b.dataset.color===hex))}
function openPicker(index){const t=field(index);if(!t||t.disabled)return;activeIndex=index;previousValue=normalize(t.value)||['#0B1438','#D4A84F','#FFFFFF'][index-1];draft=previousValue;const modal=$('#dw-color-modal'),title=$('#dw-color-modal-title');if(title)title.textContent=`Choose ${index===1?'primary':index===2?'secondary':'accent'} color`;selectDraft(draft);if(modal){modal.hidden=false;requestAnimationFrame(()=>modal.classList.add('open'));document.body.classList.add('dw-color-modal-open');$('#dw-color-custom-hex')?.focus({preventScroll:true})}}
function closePicker(){const modal=$('#dw-color-modal');if(modal){modal.classList.remove('open');setTimeout(()=>{modal.hidden=true},160)}document.body.classList.remove('dw-color-modal-open');activeIndex=null}
function apply(){if(activeIndex&&sync(activeIndex,draft,true))closePicker()}
function cancel(){if(activeIndex)sync(activeIndex,previousValue,false);closePicker()}
function init(){renderPresets();for(let i=1;i<=3;i++){const b=trigger(i),t=field(i);if(!b||!t)continue;sync(i,t.value,false);b.addEventListener('click',()=>openPicker(i));t.addEventListener('input',()=>{const hex=normalize(t.value);if(hex){b.value=hex;b.style.setProperty('--swatch',hex)}});t.addEventListener('blur',()=>{const hex=normalize(t.value);if(hex)sync(i,hex,true)})}
 $('#dw-color-custom-hex')?.addEventListener('input',e=>{const value=e.target.value.trim();if(valid(value))selectDraft(value)});
 $('#dw-color-cancel')?.addEventListener('click',cancel);$('#dw-color-apply')?.addEventListener('click',apply);$('#dw-color-modal-backdrop')?.addEventListener('click',cancel);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeIndex)cancel()});window.lucide?.createIcons?.();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
