(function(){
  'use strict';

  const fields=['full_name','business_name','job_title','phone','website','location','timezone'];
  let currentUser=null;
  let currentProfile=null;
  let saving=false;

  const $=id=>document.getElementById(id);
  const metaKey=name=>({business_name:'liw_business_name',job_title:'liw_job_title',phone:'liw_phone',website:'liw_website',location:'liw_location',timezone:'liw_timezone'}[name]||name);
  const value=id=>String($(id)?.value||'').trim();
  const initials=name=>String(name||'LIW').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'LIW';
  function formatDate(input){if(!input)return '—';try{return new Date(input).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}catch(_){return '—';}}
  function setMessage(text,type='success'){const el=$('profile-message');if(!el)return;el.textContent=text;el.className=`profile-message ${type}`;el.hidden=false;clearTimeout(setMessage.timer);setMessage.timer=setTimeout(()=>{el.hidden=true;},3200);}
  function updateCompleteness(){const values=[value('full_name'),value('business_name'),value('job_title'),value('phone'),value('website'),value('location')];const percent=Math.round(values.filter(Boolean).length/values.length*100);$('profile-complete-percent').textContent=`${percent}%`;$('profile-complete-bar').style.width=`${percent}%`;$('profile-complete-copy').textContent=percent===100?'Your account profile is complete.':`${values.filter(Boolean).length} of ${values.length} account details added`;return percent;}

  function mergedProfile(user,profile){
    const metadata=user.user_metadata||{};
    return {
      full_name:profile?.full_name||metadata.full_name||'',
      business_name:profile?.business_name||metadata.liw_business_name||'',
      job_title:profile?.job_title||metadata.liw_job_title||'',
      phone:profile?.phone||metadata.liw_phone||'',
      website:profile?.website||metadata.liw_website||'',
      location:profile?.location||metadata.liw_location||'',
      timezone:profile?.timezone||metadata.liw_timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'America/New_York'
    };
  }

  function fillForm(user,profile=currentProfile){
    const data=mergedProfile(user,profile);
    fields.forEach(name=>{if($(name))$(name).value=data[name]||'';});
    $('account-email').value=user.email||'';
    $('profile-email').textContent=user.email||'';
    $('profile-name').textContent=data.full_name||'Your profile';
    $('profile-avatar').textContent=initials(data.full_name||user.email);
    $('member-since').textContent=formatDate(user.created_at);
    updateCompleteness();
  }

  async function loadProfile(user){
    const {data,error}=await supabaseClient.from('profiles').select('full_name,business_name,job_title,phone,website,location,timezone').eq('id',user.id).maybeSingle();
    if(error){console.warn('Profile database lookup:',error);return null;}
    return data||null;
  }

  async function loadAccountStats(user){
    try{
      const [access,cardsResult]=await Promise.all([
        window.getLiwAccessContext?getLiwAccessContext(user,{refresh:true}):Promise.resolve(null),
        supabaseClient.from('digital_cards').select('id',{count:'exact',head:true}).eq('user_id',user.id)
      ]);
      $('profile-plan').textContent=access?.isAdmin?'LIW Admin':(access?.planName||'Starter');
      $('profile-card-count').textContent=String(cardsResult.count||0);
    }catch(error){console.warn('Profile summary lookup:',error);$('profile-plan').textContent='LIW Cards';}
  }

  async function saveProfile(event){
    event?.preventDefault();
    if(!currentUser||saving)return;
    saving=true;
    const button=$('save-profile');
    const original=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<i data-lucide="loader-circle" size="17"></i> Saving…';
    window.lucide?.createIcons?.();

    try{
      const profilePayload={};
      fields.forEach(name=>{profilePayload[name]=value(name);});
      profilePayload.updated_at=new Date().toISOString();

      const metadata={};
      fields.forEach(name=>{metadata[metaKey(name)]=profilePayload[name];});
      metadata.full_name=profilePayload.full_name;

      const {data,error}=await supabaseClient.auth.updateUser({data:metadata});
      if(error)throw error;
      currentUser=data.user||currentUser;

      const {data:savedProfile,error:profileError}=await supabaseClient.from('profiles').update(profilePayload).eq('id',currentUser.id).select('full_name,business_name,job_title,phone,website,location,timezone').single();
      if(profileError)throw profileError;
      currentProfile=savedProfile;

      fillForm(currentUser,currentProfile);
      setMessage('Profile updated ✓');
      button.innerHTML='<i data-lucide="check" size="17"></i> Saved';
      window.lucide?.createIcons?.();
      setTimeout(()=>{button.innerHTML=original;window.lucide?.createIcons?.();},1400);
    }catch(error){
      console.error(error);
      setMessage(error?.message||'Could not update your profile.','error');
      button.innerHTML=original;
      window.lucide?.createIcons?.();
    }finally{
      saving=false;
      button.disabled=false;
    }
  }

  async function sendPasswordReset(){if(!currentUser?.email)return;const button=$('password-reset');const original=button.innerHTML;button.disabled=true;button.textContent='Sending…';try{const {error}=await supabaseClient.auth.resetPasswordForEmail(currentUser.email,{redirectTo:liwUrl('reset-password.html')});if(error)throw error;setMessage('Password reset link sent to your email.');}catch(error){setMessage(error?.message||'Could not send the reset link.','error');}finally{button.disabled=false;button.innerHTML=original;window.lucide?.createIcons?.();}}

  async function boot(){
    try{
      currentUser=await requireUser();
      if(!currentUser)return;
      currentProfile=await loadProfile(currentUser);
      fillForm(currentUser,currentProfile);
      await loadAccountStats(currentUser);
      $('profile-form')?.addEventListener('submit',saveProfile);
      fields.forEach(name=>$(name)?.addEventListener('input',updateCompleteness));
      $('password-reset')?.addEventListener('click',sendPasswordReset);
      $('sidebar-toggle')?.addEventListener('click',()=>document.getElementById('sidebar')?.classList.toggle('open'));
      window.lucide?.createIcons?.();
    }catch(error){console.error('LIW profile startup:',error);setMessage('Profile could not finish loading. Refresh and try again.','error');}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
