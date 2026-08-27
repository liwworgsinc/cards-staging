const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents||0)/100);

const AFFILIATE_PAYOUT_METHODS = {
  zelle: {
    label: 'Zelle',
    fieldLabel: 'Zelle email or phone number',
    placeholder: 'Email or phone number',
    help: 'Use the email or phone number connected to your Zelle account.'
  },
  venmo: {
    label: 'Venmo',
    fieldLabel: 'Venmo username',
    placeholder: '@yourusername',
    help: 'Enter the username connected to your Venmo account.'
  },
  cash_app: {
    label: 'Cash App',
    fieldLabel: 'Cash App $Cashtag',
    placeholder: '$YourCashtag',
    help: 'Enter the $Cashtag connected to your Cash App account.'
  }
};

function selectedAffiliatePayoutMethod() {
  return document.querySelector('input[name="payout_method"]:checked')?.value || 'zelle';
}

function normalizeAffiliatePayoutDetails(method, details) {
  let value = String(details || '').trim();
  if (method === 'venmo' && value && !value.startsWith('@')) value = `@${value}`;
  if (method === 'cash_app' && value && !value.startsWith('$')) value = `$${value}`;
  return value;
}

function updateAffiliatePayoutField() {
  const method = selectedAffiliatePayoutMethod();
  const settings = AFFILIATE_PAYOUT_METHODS[method] || AFFILIATE_PAYOUT_METHODS.zelle;
  const label = document.getElementById('affiliate-payout-detail-label');
  const input = document.getElementById('affiliate-payout-details');
  const help = document.getElementById('affiliate-payout-detail-help');
  if (label) label.textContent = settings.fieldLabel;
  if (input) input.placeholder = settings.placeholder;
  if (help) help.textContent = settings.help;
}

function renderAffiliateProgramGate(status, state) {
  const inactive = state === 'inactive';
  status.innerHTML = `
    <div style="display:grid;gap:14px">
      <div>
        <span class="affiliate-mini-label">Optional earning feature</span>
        <h2 style="margin:6px 0 8px">${inactive ? 'Affiliate earning is turned off' : 'Earn with LIW when you are ready'}</h2>
        <p class="muted" style="margin:0;line-height:1.6">${inactive
          ? 'Your LIW Cards account and published cards are unchanged. Reactivate anytime if you want to share LIW Cards and earn commissions.'
          : 'Affiliate access is included with your account, but participation is optional. Activate it to receive your referral link, commission tracking, payout setup, and tax onboarding.'}</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="affiliate-activate-program" type="button">${inactive ? 'Reactivate affiliate earning' : 'Activate & earn'}</button>
        ${inactive ? '' : '<button class="btn btn-light" id="affiliate-decline-program" type="button">Not interested</button>'}
        <a class="btn btn-light" href="affiliate.html">See how it works</a>
      </div>
      <small class="muted">Tax and payout information are only required after you activate earning. Activating does not change your LIW Cards plan or charge you anything.</small>
    </div>`;

  document.getElementById('affiliate-activate-program')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Activating…';
    try {
      await window.LIWAffiliateOptIn?.activate?.();
      location.reload();
    } catch (error) {
      button.disabled = false;
      button.textContent = inactive ? 'Reactivate affiliate earning' : 'Activate & earn';
      toast(error?.message || 'Unable to activate affiliate earning.');
    }
  });

  document.getElementById('affiliate-decline-program')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      await window.LIWAffiliateOptIn?.optOut?.();
      renderAffiliateProgramGate(status, 'inactive');
      toast('Affiliate earning is turned off.');
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Not interested';
      toast(error?.message || 'Unable to save your affiliate preference.');
    }
  });
}

