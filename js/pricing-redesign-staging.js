(function(){
  function finalizePricingRedesign(){
    const hero=document.querySelector('.pricing-hero');
    if(hero){
      const title=hero.querySelector('h1');
      const copy=hero.querySelector('.pricing-hero-inner > p');
      const eyebrow=hero.querySelector('.eyebrow');
      if(eyebrow) eyebrow.textContent='PRICING FOR EVERY STAGE';
      if(title) title.innerHTML='Simple pricing. <span>Room to grow.</span>';
      if(copy) copy.textContent='Start free and get the essentials. Upgrade when your business needs more cards, stronger branding, business tools, and advanced features.';
    }
    if(window.lucide) lucide.createIcons();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(finalizePricingRedesign,0),{once:true});
  }else{
    setTimeout(finalizePricingRedesign,0);
  }
})();