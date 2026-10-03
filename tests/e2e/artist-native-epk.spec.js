const {test,expect}=require('@playwright/test');
const {readFileSync}=require('node:fs');

const mockClient=String.raw`
(() => {
  window.supabase={createClient(_url,_key,opts={}) {
    const anonymous=opts.auth?.persistSession===false;
    const query=new URLSearchParams(location.search);
    const draft=query.get('draft')==='1';
    const disabled=query.get('disabled')==='1';
    const locked=query.get('locked')==='1';
    const card={
      id:'test-card',slug:'maya-stage',full_name:'Maya Stage',card_experience:'music',
      status:draft?'draft':'published',biography:'Real artist biography supplied by the artist.',
      email:'booking@example.com',profile_image_url:'',cover_image_url:''
    };
    const settings={
      epk_pro_entitled:!locked,epk_enabled:!disabled,stage_name:'Maya Stage',genre:'Reggae',location:'Brooklyn, NY',
      epk_tagline:'Live performer',epk_bio:'Press-ready biography written by the artist.',
      epk_highlights:'Festival performance\\nRadio interview',
      epk_press_email:'press@example.com',epk_booking_email:'book@example.com',
      releases:[{id:'rel1',featured:true,title:'Latest Single',listen_url:'https://example.com/listen'}],
      media_items:[{id:'m1',type:'photo',title:'Official photo',url:'https://example.com/photo.jpg'},
                   {id:'m2',type:'press',title:'Hidden press',url:'https://example.com/press'}],
      epk_media_ids:['m1'],
      shows:[{id:'s1',date:'2026-10-15',venue:'The Stage',city:'Brooklyn, NY',ticket_url:'https://example.com/tickets'}]
    };
    if(query.get('package')==='1'){
      settings.epk_package_enabled=true;
      settings.epk_management_name='Maya Management';
      settings.epk_management_email='manager@example.com';
      settings.epk_booking_requirements='Contact management at least two weeks ahead.';
      settings.epk_rider_notes='Two vocal microphones and two stage monitors.';
      settings.epk_rider_url='https://example.com/rider.pdf';
      settings.epk_stage_plot_url='https://example.com/plot.png';
    }
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

test('non-Pro EPK remains unavailable even when old EPK settings are enabled',async ({page})=>{
  await page.goto('/epk.html?slug=maya-stage&locked=1');
  await expect(page.getByText('EPK unavailable')).toBeVisible();
  await expect(page.getByText('This artist is not currently publishing a Showtime Pro EPK.')).toBeVisible();
  await expect(page.locator('#epk-app')).toBeHidden();
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
  expect(await page.locator('.epk-video-stage iframe').getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.epk-mobile-book')).toBeVisible();
});


test('premium print edition uses a readable single-column PDF layout without screen controls',async ({page})=>{
  await page.goto('/epk.html?slug=maya-stage&video=1');
  await expect(page.locator('#epk-app h1')).toHaveText('Maya Stage');

  // Web view remains the familiar dark interactive EPK.
  await expect(page.locator('.epk-print-masthead')).toBeHidden();
  await expect(page.locator('.epk-nav')).toBeVisible();

  await page.emulateMedia({media:'print'});
  await expect(page.locator('.epk-print-masthead')).toBeVisible();
  await expect(page.locator('.epk-nav')).toBeHidden();
  await expect(page.locator('.epk-mobile-book')).toBeHidden();
  await expect(page.locator('.epk-video-stage')).toBeHidden();
  await expect(page.locator('.epk-layout')).toHaveCSS('display','block');
  await expect(page.locator('.epk-main')).toHaveCSS('display','block');
  await expect(page.locator('.epk-side')).toHaveCSS('display','block');
  await expect(page.locator('.epk-panel').first()).toHaveCSS('background-color','rgb(255, 255, 255)');
  const typography=await page.locator('.epk-panel h2').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(typography).toBeGreaterThan(20);

  const pdf=await page.pdf({format:'Letter',preferCSSPageSize:true,printBackground:true});
  expect(pdf.subarray(0,4).toString()).toBe('%PDF');
  expect(pdf.length).toBeGreaterThan(5000);
  await expect(page.getByText('Press-ready biography written by the artist.')).toBeVisible();
  await expect(page.getByText('The Stage')).toBeVisible();
});

const fixturePng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pksAAAAASUVORK5CYII=','base64');
function localEntries(buffer){
  const files=new Map();let pos=0;
  while(pos+30<=buffer.length&&buffer.readUInt32LE(pos)===0x04034b50){
    const method=buffer.readUInt16LE(pos+8),size=buffer.readUInt32LE(pos+18);
    const nameSize=buffer.readUInt16LE(pos+26),extra=buffer.readUInt16LE(pos+28);
    const name=buffer.toString('utf8',pos+30,pos+30+nameSize),start=pos+30+nameSize+extra;
    expect(method).toBe(0);
    files.set(name,buffer.subarray(start,start+size));
    pos=start+size;
  }
  return files;
}

test('opt-in promoter ZIP includes native PDF, booking notes and real supplied assets only',async ({page})=>{
  await page.route('https://example.com/**',route=>{
    const url=route.request().url();
    if(url.endsWith('/photo.jpg')||url.endsWith('/plot.png'))return route.fulfill({status:200,contentType:'image/png',headers:{'access-control-allow-origin':'*'},body:fixturePng});
    if(url.endsWith('/rider.pdf'))return route.fulfill({status:200,contentType:'application/pdf',headers:{'access-control-allow-origin':'*'},body:Buffer.from('%PDF-1.4\n% artist supplied technical rider\n')});
    return route.continue();
  });
  await page.goto('/epk.html?slug=maya-stage&package=1');
  const button=page.getByRole('button',{name:'Download promoter ZIP'});
  await expect(button).toBeEnabled();
  const [download]=await Promise.all([page.waitForEvent('download'),button.click()]);
  expect(download.suggestedFilename()).toBe('Maya-Stage-Promoter-Package.zip');
  const bytes=readFileSync(await download.path()),files=localEntries(bytes);
  expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
  expect(files.get('00-Artist-One-Sheet.pdf').subarray(0,8).toString()).toBe('%PDF-1.4');
  expect(files.get('01-Biography/Artist-Biography.txt').toString()).toContain('Press-ready biography');
  expect(files.get('02-Booking/Booking-Requirements.txt').toString()).toContain('two weeks ahead');
  expect(files.get('03-Technical/Technical-Rider-Notes.txt').toString()).toContain('stage monitors');
  expect(files.has('03-Technical/Technical-Rider.pdf')).toBe(true);
  expect(files.has('03-Technical/Stage-Plot.png')).toBe(true);
  expect(files.has('04-Photos/Press-01-Official-photo.png')).toBe(true);
  expect(files.get('README-FIRST.txt').toString()).toContain('Live EPK:');
  expect([...files.values()].some(blob=>blob.toString().includes('Hidden press'))).toBe(false);
});

test('promoter package is private by default and disabled EPK cannot be exposed using preview URL',async ({page})=>{
  await page.goto('/epk.html?slug=maya-stage');
  await expect(page.locator('[data-epk-download-package]')).toHaveCount(0);
  await page.goto('/epk.html?slug=maya-stage&disabled=1&editor_preview=1');
  await expect(page.getByText('EPK not published')).toBeVisible();
  await expect(page.locator('[data-epk-download-package]')).toHaveCount(0);
});
