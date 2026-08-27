/* LIW Cards — cards-staging only: public-card load reliability + SEO QA layer.
   Analytics must never hold the visual load timeout open after the card renders.
   Published cards receive production-ready SEO metadata; staging remains globally
   blocked by robots.txt until this is promoted to cards production. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_LOAD_GUARD__)return;
  window.__LIW_PUBLIC_CARD_LOAD_GUARD__=true;

  const PRODUCTION_CARD_BASE='https://cards.liwworgs.com/card.html';
  const DEFAULT_SHARE_IMAGE='https://cards.liwworgs.com/assets/icons/pwa-share.png';

  const originalRecordView=typeof window.recordView==='function'?window.recordView:null;
  if(originalRecordView){
    window.recordView=function(cardId){
      Promise.resolve().then(()=>originalRecordView(cardId)).catch(()=>{});
      return Promise.resolve();
    };
  }

  const originalShowUnavailable=typeof window.showUnavailable==='function'?window.showUnavailable:null;
  if(originalShowUnavailable){
    window.showUnavailable=function(title,message){
      const card=document.getElementById('card');
      if(String(title)==='Still loading'&&card&&!card.hidden)return;
      markUnavailableNoindex();
      return originalShowUnavailable(title,message);
    };
  }

  function clean(value){
    return String(value||'').replace(/\s+/g,' ').trim();
  }

  function truncate(value,max){
    const text=clean(value);
    if(text.length<=max)return text;
    return text.slice(0,Math.max(0,max-1)).replace(/[\s,.;:!?-]+$/,'')+'…';
  }

  function setNamedMeta(name,content){
    if(!content)return;
    let node=document.head.querySelector(`meta[name="${name}"]`);
    if(!node){
      node=document.createElement('meta');
      node.setAttribute('name',name);
      document.head.appendChild(node);
    }
    node.setAttribute('content',content);
  }

  function setPropertyMeta(property,content){
    if(!content)return;
    let node=document.head.querySelector(`meta[property="${property}"]`);
    if(!node){
      node=document.createElement('meta');
      node.setAttribute('property',property);
      document.head.appendChild(node);
    }
    node.setAttribute('content',content);
  }

  function setRobots(content){
    const nodes=[...document.head.querySelectorAll('meta[name="robots"]')];
    if(!nodes.length){
      const node=document.createElement('meta');
      node.setAttribute('name','robots');
      document.head.appendChild(node);
      nodes.push(node);
    }
    nodes.forEach(node=>node.setAttribute('content',content));
    setNamedMeta('googlebot',content);
  }

  function setCanonical(url){
    let node=document.head.querySelector('link[rel="canonical"]');
    if(!node){
      node=document.createElement('link');
      node.setAttribute('rel','canonical');
      document.head.appendChild(node);
    }
    node.setAttribute('href',url);
  }

  function replaceStructuredData(payload){
    const prior=document.getElementById('liw-public-card-schema');
    if(prior)prior.remove();
    if(!payload)return;
    const node=document.createElement('script');
    node.id='liw-public-card-schema';
    node.type='application/ld+json';
    node.textContent=JSON.stringify(payload).replace(/</g,'\\u003c');
    document.head.appendChild(node);
  }

  function buildAutomaticTitle(cardData){
    const name=clean(cardData.full_name)||'Digital Business Card';
    const role=clean(cardData.job_title);
    const company=clean(cardData.company_name);
    const candidates=[
      [name,role,company].filter(Boolean).join(' | '),
      [name,role].filter(Boolean).join(' | '),
      [name,company].filter(Boolean).join(' | '),
      `${name} | Digital Business Card`
    ];
    return truncate(candidates.find(item=>item.length<=60)||candidates[candidates.length-1],60);
  }

  function buildAutomaticDescription(cardData){
    const bio=clean(cardData.biography);
    if(bio)return truncate(bio,160);
    const headline=clean(cardData.headline);
    if(headline)return truncate(headline,160);
    const name=clean(cardData.full_name)||'this professional';
    const role=clean(cardData.job_title);
    const company=clean(cardData.company_name);
    const location=clean(cardData.business_address);
    const parts=[`Connect with ${name}`];
    if(role)parts.push(role);
    if(company)parts.push(`at ${company}`);
    if(location)parts.push(`in ${location}`);
    return truncate(parts.join(' ')+'. View contact details, services, links and more.',160);
  }

  function buildSchema(cardData,canonical,description,image){
    const name=clean(cardData.full_name);
    const company=clean(cardData.company_name);
    const website=clean(cardData.website);
    const role=clean(cardData.job_title);
    const address=clean(cardData.business_address);
    const graph=[];

    if(name){
      const person={
        '@type':'Person',
        '@id':canonical+'#person',
        name,
        url:canonical,
        description
      };
      if(role)person.jobTitle=role;
      if(image)person.image=image;
      if(company)person.worksFor={'@id':canonical+'#organization'};
      graph.push(person);
    }

    if(company){
      const organization={
        '@type':address?'LocalBusiness':'Organization',
        '@id':canonical+'#organization',
        name:company,
        url:website||canonical
      };
      if(address)organization.address=address;
      if(image)organization.image=image;
      graph.push(organization);
    }

    return graph.length?{
      '@context':'https://schema.org',
      '@graph':graph
    }:null;
  }

  function applyPublicCardSeo(cardData,isPreview,featureAccess){
    if(!cardData)return;
    const published=String(cardData.status||'').toLowerCase()==='published'&&!isPreview;
    const customSeoAllowed=featureAccess&&featureAccess.custom_seo===true;
    const slug=clean(cardData.slug)||new URLSearchParams(location.search).get('slug')||'';
    const canonical=slug?`${PRODUCTION_CARD_BASE}?slug=${encodeURIComponent(slug)}`:PRODUCTION_CARD_BASE;
    const automaticTitle=buildAutomaticTitle(cardData);
    const automaticDescription=buildAutomaticDescription(cardData);
    const title=truncate(customSeoAllowed&&clean(cardData.seo_title)?cardData.seo_title:automaticTitle,60);
    const description=truncate(customSeoAllowed&&clean(cardData.seo_description)?cardData.seo_description:automaticDescription,160);
    const image=clean(cardData.profile_image_url)||clean(cardData.cover_image_url)||DEFAULT_SHARE_IMAGE;

    document.title=title;
    setNamedMeta('description',description);
    setCanonical(canonical);
    setRobots(published
      ?'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
      :'noindex,nofollow,noarchive,noimageindex');

    setPropertyMeta('og:type',clean(cardData.company_name)?'website':'profile');
    setPropertyMeta('og:site_name','LIW Cards');
    setPropertyMeta('og:title',title);
    setPropertyMeta('og:description',description);
    setPropertyMeta('og:url',canonical);
    setPropertyMeta('og:image',image);
    setPropertyMeta('og:image:alt',clean(cardData.full_name)?`${clean(cardData.full_name)} digital business card`:'LIW digital business card');

    setNamedMeta('twitter:card','summary_large_image');
    setNamedMeta('twitter:title',title);
    setNamedMeta('twitter:description',description);
    setNamedMeta('twitter:image',image);

    replaceStructuredData(published?buildSchema(cardData,canonical,description,image):null);

    document.documentElement.dataset.liwSeoStatus=published?'published-indexable':'private-noindex';
    document.documentElement.dataset.liwSeoCanonical=canonical;
  }

  function markUnavailableNoindex(){
    setRobots('noindex,nofollow,noarchive,noimageindex');
    replaceStructuredData(null);
    document.documentElement.dataset.liwSeoStatus='unavailable-noindex';
  }

  const originalRenderCard=typeof window.renderCard==='function'?window.renderCard:null;
  if(originalRenderCard){
    window.renderCard=function(cardData,links,services,products,downloads,isPreview,featureAccess){
      const result=originalRenderCard.apply(this,arguments);
      try{applyPublicCardSeo(cardData,isPreview,featureAccess||{});}catch(error){console.warn('LIW public card SEO metadata unavailable:',error);}
      return result;
    };
  }

  // Fallback for any renderer variant that completed before this staging guard loaded.
  let attempts=0;
  const seoFallback=setInterval(()=>{
    attempts+=1;
    try{
      const loadedCard=typeof publicCard!=='undefined'?publicCard:null;
      const preview=typeof ownerPreview!=='undefined'?ownerPreview:false;
      const featureAccess=globalThis.publicCardFeatureAccess||{};
      const visible=document.getElementById('card')&&!document.getElementById('card').hidden;
      if(loadedCard&&visible){
        applyPublicCardSeo(loadedCard,preview,featureAccess);
        clearInterval(seoFallback);
      }else if(attempts>=40){
        clearInterval(seoFallback);
      }
    }catch(_){
      if(attempts>=40)clearInterval(seoFallback);
    }
  },250);

  window.LIWPublicCardSeo={
    applyPublicCardSeo,
    buildAutomaticTitle,
    buildAutomaticDescription,
    buildSchema
  };
})();
