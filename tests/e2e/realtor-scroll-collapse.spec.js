
const { test, expect } = require('@playwright/test');

const fixture = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body class="public-body">
<div class="public-shell"><article id="card" class="public-card"></article></div>
<script>
  var publicCard={
    id:'realtor-collapse-fixture',slug:'realtor-collapse-fixture',
    card_experience:'realtor',full_name:'Everton Blender',
    company_name:'Blender Brokerage',job_title:'Broker',
    profile_image_url:'',cover_image_url:'',
    phone:'2125550100',email:'test@example.com'
  };
  window.lucide={createIcons(){}};
  window.__LIW_PUBLIC_CARD_DATA_CLIENT__={
    async rpc(name){
      return name==='public_realtor_settings_by_slug'
        ? {data:{brokerage_name:'Blender Brokerage',video_cover_url:'/missing-test-video.mp4'},error:null}
        : {data:[],error:null};
    },
    from(){
      return {
        select(){return this},eq(){return this},in(){return this},
        order(){return Promise.resolve({data:[],error:null})}
      };
    }
  };
</script>
<script src="/js/realtor-public-v1.js?v=20260929-realtor-scroll-collapse-staging-1"></script>
<script>document.dispatchEvent(new Event('liw:public-card-rendered'));</script>
</body></html>`;

test('Realtor video shrinks to roughly half size while scrolling and restores on scroll back', async ({ page }) => {
  await page.setViewportSize({width:390,height:800});
  await page.route('**/card.html?liw_realtor_fixture=1', route =>
    route.fulfill({status:200,contentType:'text/html',body:fixture})
  );
  await page.goto('/card.html?liw_realtor_fixture=1');
  const shell=page.locator('#realtor-public-shell');
  const hero=page.locator('.realtor-public-hero');
  await expect(shell).toBeVisible();
  await page.evaluate(() => {
    document.querySelector('.realtor-public-body').style.minHeight='1800px';
  });
  const before=await hero.evaluate(el=>el.getBoundingClientRect().height);
  const video=page.locator('.realtor-public-hero-video');
  await expect(video).toHaveCount(1);
  const originalVideo=await video.elementHandle();

  await page.evaluate(() => window.scrollTo(0,380));
  await expect.poll(async()=>hero.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(before*.68);
  await expect(shell).toHaveClass(/realtor-hero-compact/);
  await expect(page.locator('.realtor-public-agent h1')).toContainText('Everton Blender');
  await expect(page.locator('.realtor-public-avatar')).toBeVisible();
  await expect(video).toHaveCount(1);
  expect(await originalVideo.evaluate(el=>el.isConnected)).toBe(true);

  await page.evaluate(() => window.scrollTo(0,0));
  await expect.poll(async()=>hero.evaluate(el=>el.getBoundingClientRect().height))
    .toBeGreaterThan(before-3);
  await expect(shell).not.toHaveClass(/realtor-hero-compact/);
});
