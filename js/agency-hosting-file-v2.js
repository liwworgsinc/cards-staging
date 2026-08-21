(function(){
  'use strict';

  function renderer(){
    return location.hostname==='liwworgsinc.github.io'
      ? 'https://liwworgsinc.github.io/cards-staging/card.html'
      : 'https://cards.liwworgs.com/card.html';
  }

  function notify(message){
    const toast=document.getElementById('agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencyHostingFileToast);
    window.__agencyHostingFileToast=setTimeout(()=>toast.classList.remove('show'),3200);
  }

  async function resolveOwnerId(){
    const {data:{user},error}=await supabaseClient.auth.getUser();
    if(error||!user)throw error||new Error('Sign in again.');
    const {data:member,error:memberError}=await supabaseClient.from('workspace_members')
      .select('owner_user_id,status')
      .eq('member_user_id',user.id)
      .eq('status','active')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(memberError)throw memberError;
    return member?.owner_user_id||user.id;
  }

  async function canExportClientData(){
    try{
      const ownerId=await resolveOwnerId();
      const {data,error}=await supabaseClient.rpc('can_export_agency_clients',{p_owner:ownerId});
      if(error)throw error;
      return data===true;
    }catch(error){
      console.warn('Agency connected-file export permission check failed:',error);
      return false;
    }
  }

  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
  }

  function inlineValue(value=''){
    return JSON.stringify(String(value)).replace(/</g,'\\u003c');
  }

  async function fetchText(url,label){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`${label} request failed (${response.status})`);
    return response.text();
  }

  async function buildFile(card){
    const shellUrl=renderer();
    const baseUrl=shellUrl.slice(0,shellUrl.lastIndexOf('/')+1);
    let html=await fetchText(shellUrl,'Card shell');
    if(!/<head(?:\s|>)/i.test(html)||!/<\/body>/i.test(html)){
      throw new Error('Card shell is incomplete.');
    }

    const configTag=html.match(/<script\b[^>]*\bsrc=["']([^"']*js\/config\.js[^"']*)["'][^>]*><\/script>/i);
    const publicCardTag=html.match(/<script\b[^>]*\bsrc=["']([^"']*js\/public-card\.js[^"']*)["'][^>]*><\/script>/i);
    if(!configTag)throw new Error('Card config was not found.');
    if(!publicCardTag)throw new Error('Public card loader was not found.');

    const configUrl=new URL(configTag[1],shellUrl).href;
    let configJs=await fetchText(configUrl,'Card config');
    configJs=configJs.replace(/<\/script/gi,'<\\/script');

    const publicCardUrl=new URL(publicCardTag[1],shellUrl).href;
    let publicCardJs=await fetchText(publicCardUrl,'Public card loader');
    const slugPattern=/const\s+slug\s*=\s*new\s+URLSearchParams\(location\.search\)\.get\(['"]slug['"]\)\s*;/;
    if(!slugPattern.test(publicCardJs))throw new Error('Public card slug loader changed.');
    publicCardJs=publicCardJs.replace(slugPattern,`const slug = ${inlineValue(card.slug)};`);
    publicCardJs=publicCardJs.replace(/<\/script/gi,'<\\/script');

    const title=card.company?`${card.name} · ${card.company}`:card.name;
    html=html.replace(/<head([^>]*)>/i,`<head$1><base href="${escapeHtml(baseUrl)}">`);
    html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${escapeHtml(title||'Client Card')}</title>`);
    html=html.replace(configTag[0],`<script data-liw-connected-config>${configJs}</script>`);
    html=html.replace(publicCardTag[0],`<script data-liw-connected-public-card>${publicCardJs}</script>`);
    return html;
  }

  window.addEventListener('click',async event=>{
    if(event.target?.id!=='agency-hosting-v2-download')return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const button=event.target;
    const allowed=await canExportClientData();
    if(!allowed){
      notify('Connected client-card downloads are Owner/Admin only.');
      document.getElementById('agency-hosting-v2-dialog')?.close?.();
      return;
    }

    const select=document.getElementById('agency-hosting-v2-select');
    const slug=select?.value||'';
    const option=select?.selectedOptions?.[0];
    if(!slug||!option)return;

    const originalLabel=button.textContent;
    button.disabled=true;
    button.textContent='Building file…';
    try{
      const card={slug,name:option.textContent||'Client Card',company:''};
      const html=await buildFile(card);
      const blob=new Blob([html],{type:'text/html;charset=utf-8'});
      const href=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=href;
      link.download='index.html';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(href),1000);
      notify('Connected card file downloaded.');
    }catch(error){
      console.error('Agency connected-file build failed:',error);
      notify('Could not build the connected card file. Try again.');
    }finally{
      button.disabled=false;
      button.textContent=originalLabel;
    }
  },true);
})();
