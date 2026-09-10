/* LIW Cards staging — global automatic text contrast.
   One shared, event-driven contrast engine for Classic, Flow, Showtime and Barbershop.
   No MutationObserver, no polling and no repeating timers. */
(function(global){
  'use strict';
  if(global.LIWAutoContrast)return;

  const DARK='#111827';
  const LIGHT='#f8fafc';
  let editorRenderWrapped=false;
  let editorSyncing=false;

  function clamp(value,min,max){return Math.min(max,Math.max(min,value));}

  function rgb(value){
    if(!value)return null;
    const input=String(value).trim().toLowerCase();
    if(input==='black')return {r:0,g:0,b:0};
    if(input==='white')return {r:255,g:255,b:255};
    if(input==='transparent')return null;
    if(input.startsWith('#')){
      const hex=input.slice(1);
      if(/^[0-9a-f]{3}$/i.test(hex)){
        return {
          r:parseInt(hex[0]+hex[0],16),
          g:parseInt(hex[1]+hex[1],16),
          b:parseInt(hex[2]+hex[2],16)
        };
      }
      if(/^[0-9a-f]{6}$/i.test(hex)||/^[0-9a-f]{8}$/i.test(hex)){
        return {r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)};
      }
    }
    const match=input.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if(match)return {r:clamp(Number(match[1]),0,255),g:clamp(Number(match[2]),0,255),b:clamp(Number(match[3]),0,255)};
    return null;
  }

  function channel(value){
    const n=clamp(Number(value)||0,0,255)/255;
    return n<=0.04045?n/12.92:Math.pow((n+0.055)/1.055,2.4);
  }

  function luminance(color){
    const value=rgb(color);
    if(!value)return null;
    return 0.2126*channel(value.r)+0.7152*channel(value.g)+0.0722*channel(value.b);
  }

  function contrastRatio(foreground,background){
    const fg=luminance(foreground);
    const bg=luminance(background);
    if(fg===null||bg===null)return 1;
    const light=Math.max(fg,bg);
    const dark=Math.min(fg,bg);
    return (light+0.05)/(dark+0.05);
  }

  function bestText(background,{dark=DARK,light=LIGHT}={}){
    const bg=rgb(background)?background:'#ffffff';
    return contrastRatio(dark,bg)>=contrastRatio(light,bg)?dark:light;
  }

  function accessibleColor(preferred,background,minRatio=4.5){
    if(rgb(preferred)&&contrastRatio(preferred,background)>=minRatio)return preferred;
    return bestText(background);
  }

  function currentPublicData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}
  }

  function publicBackground(card,data){
    const fromData=data?.background_color;
    if(rgb(fromData))return fromData;
    const inline=card?.style?.backgroundColor||card?.style?.background;
    if(rgb(inline))return inline;
    try{
      const computed=getComputedStyle(card).backgroundColor;
      if(rgb(computed))return computed;
    }catch(_){ }
    return '#ffffff';
  }

  function applyPublic(){
    if(typeof document==='undefined')return false;
    const card=document.getElementById('card');
    if(!card||card.hidden)return false;
    const data=currentPublicData()||{};
    const background=publicBackground(card,data);
    const primary=rgb(data.primary_color)?data.primary_color:(getComputedStyle(card).getPropertyValue('--card-primary').trim()||'#0b1438');
    const button=rgb(data.button_color)?data.button_color:(getComputedStyle(card).getPropertyValue('--card-button').trim()||primary);
    const text=bestText(background);
    const accent=accessibleColor(primary,background,4.5);
    const buttonText=bestText(button);

    /* Runtime-only correction also feeds experience scripts that read publicCard later. */
    try{
      if(data&&typeof data==='object'){
        data.text_color=text;
        data.button_text_color=buttonText;
      }
    }catch(_){ }

    card.dataset.liwAutoContrast='true';
    card.style.setProperty('color',text,'important');
    card.style.setProperty('--liw-auto-text',text);
    card.style.setProperty('--liw-auto-accent',accent);
    card.style.setProperty('--liw-auto-button-text',buttonText);
    card.style.setProperty('--card-button-text',buttonText);
    card.style.setProperty('--flow-brand-button-text',buttonText);
    card.style.setProperty('--music-template-text',text);
    card.style.setProperty('--music-text',text);
    card.style.setProperty('--hub-text',text);
    card.style.setProperty('--music-template-button-text',buttonText);
    card.style.setProperty('--barber-text',text);

    ['#name','#headline','#bio'].forEach(selector=>{
      card.querySelectorAll(selector).forEach(node=>node.style.setProperty('color',text,'important'));
    });
    ['#title','#company'].forEach(selector=>{
      card.querySelectorAll(selector).forEach(node=>node.style.setProperty('color',accent,'important'));
    });

    try{global.dispatchEvent(new CustomEvent('liw:auto-contrast-applied',{detail:{background,text,accent,buttonText}}));}catch(_){ }
    return true;
  }

  function editorField(name){
    if(typeof document==='undefined')return null;
    return document.querySelector(`[name="${name}"]`);
  }

  function addEditorHint(field,message){
    if(!field||field.dataset.liwAutoContrastHint==='true')return;
    field.dataset.liwAutoContrastHint='true';
    field.title=message;
    const group=field.closest('.form-group');
    if(!group||group.querySelector('[data-liw-auto-contrast-note]'))return;
    const note=document.createElement('div');
    note.className='input-help';
    note.dataset.liwAutoContrastNote='true';
    note.textContent=message;
    group.appendChild(note);
  }

  function syncEditorFields(){
    if(typeof document==='undefined'||editorSyncing)return false;
    const backgroundField=editorField('background_color');
    const textField=editorField('text_color');
    if(!backgroundField||!textField)return false;
    editorSyncing=true;
    try{
      const buttonField=editorField('button_color');
      const buttonTextField=editorField('button_text_color');
      const primaryField=editorField('primary_color');
      const background=rgb(backgroundField.value)?backgroundField.value:'#ffffff';
      const button=rgb(buttonField?.value)?buttonField.value:(rgb(primaryField?.value)?primaryField.value:'#0b1438');
      const text=bestText(background);
      const buttonText=bestText(button);
      let changed=false;
      if(textField.value.toLowerCase()!==text.toLowerCase()){
        textField.value=text;
        changed=true;
      }
      if(buttonTextField&&buttonTextField.value.toLowerCase()!==buttonText.toLowerCase()){
        buttonTextField.value=buttonText;
        changed=true;
      }

      addEditorHint(textField,'Auto contrast: LIW switches this text light or dark to stay readable on the card background.');
      addEditorHint(buttonTextField,'Auto contrast: LIW switches filled-button text light or dark to stay readable.');

      const phone=document.getElementById('phone-preview');
      if(phone){
        phone.dataset.liwAutoContrast='true';
        phone.style.setProperty('--liw-auto-text',text);
        phone.style.setProperty('--preview-button-text',buttonText);
        phone.style.color=text;
      }
      return changed;
    }finally{editorSyncing=false;}
  }

  function wrapEditorRender(){
    if(editorRenderWrapped||typeof global.render!=='function')return false;
    const normalRender=global.render;
    global.render=function(){
      syncEditorFields();
      return normalRender.apply(this,arguments);
    };
    editorRenderWrapped=true;
    return true;
  }

  function refreshEditor(){
    const isEditor=typeof document!=='undefined'&&document.body?.classList?.contains('editor-page');
    if(!isEditor)return false;
    wrapEditorRender();
    const changed=syncEditorFields();
    if(changed&&typeof global.render==='function'){
      try{global.render();}catch(_){ }
    }
    return true;
  }

  function refresh(){
    const editor=refreshEditor();
    const card=applyPublic();
    return editor||card;
  }

  const api={rgb,luminance,contrastRatio,bestText,accessibleColor,applyPublic,syncEditorFields,refresh};
  global.LIWAutoContrast=api;

  if(typeof document==='undefined')return;

  document.addEventListener('input',event=>{
    const name=event.target?.name;
    if(['background_color','button_color','primary_color','secondary_color'].includes(name))syncEditorFields();
  },true);
  document.addEventListener('change',event=>{
    const name=event.target?.name;
    if(['background_color','button_color','primary_color','secondary_color','template_id'].includes(name))syncEditorFields();
  },true);

  global.addEventListener('liw:card-loader-ready',applyPublic,{passive:true});
  global.addEventListener('liw:barber-client-ready',applyPublic,{passive:true});
  global.addEventListener('load',refresh,{once:true,passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})(typeof window!=='undefined'?window:globalThis);
