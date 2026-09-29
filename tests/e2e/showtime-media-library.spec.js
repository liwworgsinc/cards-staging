const {test,expect}=require('@playwright/test');

async function mount(page,initial=[]){
  await page.setContent('<main id="artist-dressing-room"><button type="button" data-media-open>Add media</button><span data-artist-media-count></span><div data-media-manager-host></div></main>');
  await page.evaluate(rows=>{
    window.__artistState={media_items:rows.map(x=>({...x})),epk_media_ids:[]};
    window.__writes=0;
    window.LIWArtistEpkBridge={
      getState:()=>window.__artistState,
      renderMedia:()=>window.LIWShowtimeMediaManager.render(document.getElementById('artist-dressing-room'),4),
      renderSummary:()=>{},
      queueSave:()=>{window.__writes++;},
      saveSettings:async()=>true
    };
    window.toast=message=>{window.__lastToast=message;};
    window.supabaseClient={
      auth:{getUser:async()=>({data:{user:{id:'test-owner'}}})},
      storage:{from:()=>({
        upload:async(path)=>({data:{path},error:null}),
        getPublicUrl:path=>({data:{publicUrl:'https://example.com/'+path}})
      })}
    };
  },initial);
  await page.addScriptTag({path:'js/editor-showtime-media-library-staging.js'});
  await expect(page.locator('.show-media-dashboard')).toBeVisible();
}

async function addLink(page,type,title,url){
  await page.locator('[data-media-open]').click();
  await page.locator('[data-show-media-choose="'+type+'"]').click();
  await page.locator('[data-show-media-title]').fill(title);
  await page.locator('[data-show-media-url]').fill(url);
  await page.locator('[data-show-media-save]').click();
}

test('Showtime Media Library saves, edits, features, reorders and controls EPK visibility',async({page})=>{
  await mount(page);
  await addLink(page,'video','Summer Sessions','https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await expect(page.locator('.show-media-card')).toHaveCount(1);
  await expect(page.locator('.show-media-thumb img')).toHaveAttribute('src',/i.ytimg.com/);
  await addLink(page,'press','Interview','https://example.com/press');
  let rows=await page.evaluate(()=>window.__artistState.media_items);
  expect(rows.map(x=>x.title)).toEqual(['Summer Sessions','Interview']);
  const press=page.locator('.show-media-card').filter({hasText:'Interview'});
  await press.locator('[data-show-media-action="feature"]').click();
  rows=await page.evaluate(()=>window.__artistState.media_items);
  expect(rows.filter(x=>x.featured).map(x=>x.title)).toEqual(['Interview']);
  await press.locator('[data-show-media-action="up"]').click();
  expect(await page.evaluate(()=>window.__artistState.media_items[0].title)).toBe('Interview');
  await page.locator('.show-media-card').filter({hasText:'Interview'}).locator('[data-show-media-action="visibility"]').click();
  expect(await page.evaluate(()=>window.__artistState.media_items[0].visible)).toBe(false);
  await page.locator('.show-media-card').filter({hasText:'Interview'}).locator('[data-show-media-action="epk"]').click();
  expect(await page.evaluate(()=>window.__artistState.media_items[0].epk_include)).toBe(false);
  await page.locator('.show-media-card').filter({hasText:'Interview'}).locator('[data-show-media-action="edit"]').click();
  await page.locator('[data-show-media-title]').fill('Updated interview');
  await page.locator('[data-show-media-save]').click();
  expect(await page.evaluate(()=>window.__artistState.media_items[0].title)).toBe('Updated interview');
  await page.locator('[data-show-media-filter="press"]').click();
  await expect(page.locator('.show-media-card')).toHaveCount(1);
  await page.locator('[data-show-media-filter="all"]').click();
  expect(await page.evaluate(()=>window.__writes)).toBeGreaterThanOrEqual(7);
});

test('Showtime allows multi-photo upload without exceeding four media items',async({page})=>{
  await mount(page);
  await page.locator('[data-show-media-open="photo"]').click();
  await page.locator('[data-show-media-files]').setInputFiles([
    {name:'Artist-first.png',mimeType:'image/png',buffer:Buffer.from('photo-1')},
    {name:'Artist-second.png',mimeType:'image/png',buffer:Buffer.from('photo-2')}
  ]);
  await expect(page.locator('.show-media-card')).toHaveCount(2);
  let rows=await page.evaluate(()=>window.__artistState.media_items);
  expect(rows.every(x=>x.type==='photo'&&x.url.startsWith('https://example.com/'))).toBe(true);
  await addLink(page,'audio','Studio Mix','https://soundcloud.com/example/mix');
  await addLink(page,'press','Press coverage','https://example.com/feature');
  await expect(page.locator('.show-media-card')).toHaveCount(4);
  await expect(page.locator('[data-media-open]')).toBeEnabled();
  await expect(page.locator('.show-media-capacity')).toHaveText('2/4 links · 2/8 photos');
  await addLink(page,'video','Second live set','https://youtu.be/dQw4w9WgXcQ');
  await addLink(page,'link','More press','https://example.com/press2');
  await expect(page.locator('.show-media-capacity')).toHaveText('4/4 links · 2/8 photos');
  await page.locator('[data-media-open]').click();
  await expect(page.locator('[data-show-media-choose="video"]')).toBeDisabled();
  await expect(page.locator('[data-show-media-choose="photo"]')).toBeEnabled();
  await page.locator('[data-show-media-close]').last().click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('.show-media-card').first().locator('[data-show-media-action="edit"]').click();
  await expect(page.locator('.show-media-dialog-body')).toBeVisible();
  const fits=await page.locator('.show-media-dialog-body').evaluate(el=>el.getBoundingClientRect().width<=window.innerWidth);
  expect(fits).toBe(true);
});
