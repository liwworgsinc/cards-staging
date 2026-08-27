(function(){
  if(!document.querySelector('link[rel~="icon"]')){
    const icon=document.createElement('link');
    icon.rel='icon';
    icon.type='image/png';
    icon.sizes='32x32';
    icon.href='assets/icons/favicon-32-v1062.png';
    document.head.appendChild(icon);
  }

  const state={link:'https://cards.liwworgs.com/YOURCODE',live:false};

  const templates={
    whatsapp:link=>`Hey! If you want one simple link for your business contact info, social links and QR code, check out LIW Cards: ${link}\n\nI may earn a commission if you purchase through my link.`,
    instagram:link=>`Your business card should work even when you run out of paper cards. LIW Cards gives you a digital card you can share by link or QR code. Build yours here: ${link}\n\nAffiliate disclosure: I may earn a commission if you purchase through my link.`,
    client:link=>`If you want a cleaner way to share your business details, I recommend LIW Cards. You can keep your contact info, website, social links and QR code in one digital card: ${link}\n\nDisclosure: I may earn a commission if you purchase through my link.`
  };

  function messageFor(type){
    const builder=templates[type]||templates.whatsapp;
    return builder(state.link);
  }

  function refresh(){
    document.querySelectorAll('[data-affiliate-example]').forEach(card=>{
      const type=card.dataset.affiliateExample||'whatsapp';
      const output=card.querySelector('[data-affiliate-example-text]');
      const button=card.querySelector('[data-copy-affiliate-example]');
      if(output)output.textContent=messageFor(type);
      if(button)button.textContent=state.live?'Copy example':'Get my link';
    });
    document.querySelectorAll('[data-affiliate-live-note]').forEach(note=>{
      note.textContent=state.live
        ? 'Your live referral link is already inserted in every example.'
        : 'Create or sign in to your LIW Cards account to insert your referral link automatically.';
    });
  }

  async function copy(type){
    if(!state.live){
      location.href='register.html';
      return;
    }
    try{
      await navigator.clipboard.writeText(messageFor(type));
      if(typeof window.toast==='function')window.toast('Affiliate example copied');
    }catch(_){
      const textarea=document.createElement('textarea');
      textarea.value=messageFor(type);
      textarea.style.position='fixed';
      textarea.style.opacity='0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      if(typeof window.toast==='function')window.toast('Affiliate example copied');
    }
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-copy-affiliate-example]');
    if(!button)return;
    const card=button.closest('[data-affiliate-example]');
    copy(card?.dataset.affiliateExample||'whatsapp');
  });

  window.LIWAffiliateShareKit={
    setLink(link,live=true){
      const next=String(link||'').trim();
      if(next)state.link=next;
      state.live=Boolean(live&&next);
      refresh();
    },
    refresh,
    messageFor
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);
  else refresh();
})();
