const {test,expect}=require('@playwright/test');

// Staging-only owner screen. Use a fake data layer; no customer or appointment is modified.
async function mount(page){
  await page.setViewportSize({width:375,height:812});
  await page.goto('/404.html');
  await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/css/styles.css">
    <link rel="stylesheet" href="/css/booking-appointments-v1-staging.css">
    <link rel="stylesheet" href="/css/appointments-mobile-schedule-staging.css">
    </head><body class="booking-page"><div class="dashboard"><main class="main booking-main">
    <div class="booking-topbar"><div class="booking-title-wrap"><h1>Appointments</h1></div>
      <div class="booking-card-picker"><select id="booking-card-select" class="input"></select></div></div>
    <section class="booking-hero"><div class="booking-panel booking-hero-copy">
      <div id="booking-plan-pill"></div><h2 id="booking-hero-title"></h2><p id="booking-hero-copy"></p>
      </div><div class="booking-stat-card"><div id="booking-upcoming-count"></div><div id="booking-request-count"></div></div></section>
    <div class="booking-layout"><div><section class="booking-panel">
      <div id="booking-mode-copy"></div><input id="booking-enabled" type="checkbox">
      <select id="booking-timezone"><option value="America/New_York">Eastern</option></select>
      <select id="booking-location-type"><option value="business">At my business</option></select>
      <input id="booking-location-text"><select id="booking-min-notice"><option value="60">1 hour</option></select>
      <select id="booking-days-ahead"><option value="30">30 days</option></select>
      <select id="booking-buffer"><option value="0">No buffer</option></select>
      <div id="paid-scheduling-settings"><div id="booking-days" class="booking-days"></div></div>
      <div id="booking-limit-note"></div>
      <div id="booking-service-list" class="booking-service-list"></div>
      <button id="booking-save">Save</button>
      <button id="booking-add-service">Add</button><button id="booking-use-previous">Previous</button>
      <div id="booking-new-service-payment-wrap"></div>
      <form id="booking-new-service-form"></form>
      <div id="booking-new-service-error"></div><div id="booking-previous-service-error"></div>
      <div id="booking-previous-service-list"></div><button id="booking-add-previous-services"></button>
      <dialog id="booking-service-dialog"><div id="booking-new-service-view"></div><div id="booking-previous-service-view"></div>
      <h2 id="booking-service-dialog-title"></h2><p id="booking-service-dialog-copy"></p></dialog>
    </section></div><div><section class="booking-panel"><div id="booking-feed"></div>
      <button id="booking-refresh">Refresh</button></section></div></div>
    </main></div></body></html>`);
  await page.evaluate(()=>{
    const cardId='11111111-1111-4111-8111-111111111111';
    const userId='22222222-2222-4222-8222-222222222222';
    const serviceId='33333333-3333-4333-8333-333333333333';
    const availability=Array.from({length:7},(_,weekday)=>({
      card_id:cardId,user_id:userId,weekday,enabled:weekday>0&&weekday<6,
      start_time:'09:00:00',end_time:'17:00:00'
    }));
    window.mockDB={
      cardId,userId,serviceId,availability,
      cards:[{id:cardId,user_id:userId,full_name:'Test Card',status:'published',updated_at:new Date().toISOString()}],
      services:[{id:serviceId,card_id:cardId,name:'Consultation',description:'30-minute call',
        price_cents:2500,is_enabled:true,sort_order:0,currency:'usd'}],
      serviceSettings:[{card_service_id:serviceId,card_id:cardId,user_id:userId,enabled:true,duration_minutes:30}],
      history:[{id:'appt-1',kind:'booking',status:'completed',customer_name:'Existing client',
        service_name:'Consultation',start_at:'2026-09-01T15:00:00Z'}],
      settings:{card_id:cardId,user_id:userId,enabled:true,timezone:'America/New_York'}
    };
    window.requireUser=async()=>({id:userId});
    window.getLiwAccessContext=async()=>({planKey:'pro'});
    window.toast=message=>{window.mockDB.lastToast=message;};
    window.escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
    const key={digital_cards:'cards',card_services:'services',
      booking_settings:'settings',booking_availability:'availability',
      booking_service_settings:'serviceSettings',booking_appointments:'history'};
    window.supabaseClient={from(table){
      const q={filters:[],mode:'read',patch:null,maybe:false};
      const api={
        select(){return api;},
        eq(field,value){q.filters.push([field,value]);return api;},
        in(field,values){q.filters.push([field,values]);return api;},
        order(){return api;},
        limit(){return api;},
        maybeSingle(){q.maybe=true;return api;},
        update(patch){q.mode='update';q.patch=patch;return api;},
        upsert(patch){q.mode='upsert';q.patch=patch;return api;},
        then(resolve,reject){
          const db=window.mockDB;
          const col=key[table];
          let rows=Array.isArray(db[col])?db[col]:db[col]?[db[col]]:[];
          rows=rows.filter(row=>q.filters.every(([field,val])=>
            Array.isArray(val)?val.includes(row[field]):row[field]===val));
          if(q.mode==='update')rows.forEach(row=>Object.assign(row,q.patch));
          if(q.mode==='upsert'){
            const changes=Array.isArray(q.patch)?q.patch:[q.patch];
            changes.forEach(change=>{
              if(col==='availability'){
                const index=db.availability.findIndex(row=>row.weekday===change.weekday);
                if(index>=0)Object.assign(db.availability[index],change);
                else db.availability.push({...change});
              }else if(col==='serviceSettings'){
                const row=db.serviceSettings.find(x=>x.card_service_id===change.card_service_id);
                if(row)Object.assign(row,change);else db.serviceSettings.push({...change});
              }else if(col==='settings')Object.assign(db.settings,change);
            });
          }
          return Promise.resolve({data:q.maybe?(rows[0]||null):rows,error:null}).then(resolve,reject);
        }
      };
      return api;
    }};
  });
  await page.addScriptTag({path:'js/booking-appointments-v1-staging.js'});
  await expect(page.locator('.booking-day')).toHaveCount(7);
  await expect(page.locator('.booking-service-row')).toHaveCount(1);
}

test('mobile weekday and AM/PM hour selects are legible and persist as 24-hour times',async({page})=>{
  await mount(page);
  const monday=page.locator('.booking-day[data-weekday="1"]');
  await expect(monday.locator('[data-day-start]')).toContainText('9:00 AM');
  await expect(monday.locator('[data-day-end]')).toContainText('5:00 PM');
  const width=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(width).toBeLessThanOrEqual(1);
  const inputHeight=await monday.locator('[data-day-start]').evaluate(el=>el.getBoundingClientRect().height);
  expect(inputHeight).toBeGreaterThanOrEqual(44);
  await monday.locator('[data-day-start]').selectOption('09:15');
  await monday.locator('[data-day-end]').selectOption('18:45');
  await page.locator('#booking-save').click();
  await expect.poll(()=>page.evaluate(()=>window.mockDB.availability[1].end_time)).toBe('18:45');
  expect(await page.evaluate(()=>window.mockDB.availability[1].start_time)).toBe('09:15');
});

test('Remove archives only the selected card service and retains appointment history',async({page})=>{
  await mount(page);
  page.on('dialog',dialog=>dialog.accept());
  await expect(page.locator('[data-remove-service]')).toHaveText(/Remove/);
  await page.locator('[data-remove-service]').click();
  await expect(page.locator('.booking-service-row')).toHaveCount(0);
  const data=await page.evaluate(()=>({
    active:window.mockDB.services[0].is_enabled,
    bookable:window.mockDB.serviceSettings[0].enabled,
    historicalService:window.mockDB.history[0].service_name
  }));
  expect(data).toEqual({active:false,bookable:false,historicalService:'Consultation'});
});
