const { test, expect } = require('@playwright/test');
const path = require('path');

test('Realtor tiny phone keeps labels on one line and name readable at all Aa sizes', async ({page}) => {
  await page.setViewportSize({width:320,height:740});
  await page.goto('/404.html');
  await page.setContent(`<article id="card" class="realtor-public-active" data-liw-reading-size="normal">
    <section class="realtor-public-shell" style="--rdark:#11524b;--rbutton:#16877a;--rbuttontext:#fff;--raccent:#81cbb8">
      <header class="realtor-public-hero" style="position:relative">
        <div class="realtor-public-top"><div class="realtor-public-brand"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs"><span>BLENDER BROKERAGE</span></div>
        <div class="realtor-public-top-actions"><button class="realtor-public-icon">Wallet</button><button class="realtor-public-icon">Share</button><button class="realtor-public-icon">QR</button><button class="realtor-public-icon liw-reading-trigger">Aa</button></div></div>
        <div class="realtor-public-agent"><div class="realtor-public-avatar"></div><div><h1>Everton Blender</h1><p>Broker · Brooklyn, Queens, Bronx</p><small>Blender Brokerage</small><button class="realtor-office-toggle">Office Info</button></div></div>
      </header>
      <div class="realtor-public-body"><div class="realtor-public-tagline">We got all the houses and apartments</div>
      <div class="realtor-public-actions"><a class="realtor-public-action"><svg></svg>Call</a><a class="realtor-public-action"><svg></svg>Text</a><a class="realtor-public-action"><svg></svg>Email</a><button class="realtor-public-action"><svg></svg>Save</button></div>
      <nav class="realtor-public-nav"><button>Listings</button><button>Buy a Home</button><button>Sell My Home</button><button>Open Houses</button></nav>
      <button class="realtor-main-showing">Schedule Showing</button>
      <div class="realtor-property-actions"><button>View Property</button><button class="realtor-showing-action"><svg></svg>Request Showing</button></div>
      </div>
    </section></article>`);
  await page.addStyleTag({path:path.join(process.cwd(),'css/public-card-readability-staging.css')});
  await page.addStyleTag({path:path.join(process.cwd(),'css/realtor-readability-premium-staging.css')});
  for(const size of ['normal','large','extra']){
    await page.locator('#card').evaluate((el,size)=>el.dataset.liwReadingSize=size,size);
    const wrapping=await page.locator('.realtor-public-nav button,.realtor-public-action,.realtor-main-showing,.realtor-property-actions button').evaluateAll(elements=>elements.map(el=>({
      label:el.textContent.trim(),space:getComputedStyle(el).whiteSpace,scroll:el.scrollWidth,client:el.clientWidth,
      height:el.getBoundingClientRect().height
    })));
    for(const item of wrapping){
      expect(item.space,item.label).toBe('nowrap');
      expect(item.scroll,item.label).toBeLessThanOrEqual(item.client+2);
    }
    await expect(page.locator('.realtor-property-actions')).toHaveCSS('grid-template-columns',/\d+px/);
    const name=await page.locator('.realtor-public-agent h1').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,style:getComputedStyle(el).wordBreak}));
    expect(name.scroll).toBeLessThanOrEqual(name.client+1);
    expect(name.style).toBe('normal');
    const head=await page.locator('.realtor-public-top').evaluate(el=>el.getBoundingClientRect());
    const hero=await page.locator('.realtor-public-hero').evaluate(el=>el.getBoundingClientRect());
    expect(head.right).toBeLessThanOrEqual(hero.right+1);
    expect(head.left).toBeGreaterThanOrEqual(hero.left-1);
  }
});
test('Realtor showing label omits the extra article',async({page})=>{
  await page.goto('/card.html?slug=kevin-z3zu',{waitUntil:'domcontentloaded'});
  const shell=page.locator('#realtor-public-shell');
  await expect(shell).toBeVisible({timeout:25000});
  await expect(shell.getByText('Schedule a Showing',{exact:true})).toHaveCount(0);
});
