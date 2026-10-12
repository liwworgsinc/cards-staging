/* LIW Cards staging — Super Studio public data parity authority.
   Draft/editor preview and published/public view read one server-authorized payload. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_PUBLIC_DATA_PARITY__)return;
  window.__LIW_SUPER_STUDIO_PUBLIC_DATA_PARITY__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/card\.html$/i.test(location.pathname)))return;

  const TABLES=new Set(['super_studio_state_staging','card_services','social_links','card_products']);
  const payloads=new Map();
  let baseClient=null;
  let proxyClient=null;
  let activeCardId='';

  function resolveBaseClient(){
    try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||null;}
  }

  async function fetchPayload(cardId){
    const id=String(cardId||'').trim();
    if(!id)return null;
    const cached=payloads.get(id);
    if(cached?.data)return cached.data;
    if(cached?.promise)return cached.promise;
    const client=baseClient||resolveBaseClient();
    if(!client?.rpc)return null;
    const promise=client.rpc('public_super_studio_payload_staging',{p_card_id:id})
      .then(result=>{
        if(result?.error)throw result.error;
        const data=result?.data&&typeof result.data==='object'?result.data:null;
        if(data){
          payloads.set(id,{data});
          window.__LIW_SUPER_STUDIO_PUBLIC_PAYLOAD__={cardId:id,...data};
          document.dispatchEvent(new CustomEvent('liw:super-studio-payload-ready',{detail:{cardId:id,payload:data}}));
        }else payloads.delete(id);
        return data;
      })
      .catch(error=>{
        payloads.delete(id);
        console.warn('Super Studio unified public payload:',error);
        return null;
      });
    payloads.set(id,{promise});
    return promise;
  }

  function rowsFor(table,payload){
    if(!payload)return null;
    if(table==='super_studio_state_staging')return payload.state&&typeof payload.state==='object'?{data:payload.state}:null;
    if(table==='card_services')return Array.isArray(payload.services)?payload.services:[];
    if(table==='social_links')return Array.isArray(payload.socials)?payload.socials:[];
    if(table==='card_products')return Array.isArray(payload.products)?payload.products:[];
    return null;
  }

  function makeBuilder(table){
    const state={cardId:activeCardId,filters:[]};
    const builder={
      select(){return builder;},
      eq(column,value){
        state.filters.push([String(column||''),value]);
        if(column==='card_id')state.cardId=String(value||'').trim();
        return builder;
      },
      order(){return builder;},
      limit(){return builder;},
      async maybeSingle(){
        const payload=await fetchPayload(state.cardId);
        if(!payload)return {data:null,error:null};
        const row=rowsFor(table,payload);
        return {data:row,error:null};
      },
      async single(){
        const result=await builder.maybeSingle();
        if(result.data==null)return {data:null,error:{message:'No row'}};
        return result;
      },
      then(resolve,reject){
        return fetchPayload(state.cardId).then(payload=>{
          if(!payload)return {data:table==='super_studio_state_staging'?null:[],error:null};
          const rows=rowsFor(table,payload);
          return {data:table==='super_studio_state_staging'?(rows?[rows]:[]):rows,error:null};
        }).then(resolve,reject);
      },
      catch(reject){return builder.then(value=>value,reject);},
      finally(callback){return Promise.resolve(builder).finally(callback);}
    };
    return builder;
  }

  function install(card){
    if(!card||String(card.card_experience||'').toLowerCase()!=='super-studio')return false;
    activeCardId=String(card.id||'').trim();
    const current=resolveBaseClient();
    if(!current)return false;
    if(current===proxyClient){void fetchPayload(activeCardId);return true;}
    baseClient=current;
    proxyClient=new Proxy(baseClient,{
      get(target,property){
        if(property==='from')return table=>TABLES.has(String(table||''))?makeBuilder(String(table)):target.from.call(target,table);
        const value=target[property];
        return typeof value==='function'?value.bind(target):value;
      }
    });
    window.__LIW_PUBLIC_CARD_DATA_CLIENT__=proxyClient;
    window.LIWSuperStudioPublicData={fetch:fetchPayload,get cardId(){return activeCardId;}};
    void fetchPayload(activeCardId);
    return true;
  }

  document.addEventListener('liw:public-card-ready',event=>install(event.detail?.card));
  document.addEventListener('liw:public-card-rendered',event=>install(event.detail?.card));
  setTimeout(()=>{try{if(typeof publicCard!=='undefined'&&publicCard)install(publicCard);}catch(_){}},0);
})();
