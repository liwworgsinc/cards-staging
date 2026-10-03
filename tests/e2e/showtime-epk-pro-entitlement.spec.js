const {test,expect}=require('@playwright/test');

async function mount(page,planKey){
  await page.setContent(`<main id="artist-dressing-room">
    <nav class="artist-control-nav"><button type="button" data-artist-nav="profile"><span>Profile</span></button></nav>
    <div class="artist-control-panels"><section class="artist-control-panel" data-artist-panel="profile"></section></div>
  </main>
  <input name="full_name" value="Maya Stage">
  <textarea name="biography">Artist biography from the Showtime card.</textarea>
  <input name="profile_image_url" value="">
  <input name="status" value="published">
  <input name="slug" value="maya-stage">`);
  await page.evaluate(plan=>{
    window.currentPlan=plan;
    window.editorAccess={planKey:plan,planName:plan==='starter'?'Free':plan.charAt(0).toUpperCase()+plan.slice(1),isAdmin:false,isPlanPreview:false};
    window.__artistState={
      stage_name:'Maya Stage',genre:'Reggae',location:'Brooklyn, NY',
      epk_enabled:true,epk_package_enabled:true,
      releases:[{id:'r1',title:'Latest Single',featured:true,listen_url:'https://example.com/listen'}],
      shows:[{id:'s1',date:'2026-10-15',venue:'The Stage',city:'Brooklyn, NY'}],
      media_items:[{id:'m1',type:'photo',title:'Press photo',url:'https://example.com/photo.jpg',visible:true}],
      epk_media_ids:['m1']
    };
    window.__epkWrites=0;
    window.LIWArtistEpkBridge={
      getState:()=>window.__artistState,
      isLoaded:()=>true,
      queueSave:()=>{window.__epkWrites++;},
      saveSettings:async()=>true,
      resolveCardId:async()=> 'card-1',
      setPanel:()=>{},renderSummary:()=>{},renderMedia:()=>{}
    };
    window.toast=()=>{};
  },planKey);
  await page.addScriptTag({path:'js/editor-native-epk-staging.js'});
  await expect(page.locator('[data-artist-nav="epk"]')).toBeVisible();
}

for(const plan of ['starter','lite','plus']){
  test(plan+' sees a locked Pro EPK preview without editable EPK controls',async({page})=>{
    await mount(page,plan);
    await expect(page.locator('[data-artist-nav="epk"]')).toHaveClass(/artist-epk-nav-locked/);
    await expect(page.locator('[data-epk-locked]')).toHaveCount(1);
    await expect(page.locator('[data-epk-field="epk_enabled"]')).toHaveCount(0);
    await expect(page.getByRole('link',{name:/Upgrade to Pro/i})).toHaveAttribute('href','pricing.html#music-plans');
    await expect(page.locator('[data-epk-preview-name]')).toHaveText('Maya Stage');
    expect(await page.evaluate(()=>window.__artistState.epk_pro_entitled)).toBe(false);
    expect(await page.evaluate(()=>window.__artistState.epk_enabled)).toBe(true);
  });
}

test('Pro sees the full editable EPK builder and receives the entitlement marker',async({page})=>{
  await mount(page,'pro');
  await expect(page.locator('[data-artist-nav="epk"]')).not.toHaveClass(/artist-epk-nav-locked/);
  await expect(page.locator('[data-epk-locked]')).toHaveCount(0);
  await expect(page.locator('[data-epk-field="epk_enabled"]')).toHaveCount(1);
  await expect(page.getByText('Downloadable promoter package')).toBeVisible();
  expect(await page.evaluate(()=>window.__artistState.epk_pro_entitled)).toBe(true);
});
