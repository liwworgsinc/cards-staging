(function(){
  'use strict';
  if(window.__LIW_MUSIC_FREE_AD__)return;
  window.__LIW_MUSIC_FREE_AD__=true;

  const PLACEMENT='music_home_bottom';
  let renderedCampaignId='';

  function safe(value,max=500){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return safe(value,2000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function isMusic(){try{return String(publicCard?.card_experience||'').toLowerCase()==='music';}catch(_){return false;}}
  function isOwnerPreview(){try{return typeof ownerPreview!=='undefined'&&ownerPreview===true;}catch(_){return false;}}

  async function planKey(){
    try{
      if(isOwnerPreview()&&typeof getLiwAccessContext==='function'){
        const {data}=await supabaseClient.auth.getUser();
        if(data?.user){
          const access=await getLiwAccessContext(data.user,{refresh:true});
          if(access?.planKey)return String(access.planKey).toLowerCase();
        }
      }
    }catch(error){console.warn('[LIW Music Ads] preview plan unavailable',error);}
    try{
      if(!publicCard?.id)return '';
      const {data,error}=await supabaseClient.rpc('public_card_plan_key',{p_card_id:publicCard.id});
      if(error)throw error;
      return String(data||'').toLowerCase();
    }catch(error){console.warn('[LIW Music Ads] plan lookup unavailable',error);return '';}
  }

  async function activeCampaign(){
    try{
      const {data,error}=await supabaseClient.rpc('public_music_ad_campaign',{p_placement:PLACEMENT});
      if(error)throw error;
      return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
    }catch(error){console.warn('[LIW Music Ads] campaign unavailable',error);return {};}
  }

  function removeSlot(){
    document.querySelector('.music-free-ad-slot')?.remove();
    const card=document.querySelector('.music-card-active');
    card?.classList.remove('music-plan-free','music-plan-paid','music-has-free-ad');
    renderedCampaignId='';
  }

  function validHttpUrl(value){
    try{const url=new URL(String(value||''));return /^https?:$/.test(url.protocol)?url.href:'';}catch(_){return '';}
  }

  function buildAd(campaign){
    const href=validHttpUrl(campaign.destination_url);
    const headline=safe(campaign.headline,120);
    if(!href||!headline)return null;
    const label=safe(campaign.label,40)||'Sponsored';
    const body=safe(campaign.body,180);
    const image=validHttpUrl(campaign.image_url);
    const button=safe(campaign.button_text,32)||'Learn more';
    const aside=document.createElement('aside');
    aside.className='music-free-ad-slot';
    aside.dataset.campaignId=safe(campaign.id,80);
    aside.setAttribute('aria-label',`${label}: ${headline}`);
    aside.innerHTML=`
      <a class="music-free-ad-link" href="${esc(href)}" target="_blank" rel="noopener sponsored">
        ${image?`<span class="music-free-ad-art" style="background-image:url('${image.replace(/'/g,'%27')}')"></span>`:'<span class="music-free-ad-art music-free-ad-art-fallback"><i data-lucide="sparkles" size="20"></i></span>'}
        <span class="music-free-ad-copy"><small>${esc(label)}</small><strong>${esc(headline)}</strong>${body?`<span>${esc(body)}</span>`:''}</span>
        <span class="music-free-ad-cta">${esc(button)} <i data-lucide="arrow-up-right" size="14"></i></span>
      </a>`;
    aside.querySelector('a')?.addEventListener('click',()=>{
      try{window.track?.('music_ad_click',campaign.id,{campaign_id:campaign.id,placement:PLACEMENT});}catch(_){ }
    });
    return aside;
  }

  function mountAd(campaign){
    const card=document.querySelector('.music-card-active');
    const content=card?.querySelector('.public-content');
    if(!card||!content)return false;
    const node=buildAd(campaign);
    if(!node)return false;
    document.querySelector('.music-free-ad-slot')?.remove();
    content.appendChild(node);
    card.classList.add('music-plan-free','music-has-free-ad');
    card.classList.remove('music-plan-paid');
    renderedCampaignId=safe(campaign.id,80);
    try{window.track?.('music_ad_impression',campaign.id,{campaign_id:campaign.id,placement:PLACEMENT});}catch(_){ }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  async function run(){
    if(!isMusic())return false;
    const card=document.querySelector('.music-card-active');
    if(!card)return false;
    const plan=await planKey();
    if(!plan)return false;
    if(plan!=='starter'&&plan!=='free'){
      document.querySelector('.music-free-ad-slot')?.remove();
      card.classList.add('music-plan-paid');
      card.classList.remove('music-plan-free','music-has-free-ad');
      renderedCampaignId='';
      return true;
    }
    const campaign=await activeCampaign();
    if(!campaign?.id){
      document.querySelector('.music-free-ad-slot')?.remove();
      card.classList.add('music-plan-free');
      card.classList.remove('music-plan-paid','music-has-free-ad');
      renderedCampaignId='';
      return true;
    }
    if(renderedCampaignId===String(campaign.id)&&document.querySelector('.music-free-ad-slot'))return true;
    return mountAd(campaign);
  }

  let attempts=0;
  const timer=setInterval(async()=>{
    attempts+=1;
    const done=await run();
    if(done&&attempts>12)clearInterval(timer);
    if(attempts>80)clearInterval(timer);
  },250);

  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(run,80);});
  window.addEventListener('pageshow',()=>setTimeout(run,80));
})();