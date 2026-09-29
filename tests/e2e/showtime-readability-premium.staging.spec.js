const { test, expect } = require('@playwright/test');
const path = require('path');
test('Showtime Aa scales useful content while keeping identity, tiles and draft controls premium', async ({ page }) => {
  await page.setViewportSize({width:360,height:780});
  await page.goto('/404.html');
  await page.setContent(`<body class="music-page-active music-bottom-swipe-page">
    <div class="public-shell">
      <article id="card" class="public-card music-card-active music-artist-hub-v3 music-identity-inline music-bottom-swipe-mounted" data-liw-reading-size="normal">
        <div class="preview-banner">Private draft preview — only you can see this.</div>
        <div class="public-cover"><div class="public-top-actions"><button class="public-round-btn">Share</button><button class="public-round-btn">QR</button><button class="public-round-btn liw-reading-trigger">Aa</button></div></div>
        <div class="public-content">
          <section class="music-identity-row"><div class="public-avatar"></div><div class="music-identity-copy">
            <h1 id="name">Michael Jackson</h1><p class="public-title">Singer</p>
            <p class="music-hub-tagline">Singer · "Beat it" out now</p>
            <div class="music-hub-follow"><button class="music-hub-follow-btn"><svg></svg><span>Follow on LIW</span><span>· 0</span></button></div>
          </div></section>
          <button class="music-release-card music-hub-release"><div class="music-release-art"></div>
            <div class="music-release-copy"><small>FEATURED MUSIC · PLAY ON LIW</small><strong>Beat it</strong><span class="music-hub-release-providers">Spotify</span></div><div class="music-release-play"></div>
          </button>
          <section class="music-luxe-launcher"><span class="music-hub-nav-title">Explore the singer</span>
            <div class="music-luxe-grid"><button class="music-luxe-tile"><i class="music-luxe-icon"></i><strong>Music</strong></button>
            <button class="music-luxe-tile"><i class="music-luxe-icon"></i><strong>Videos</strong></button><button class="music-luxe-tile"><i class="music-luxe-icon"></i><strong>Shows</strong></button>
            <button class="music-luxe-tile"><i class="music-luxe-icon"></i><strong>Merch</strong></button>
            <button class="music-luxe-tile"><i class="music-luxe-icon"></i><strong>Inner Circle</strong></button>
            <button class="music-luxe-tile"><i class="music-luxe-icon"></i><strong>Social</strong></button></div>
            <section class="music-hub-more music-bottom-swipe"><div class="music-bottom-swipe-head"><span class="music-hub-more-title">More from the singer</span><span class="music-bottom-swipe-hint">SWIPE →</span></div>
              <div class="music-bottom-swipe-rail"><button class="music-bottom-swipe-item music-luxe-tile"><i class="music-luxe-icon"></i><strong>Gallery</strong></button></div>
            </section>
          </section>
        </div>
      </article>
    </div>
    <section class="music-artist-room"><p class="music-room-empty">Artist room text</p><div class="music-media-intro"><div><p>Listen to the latest releases and explore more.</p></div></div></section>
  </body>`);
  for(const f of ['css/music-theme-staging.css','css/music-home-fit-staging.css','css/music-identity-row-staging.css','css/music-artist-hub-v2-staging.css','css/music-bottom-swipe-staging.css','css/public-card-readability-staging.css','css/showtime-readability-premium-staging.css']){
    await page.addStyleTag({path:path.join(process.cwd(),f)});
  }
  const card=page.locator('#card');
  for(const [size,body,role,tile,release] of [['normal',16,14,15,18],['large',18,15,16,19],['extra',20,16,17,20]]){
    await card.evaluate((el,value)=>el.dataset.liwReadingSize=value,size);
    await expect(page.locator('.music-hub-tagline')).toHaveCSS('font-size',body+'px');
    await expect(page.locator('.music-identity-copy .public-title')).toHaveCSS('font-size',role+'px');
    await expect(page.locator('.music-luxe-grid .music-luxe-tile strong').first()).toHaveCSS('font-size',tile+'px');
    await expect(page.locator('.music-release-copy strong')).toHaveCSS('font-size',release+'px');
    await expect(page.locator('.music-media-intro p')).toHaveCSS('font-size',body+'px');
    const n=await page.locator('#name').evaluate(el=>({s:el.scrollWidth,c:el.clientWidth,font:parseFloat(getComputedStyle(el).fontSize)}));
    expect(n.s).toBeLessThanOrEqual(n.c+1);
    expect(n.font).toBeLessThanOrEqual(29);
    const banner=await page.locator('.preview-banner').boundingBox();
    const actions=await page.locator('.public-top-actions').boundingBox();
    expect(banner.y+banner.height).toBeLessThanOrEqual(actions.y+1);
  }
  await expect(card).toHaveCSS('max-height','none');
  await expect(page.locator('.public-content')).toHaveCSS('overflow','visible');
  await expect(page.locator('.music-hub-tagline')).toHaveCSS('font-size','20px');
});
