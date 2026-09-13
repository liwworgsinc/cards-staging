/* LIW Cards staging — make the Barbershop Book dock honor Appointments V2 booking mode. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_BOOKING_ROUTE_V2__)return;
  window.__LIW_BARBER_BOOKING_ROUTE_V2__=true;

  const slug=new URLSearchParams(location.search).get('slug')||'';
  let mode='liw';
  let externalUrl='';
  let routeReady=false;
  let patched=false;

  function client(){
    try{return window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.supabaseClient||null;}
  }

  function safeUrl(value){
    try{const url=new URL(String(value||'').trim());return ['http:','https:'].includes(url.protocol)?url.href:'';}catch(_){return '';}
  }

  function openExternal(){
    const href=safeUrl(externalUrl);
    if(!href)return false;
    try{if(typeof window.track==='function')window.track('booking_click',null,{source:'barbershop_booking_mode'});}catch(_){ }
    const opened=window.open(href,'_blank','noopener');
    if(!opened)location.href=href;
    return true;
  }

  function patchRoom(attempt=0){
    const room=window.LIWBarberClientRoom;
    if(!room){if(attempt<80)setTimeout(()=>patchRoom(attempt+1),100);return;}
    if(patched)return;
    patched=true;
    const originalOpen=typeof room.openNativeAppointment==='function'?room.openNativeAppointment.bind(room):null;
    const originalSetRoom=typeof room.setRoom==='function'?room.setRoom.bind(room):null;

    room.openNativeAppointment=function(){
      if(routeReady&&mode==='external'&&openExternal())return;
      return originalOpen?.();
    };
    room.setRoom=function(key){
      if(key==='book'&&routeReady&&mode==='external'&&openExternal())return;
      return originalSetRoom?.(key);
    };
  }

  async function loadRoute(attempt=0){
    if(!slug){routeReady=true;patchRoom();return;}
    const c=client();
    if(!c){if(attempt<80)setTimeout(()=>loadRoute(attempt+1),100);return;}
    try{
      const {data,error}=await c.rpc('booking_public_route_staging',{p_slug:slug});
      if(error)throw error;
      mode=data?.mode==='external'?'external':'liw';
      externalUrl=String(data?.external_url||'').trim();
    }catch(error){
      console.warn('LIW barber booking route:',error);
      mode='liw';externalUrl='';
    }finally{
      routeReady=true;
      patchRoom();
    }
  }

  loadRoute();
  patchRoom();
})();