(async()=>{
 const status=document.getElementById('affiliate-dashboard-status');
 const {data:{session}}=await supabaseClient.auth.getSession();
 if(!session){status.innerHTML='Please <a href="login.html">log in</a> to view your affiliate account.';return;}

 const programState=window.LIWAffiliateOptIn?.state?.(session.user)||'available';
 if(programState!=='active'){
   document.getElementById('affiliate-approved-content').hidden=true;
   renderAffiliateProgramGate(status,programState);
   return;
 }

 const {data:affiliateData,error}=await supabaseClient.from('affiliates').select('id,referral_code,status,tax_status,payout_status,payout_minimum_cents,payout_method,payout_details,payout_details_confirmed_at,created_at,commission_card_bps,commission_reseller_bps,reseller_month_limit').eq('user_id',session.user.id).maybeSingle();
 if(error){status.textContent=error.message;return;}
 if(!affiliateData){status.innerHTML='Your referral account is still being created. Refresh this page in a moment or contact support if it does not appear.';return;}
 let affiliate=affiliateData;
 const payoutLabel=affiliate.payout_method ? (AFFILIATE_PAYOUT_METHODS[affiliate.payout_method]?.label || titleCase(affiliate.payout_method)) : 'Not selected';
 status.innerHTML=`<div style="display:flex;gap:14px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap"><div><strong>Affiliate status: ${escapeHtml(affiliate.status)}</strong><br><span class="muted">Tax status: ${escapeHtml(affiliate.tax_status.replaceAll('_',' '))} · Payout method: ${escapeHtml(payoutLabel)} · Payout status: ${escapeHtml(affiliate.payout_status.replaceAll('_',' '))} · Minimum payout: ${money(affiliate.payout_minimum_cents)}</span></div><button class="btn btn-light btn-sm" id="affiliate-opt-out-program" type="button">Turn off affiliate earning</button></div>`;
 document.getElementById('affiliate-approved-content').hidden=false;
 document.getElementById('affiliate-opt-out-program')?.addEventListener('click',async event=>{
   const button=event.currentTarget;
   button.disabled=true;
   button.textContent='Turning off…';
   try{
     await window.LIWAffiliateOptIn?.optOut?.();
     document.getElementById('affiliate-approved-content').hidden=true;
     renderAffiliateProgramGate(status,'inactive');
     toast('Affiliate earning is turned off. Your LIW Cards account is unchanged.');
   }catch(error){
     button.disabled=false;
     button.textContent='Turn off affiliate earning';
     toast(error?.message||'Unable to update your affiliate preference.');
   }
 });
 const joinedAt=new Date(affiliate.created_at);
 const boostEndsAt=new Date(joinedAt.getTime());
 boostEndsAt.setUTCMonth(boostEndsAt.getUTCMonth()+12);
 const boostActive=Number.isFinite(boostEndsAt.getTime())&&Date.now()<boostEndsAt.getTime();
 const boostDays=Math.max(0,Math.ceil((boostEndsAt.getTime()-Date.now())/86400000));
 const cardStandard=(Number(affiliate.commission_card_bps||2000)/100).toFixed(Number(affiliate.commission_card_bps||2000)%100?2:0);
 const agencyStandard=(Number(affiliate.commission_reseller_bps||1000)/100).toFixed(Number(affiliate.commission_reseller_bps||1000)%100?2:0);
 const rateBox=document.getElementById('affiliate-rate-status');
 const rateKicker=document.getElementById('affiliate-rate-kicker');
 const rateTitle=document.getElementById('affiliate-rate-title');
 const rateCopy=document.getElementById('affiliate-rate-copy');
 const countdown=document.getElementById('affiliate-rate-countdown');
 const daysEl=document.getElementById('affiliate-boost-days');
 if(rateBox)rateBox.classList.toggle('standard-rate',!boostActive);
 if(rateKicker)rateKicker.textContent=boostActive?'First-year commission boost':'Standard commission rates';
 if(rateTitle)rateTitle.textContent=boostActive?'25% card plans · 15% Agency':'Your standard rates are active';
 if(rateCopy)rateCopy.textContent=boostActive?`Your boosted rate runs through ${boostEndsAt.toLocaleDateString()}. After that, eligible commissions continue at ${cardStandard}% on Plus/Pro and ${agencyStandard}% on Agency.`:`Eligible commissions continue at ${cardStandard}% on Plus/Pro and ${agencyStandard}% on Agency. Agency billing is limited to its eligible referral window.`;
 if(daysEl)daysEl.textContent=boostActive?String(boostDays):'✓';
 if(countdown){countdown.querySelector('span').textContent=boostActive?'days left':'standard rate';}
 const link=`https://cards.liwworgs.com/${encodeURIComponent(affiliate.referral_code)}`;
 document.getElementById('affiliate-link').value=link;
 window.LIWAffiliateShareKit?.setLink?.(link,true);
 document.getElementById('copy-affiliate-link').onclick=async()=>{await navigator.clipboard.writeText(link);toast('Affiliate link copied');};

 const payoutForm=document.getElementById('affiliate-payout-form');
 const payoutDetails=document.getElementById('affiliate-payout-details');
 const payoutConfirmed=document.getElementById('affiliate-payout-confirmed');
 const payoutStatus=document.getElementById('affiliate-payout-method-status');
 const payoutButton=document.getElementById('save-affiliate-payout');
 if(affiliate.payout_method){
   const savedMethod=document.querySelector(`input[name="payout_method"][value="${affiliate.payout_method}"]`);
   if(savedMethod) savedMethod.checked=true;
 }
 if(payoutDetails) payoutDetails.value=affiliate.payout_details || '';
 if(payoutConfirmed) payoutConfirmed.checked=Boolean(affiliate.payout_details_confirmed_at);
 if(payoutStatus){
   payoutStatus.textContent=affiliate.payout_method
     ? `Saved: ${payoutLabel} · Payout status: ${titleCase(affiliate.payout_status)}`
     : 'Choose how you would like to receive approved commissions.';
 }
 document.querySelectorAll('input[name="payout_method"]').forEach(input=>input.addEventListener('change',updateAffiliatePayoutField));
 updateAffiliatePayoutField();

 payoutForm?.addEventListener('submit',async event=>{
   event.preventDefault();
   const method=selectedAffiliatePayoutMethod();
   const details=normalizeAffiliatePayoutDetails(method,payoutDetails?.value);
   const confirmed=Boolean(payoutConfirmed?.checked);
   if(!details){toast('Enter your payout information.');payoutDetails?.focus();return;}
   if(!confirmed){toast('Confirm that the payout information belongs to you.');payoutConfirmed?.focus();return;}
   payoutButton.disabled=true;
   payoutButton.textContent='Saving…';
   const {data,error:saveError}=await supabaseClient.rpc('save_affiliate_payout_method',{
     p_method:method,
     p_payout_details:details,
     p_confirmed:confirmed
   });
   payoutButton.disabled=false;
   payoutButton.textContent='Save payout method';
   if(saveError){toast(saveError.message);return;}
   affiliate={...affiliate,...data};
   if(payoutDetails) payoutDetails.value=details;
   const savedLabel=AFFILIATE_PAYOUT_METHODS[method]?.label || titleCase(method);
   if(payoutStatus) payoutStatus.textContent=`Saved: ${savedLabel} · Payout status: ${titleCase(data.payout_status || affiliate.payout_status)}`;
   status.innerHTML=`<div style="display:flex;gap:14px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap"><div><strong>Affiliate status: ${escapeHtml(affiliate.status)}</strong><br><span class="muted">Tax status: ${escapeHtml(affiliate.tax_status.replaceAll('_',' '))} · Payout method: ${escapeHtml(savedLabel)} · Payout status: ${escapeHtml(String(data.payout_status || affiliate.payout_status).replaceAll('_',' '))} · Minimum payout: ${money(affiliate.payout_minimum_cents)}</span></div><button class="btn btn-light btn-sm" id="affiliate-opt-out-program" type="button">Turn off affiliate earning</button></div>`;
   toast(`${savedLabel} payout information saved.`);
 });

 const [{data:commissions},{data:payouts}]=await Promise.all([
  supabaseClient.from('affiliate_commissions').select('created_at,plan_key,gross_revenue_cents,commission_cents,status').eq('affiliate_id',affiliate.id).order('created_at',{ascending:false}).limit(50),
  supabaseClient.from('affiliate_payouts').select('amount_cents,status').eq('affiliate_id',affiliate.id)
 ]);
 const totals={pending:0,payable:0,paid:0};
 (commissions||[]).forEach(row=>{if(['pending','approved'].includes(row.status))totals.pending+=row.commission_cents;if(row.status==='payable')totals.payable+=row.commission_cents;});
 (payouts||[]).forEach(row=>{if(row.status==='paid')totals.paid+=row.amount_cents;});
 document.getElementById('aff-pending').textContent=money(totals.pending);document.getElementById('aff-payable').textContent=money(totals.payable);document.getElementById('aff-paid').textContent=money(totals.paid);
 const body=document.getElementById('affiliate-commission-rows');
 body.innerHTML=(commissions||[]).length?(commissions||[]).map(r=>`<tr><td>${new Date(r.created_at).toLocaleDateString()}</td><td>${escapeHtml(titleCase(r.plan_key))}</td><td>${money(r.gross_revenue_cents)}</td><td>${money(r.commission_cents)}</td><td>${escapeHtml(titleCase(r.status))}</td></tr>`).join(''):'<tr><td colspan="5">No commission activity yet.</td></tr>';
})();
