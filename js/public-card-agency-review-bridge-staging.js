/* LIW Cards — staging-only private Agency review bridge for the real public-card renderer. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_REVIEW_CARD_BRIDGE__)return;
  window.__LIW_AGENCY_REVIEW_CARD_BRIDGE__=true;
  if(!window.supabaseClient)return;

  const params=new URLSearchParams(location.search);
  const token=String(params.get('agency_review_token')||'').trim();
  if(!/^[0-9a-f-]{30,80}$/i.test(token))return;

  const REVIEW_USER_ID='00000000-0000-0000-0000-000000000001';
  const originalFrom=supabaseClient.from.bind(supabaseClient);
  const originalRpc=supabaseClient.rpc.bind(supabaseClient);
  const originalGetUser=supabaseClient.auth?.getUser?.bind(supabaseClient.auth);
  let payloadPromise=null;

  function baseFeatureAccess(payload){
    const whiteLabel=Boolean(payload?.branding?.whiteLabel);
    return {
      video_section:true,
      file_downloads:true,
      custom_qr:true,
      custom_seo:true,
      cover_image:true,
      expanded_fonts:true,
      remove_branding:true,
      custom_branding_link:whiteLabel,
      appointment_booking:true,
      lead_capture:true,
      product_showcase:true,
      services_section:true,
      payment_sharing:true,
      rich_sections:true,
      flow_experience:true,
      profile_border_color:true,
      premium_templates:true,
      template_is_premium:false,
      product_limit:24,
      download_limit:24
    };
  }

  async function loadPayload(){
    if(payloadPromise)return payloadPromise;
    payloadPromise=(async()=>{
      const {data,error}=await supabaseClient.functions.invoke('review-agency-card',{body:{token,action:'load'}});
      if(error){
        let message=error.message||'Unable to load review card.';
        try{const body=await error.context?.json?.();if(body?.error)message=body.error;}catch(_){ }
        throw new Error(message);
      }
      if(data?.error)throw new Error(data.error);
      return data;
    })();
    return payloadPromise;
  }

  function reviewDataFor(table,payload){
    const preview=payload?.preview||{};
    if(table==='digital_cards'){
      const card={...(preview.card||{})};
      // Force renderer preview mode so review visits never create analytics or submit leads.
      card._review_original_status=card.status;
      card.status='draft';
      card.user_id=REVIEW_USER_ID;
      return card;
    }
    if(table==='social_links')return preview.socialLinks||[];
    if(table==='card_services')return preview.services||[];
    if(table==='card_products')return preview.products||[];
    if(table==='card_downloads')return preview.downloads||[];
    if(table==='card_sections')return preview.sections||[];
    return null;
  }

  function makeQuery(table){
    const builder={
      select(){return builder;},
      eq(){return builder;},
      neq(){return builder;},
      is(){return builder;},
      in(){return builder;},
      order(){return builder;},
      limit(){return builder;},
      range(){return builder;},
      maybeSingle(){
        return loadPayload().then(payload=>({data:reviewDataFor(table,payload),error:null})).catch(error=>({data:null,error}));
      },
      single(){
        return loadPayload().then(payload=>({data:reviewDataFor(table,payload),error:null})).catch(error=>({data:null,error}));
      },
      then(resolve,reject){
        return loadPayload().then(payload=>resolve({data:reviewDataFor(table,payload),error:null}),error=>{
          if(reject)return reject(error);
          return resolve({data:null,error});
        });
      }
    };
    return builder;
  }

  supabaseClient.from=function(table){
    if(['digital_cards','social_links','card_services','card_products','card_downloads','card_sections'].includes(table))return makeQuery(table);
    return originalFrom(table);
  };

  supabaseClient.rpc=function(name,args,options){
    if(name==='public_card_feature_access'){
      return loadPayload().then(payload=>({data:baseFeatureAccess(payload),error:null})).catch(error=>({data:null,error}));
    }
    return originalRpc(name,args,options);
  };

  if(supabaseClient.auth&&originalGetUser){
    supabaseClient.auth.getUser=async function(){return {data:{user:{id:REVIEW_USER_ID,email:null}},error:null};};
  }

  if(typeof window.getLiwAccessContext==='function'){
    window.getLiwAccessContext=async function(){
      const payload=await loadPayload();
      const entitlements=baseFeatureAccess(payload);
      return {planKey:payload?.branding?.whiteLabel?'white_label':'agency',entitlements,isAdmin:false,has:key=>entitlements[key]===true};
    };
  }

  // The normal renderer's owner-preview banner is not appropriate for a client review.
  const observer=new MutationObserver(()=>{
    const card=document.getElementById('card');
    const banner=document.getElementById('preview-banner');
    if(card&&!card.hidden){
      document.body.classList.add('agency-review-card-frame');
      if(banner)banner.hidden=true;
      observer.disconnect();
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
})();
