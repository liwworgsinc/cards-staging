(function(){
  'use strict';

  const fields=['full_name','business_name','job_title','phone','website','location','timezone'];
  let currentUser=null;
  let saving=false;

  const $=id=>document.getElementById(id);
  const metaKey=name=>({
    business_name:'liw_business_name',
    job_title:'liw_job_title',
    phone:'liw_phone',
    website:'liw_website',
    location:'liw_location',
    timezone:'liw_timezone'
  }[name]||name);

  function value(id){return String($(id)?.value||'').trim();}
  function initials(name){
    return String(name||'LIW').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'LIW';
  }
  function formatDate(input){
    if(!input)return '—';
    try{return new Date(input).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}catch(_){return '—';}
  }
  function setMessage(text,type='success'){
    const el=$('profile-message');
    if(!el)return;
    el.textContent=text;
    el.className=`profile-message ${type}`;
    el.hidden=false;
    clearTimeout(setMessage.timer);
    setMessage.timer=setTimeout(()=>{el.hidden=true;},3200);
  }
  function updateCompleteness(){
    const values=[value('full_name'),value('business_name'),value('job_title'),value('phone'),value('website'),value('location')];
    const percent=Math.round(values.filter(Boolean).length/values.length*100);
    $('profile-complete-percent').textContent=`${percent}%`;
    $('profile-complete-bar').style.width=`${percent}%`;
    $('profile-complete-copy').textContent=percent===100?'Your account profile is complete.':`${values.filter(Boolean).length} of ${values.length} account details added`;
    return percent;
  }
  function fillForm(user){
    const metadata=user.user_metadata||{};
    $('full_name').value=metadata.full_name||'';
    $('business_name').value=metadata.liw_business_name||'';
    $('job_title').value=metadata.liw_job_title||'';
    $('phone').value=metadata.liw_phone||'';
    $('website').value=metadata.liw_website||'';
    $('location').value=metadata.liw_location||'';
    $('timezone').value=metadata.liw_timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York';
    $('account-email').value=user.email||'';
    $('profile-email').textContent=user.email||'';
    $('profile-name').textContent=metadata.full_name||'Your profile';
    $('profile-avatar').textContent=initials(metadata.full_name||user.email);
    $('member-since').textContent=formatDate(user.created_at);
    updateCompleteness();
  }
  async function loadAccountStats(user){
    try{
      const [access,cardsResult]=await Promise.all([
        window.getLiwAccessContext?getLiwAccessContext(user,{refresh:true}):Promise.resolve(null),
        supabaseClient.from('digital_cards').select('id',{count:'exact',head:true}).eq('user_id',user.id)
      ]);
      $('profile-plan').textContent=access?.isAdmin?'LIW Admin':(access?.planName||'Starter');
      $('profile-card-count').textContent=String(cardsResult.count||0);
    }catch(error){
      console.warn('Profile summary lookup:',error);
      $('profile-plan').textContent='LIW Cards';
    }
  }
  async function saveProfile(event){
    event?.preventDefault();
    if(!currentUser||saving)return;
    saving=true;
    const button=$('save-profile');
    const original=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<i data-lucide="loader-circle" size="17"></i> Saving…';
    if(window.lucide)lucide.createIcons();

    try{
      const metadata={};
      fields.forEach(name=>{metadata[metaKey(name)]=value(name);});
      metadata.full_name=value('full_name');

      const {data,error}=await supabaseClient.auth.updateUser({data:metadata});
      if(error)throw error;
      currentUser=data.user||currentUser;

      const {error:profileError}=await supabaseClient.from('profiles').update({full_name:metadata.full_name}).eq('id',currentUser.id);
      if(profileError)console.warn('Profile full_name sync skipped:',profileError);

      fillForm(currentUser);
      setMessage('Profile updated ✓');
      button.innerHTML='<i data-lucide="check" size="17"></i> Saved';
      if(window.lucide)lucide.createIcons();
      setTimeout(()=>{button.innerHTML=original;if(window.lucide)lucide.createIcons();},1400);
    }catch(error){
      console.error(error);
      setMessage(error?.message||'Could not update your profile.','error');
      button.innerHTML=original;
      if(window.lucide)lucide.createIcons();
    }finally{
      saving=false;
      button.disabled=false;
    }
  }
  async function sendPasswordReset(){
    if(!currentUser?.email)return;
    const button=$('password-reset');
    const original=button.innerHTML;
    button.disabled=true;
    button.textContent='Sending…';
    try{
      const {error}=await supabaseClient.auth.resetPasswordForEmail(currentUser.email,{redirectTo:liwUrl('reset-password.html')});
      if(error)throw error;
      setMessage('Password reset link sent to your email.');
    }catch(error){setMessage(error?.message||'Could not send the reset link.','error');}
    finally{button.disabled=false;button.innerHTML=original;if(window.lucide)lucide.createIcons();}
  }

  async function boot(){
    try{
      currentUser=await requireUser();
      if(!currentUser)return;
      fillForm(currentUser);
      await loadAccountStats(currentUser);
      $('profile-form')?.addEventListener('submit',saveProfile);
      fields.forEach(name=>$(name)?.addEventListener('input',updateCompleteness));
      $('password-reset')?.addEventListener('click',sendPasswordReset);
      $('sidebar-toggle')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.toggle('open'));
      if(window.lucide)lucide.createIcons();
    }catch(error){
      console.error('LIW profile startup:',error);
      setMessage('Profile could not finish loading. Refresh and try again.','error');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
