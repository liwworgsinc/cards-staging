const {test,expect}=require('@playwright/test');

const mockClient=String.raw`
(() => {
  window.supabase={createClient(_url,_key,opts={}) {
    const anonymous=opts.auth?.persistSession===false;
    const query=new URLSearchParams(location.search);
    const draft=query.get('draft')==='1';
    const disabled=query.get('disabled')==='1';
    const card={
      id:'test-card',slug:'maya-stage',full_name:'Maya Stage',card_experience:'music',
      status:draft?'draft':'published',biography:'Real artist biography supplied by the artist.',
      email:'booking@example.com',profile_image_url:'',cover_image_url:''
    };
    const settings={
      epk_enabled:!disabled,stage_name:'Maya Stage',genre:'Reggae',location:'Brooklyn, NY',
      epk_tagline:'Live performer',epk_bio:'Press-ready biography written by the artist.',
      epk_highlights:'Festival performance\\nRadio interview',
      epk_press_email:'press@example.com',epk_booking_email:'book@example.com',
      releases:[{id:'rel1',featured:true,title:'Latest Single',listen_url:'https://example.com/listen'}],
      media_items:[{id:'m1',type:'photo',title:'Official photo',url:'https://example.com/photo.jpg'},
                   {id:'m2',type:'press',title:'Hidden press',url:'https://example.com/press'}],
      epk_media_ids:['m1'],
      shows:[{id:'s1',date:'2026-10-15',venue:'The Stage',city:'Brooklyn, NY',ticket_url:'https://example.com/tickets'}]
    };
    if(query.get('video')==='1'){
      settings.releases.push({id:'rel2',title:'Second Single',listen_url:'https://example.com/second'});
      settings.media_items.push({id:'m3',type:'video',title:'Live set footage',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'});
      settings.epk_media_ids.push('m3');
    }
    return {
      auth:{async getUser(){return {data:{user:{id:'owner'}}}}},
      async rpc(name){
        if(name==='public_card_by_slug')return {data:draft&&anonymous?null:card,error:null};
        if(name==='public_artist_settings_by_slug')return {data:settings,error:null};
        return {data:null,error:{message:'Unknown RPC'}};
      }
    };
  }};
})();
`;

test.beforeEach(async ({page})=>{
  await page.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@.*/,route=>
    route.fulfill({status:200,contentType:'application/javascript',body:mockClient}));
});

test('published Showtime EPK shows selected real content and supports PDF print',async ({page})=>{
  await page.goto('/epk.html?slug=maya-stage');
  await expect(page.locator('#epk-app h1')).toHaveText('Maya Stage');
  await expect(page.getByText('Press-ready biography written by the artist.')).toBeVisible();
  await expect(page.getByText('Latest Single')).toBeVisible();
  await expect(page.locator('.epk-media a')).toHaveCount(1);
  await expect(page.getByText('Hidden press')).toHaveCount(0);
  await expect(page.getByText('The Stage')).toBeVisible();
  await expect(page.locator('[data-copy-link]')).toBeEnabled();
  await page.evaluate(()=>{window.print=()=>{window.__printCalled=true;};});
  await page.locator('[data-save-pdf]').click();
  expect(await page.evaluate(()=>window.__printCalled)).toBe(true);
});

test('disabled EPK remains private',async ({page})=>{
  await page.goto('/epk.html?slug=maya-stage&disabled=1');
  await expect(page.getByText('EPK not published')).toBeVisible();
  await expect(page.locator('#epk-app')).toBeHidden();
});

test('draft EPK is owner-preview-only and cannot share a public link',async ({page})=>{
  await page.goto('/epk.html?slug=maya-stage&draft=1');
  await expect(page.getByText('EPK unavailable')).toBeVisible();
  await page.goto('/epk.html?slug=maya-stage&draft=1&editor_preview=1');
  await expect(page.locator('#epk-app h1')).toHaveText('Maya Stage');
  await expect(page.locator('[data-copy-link]')).toBeDisabled();
});

test('EPK booking CTA, extra music and consent-first embedded performance',async ({page})=>{
  await page.goto('/epk.html?slug=maya-stage&video=1');
  await expect(page.locator('.epk-hero-cta').filter({hasText:'Book this artist'})).toHaveAttribute('href','mailto:book@example.com');
  await expect(page.getByText('Second Single')).toBeVisible();
  await expect(page.locator('.epk-media a')).toHaveCount(2);
  const play=page.getByRole('button',{name:'Play performance video'});
  await expect(play).toBeVisible();
  await expect(page.locator('.epk-video-stage iframe')).toHaveCount(0);
  await play.click();
  await expect(page.locator('.epk-video-stage iframe')).toHaveAttribute('src',/youtube-nocookie\\.com\\/embed\\/dQw4w9WgXcQ/);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.epk-mobile-book')).toBeVisible();
});
