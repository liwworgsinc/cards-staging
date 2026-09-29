/* Showtime Media Library — staging only; reuses the existing artist_settings save RPC. */
(function(){
  'use strict';
  if(window.LIWShowtimeMediaManager)return;
  var root=null,filter='all',editor=null,working=false,limit=4;
  var meta={photo:['Photos','images'],video:['Videos','clapperboard'],audio:['Audio','headphones'],press:['Press','newspaper'],link:['Links','link-2']};
  function bridge(){return window.LIWArtistEpkBridge;}
  function state(){return bridge()&&bridge().getState();}
  function items(){return state()&&Array.isArray(state().media_items)?state().media_items:[];}
  function safe(v,n){return String(v==null?'':v).trim().slice(0,n||1800);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c];});}
  function icon(n,size){return '<i data-lucide="'+n+'" size="'+(size||17)+'"></i>';}
  function uid(){return 'media_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);}
  function url(v){try{var u=new URL(safe(v));return (u.protocol==='https:'||u.protocol==='http:')&&!u.username&&!u.password?u.href:'';}catch(_){return '';}}
  function youtubeId(v){try{var u=new URL(url(v)),h=u.hostname.toLowerCase(),id='';if(h==='youtu.be')id=u.pathname.split('/')[1];else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(h))id=u.searchParams.get('v')||((u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)||[])[1]);return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:'';}catch(_){return '';}}
  function guess(v){try{var h=new URL(url(v)).hostname.toLowerCase();if(h==='youtu.be'||h.endsWith('.youtube.com')||h==='youtube.com'||h.endsWith('.vimeo.com')||h==='vimeo.com')return 'video';if(h.includes('spotify.com')||h.includes('soundcloud.com')||h.includes('audiomack.com')||h.includes('music.apple.com'))return 'audio';if(/\.(jpe?g|png|webp)(\?|$)/i.test(v))return 'photo';}catch(_){}return 'link';}
  function platform(v){try{var h=new URL(url(v)).hostname.toLowerCase();return h.includes('youtube')||h==='youtu.be'?'YouTube':h.includes('vimeo')?'Vimeo':h.includes('spotify')?'Spotify':h.includes('soundcloud')?'SoundCloud':h.includes('audiomack')?'Audiomack':h.includes('apple.com')?'Apple Music':'External link';}catch(_){return 'Add a valid web address';}}
  function thumbnail(row){var u=url(row.url),id=row.type==='video'?youtubeId(u):'';if(row.type==='photo'&&u)return '<img src="'+esc(u)+'" alt="" loading="lazy">';if(id)return '<img src="https://i.ytimg.com/vi/'+id+'/hqdefault.jpg" alt="" loading="lazy">';return icon((meta[row.type]||meta.link)[1],30);}
  function counts(){var values={all:items().length,photo:0,video:0,audio:0,press:0,link:0};items().forEach(function(x){values[x.type in values?x.type:'link']++;});return values;}
  function featured(){return items().find(function(x){return x.featured&&x.visible!==false&&url(x.url);})||items().find(function(x){return x.visible!==false&&url(x.url);});}
  function card(row,index){var visible=row.visible!==false,href=url(row.url),kind=row.type in meta?row.type:'link';return '<article class="show-media-card" data-show-media-id="'+esc(row.id)+'">'+
    '<div class="show-media-thumb">'+thumbnail(row)+'</div><div class="show-media-info"><div class="show-media-badges"><span>'+esc(meta[kind][0])+'</span>'+(row.featured?'<span class="is-featured">Featured</span>':'')+(!visible?'<span class="is-hidden">Hidden</span>':'')+'</div>'+
    '<strong>'+esc(row.title||'Untitled media')+'</strong><small>'+esc(href?platform(href):'Link not added yet')+'</small>'+
    '<div class="show-media-actions"><button type="button" data-show-media-action="edit" data-id="'+esc(row.id)+'">'+icon('pencil',14)+' Edit</button>'+
    '<button type="button" data-show-media-action="feature" data-id="'+esc(row.id)+'" '+(!visible||!href?'disabled':'')+' aria-label="Feature '+esc(row.title||'media')+'">'+icon('star',14)+' '+(row.featured?'Featured':'Feature')+'</button>'+
    '<button type="button" data-show-media-action="visibility" data-id="'+esc(row.id)+'" aria-label="'+(visible?'Hide':'Show')+' media">'+icon(visible?'eye':'eye-off',14)+' '+(visible?'Visible':'Hidden')+'</button>'+
    '<button type="button" data-show-media-action="epk" data-id="'+esc(row.id)+'" aria-pressed="'+(row.epk_include!==false)+'">'+icon('file-user',14)+' EPK '+(row.epk_include===false?'off':'on')+'</button>'+
    (href?'<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer" aria-label="Open '+esc(row.title||'media')+'">'+icon('external-link',14)+' View</a>':'')+
    '<button type="button" data-show-media-action="up" data-id="'+esc(row.id)+'" '+(index===0?'disabled':'')+' aria-label="Move media up">'+icon('arrow-up',14)+'</button>'+
    '<button type="button" data-show-media-action="down" data-id="'+esc(row.id)+'" '+(index===items().length-1?'disabled':'')+' aria-label="Move media down">'+icon('arrow-down',14)+'</button>'+
    '<button type="button" class="show-media-delete" data-show-media-action="delete" data-id="'+esc(row.id)+'" aria-label="Delete '+esc(row.title||'media')+'">'+icon('trash-2',14)+'</button></div></div></article>';}
  function paintIcons(){if(window.lucide)try{window.lucide.createIcons();}catch(_){}}
  function render(){
    if(!root||!state())return;
    var host=root.querySelector('[data-media-manager-host]');if(!host)return;
    var rows=items(),t=counts(),f=featured();
    var tabs=['all','photo','video','audio','press','link'].map(function(k){return '<button type="button" class="'+(filter===k?'active':'')+'" data-show-media-filter="'+k+'" aria-pressed="'+(filter===k)+'">'+(k==='all'?'All media':meta[k][0])+' <span>'+t[k]+'</span></button>';}).join('');
    var visibleRows=rows.map(function(x,i){return {item:x,index:i};}).filter(function(x){return filter==='all'||x.item.type===filter;});
    host.innerHTML='<div class="show-media-dashboard"><div class="show-media-top"><div><small>SHOWTIME MEDIA LIBRARY</small><h4>Your media, one place</h4><p>Photos, performances, audio and press. Releases stay in Music.</p></div><span class="show-media-capacity">'+rows.length+' / '+limit+' slots used</span></div>'+
      '<div class="show-media-feature"><div class="show-media-feature-picture">'+(f?thumbnail(f):icon('star',28))+'</div><div><small>FEATURED ON YOUR SHOWTIME CARD</small><strong>'+esc(f?f.title||'Featured media':'Choose your featured content')+'</strong><span>'+esc(f?meta[f.type][0]+' · '+platform(f.url):'Add a media item and mark it as featured.')+'</span></div></div>'+
      '<div class="show-media-tools"><div class="show-media-tabs" role="group" aria-label="Filter media">'+tabs+'</div><button type="button" class="btn btn-light btn-sm" data-show-media-open="photo" '+(rows.length>=limit?'disabled':'')+'>'+icon('images',16)+' Upload photos</button></div>'+
      '<div class="show-media-list">'+(visibleRows.length?visibleRows.map(function(x){return card(x.item,x.index);}).join(''):'<div class="show-media-empty">'+icon('images',27)+'<strong>No '+(filter==='all'?'media added':meta[filter][0].toLowerCase()+' yet')+'</strong><span>Add content to build your artist experience and EPK.</span></div>')+'</div>'+
      '<p class="show-media-footnote">Your existing four-slot media allowance is unchanged. Hidden items remain saved. Choose EPK on/off per item, then manage the final selection in the EPK tab.</p></div>';
    var add=root.querySelector('[data-media-open]');if(add){add.disabled=rows.length>=limit;add.title=rows.length>=limit?'Four media slots used':'';}
    paintIcons();
  }
  function modal(){return root&&root.querySelector('[data-show-media-dialog]');}
  function close(){var d=modal();if(d){d.hidden=true;d.innerHTML='';}editor=null;}
  function openChooser(){if(items().length>=limit)return notice('All four media slots are in use.');editor={step:'choose'};draw();}
  function openEditor(kind,id){var row=items().find(function(x){return x.id===id;});editor={step:'edit',id:row?row.id:null,type:row?row.type:kind,title:row?row.title:'',url:row?row.url:'',visible:row?row.visible!==false:true,epk_include:row?row.epk_include!==false:true};draw();}
  function draw(){
    var d=modal();if(!d||!editor)return;
    var choose=editor.step==='choose',types=['photo','video','audio','press','link'];
    d.innerHTML='<div class="show-media-backdrop" data-show-media-close></div><div class="show-media-dialog-body" role="dialog" aria-modal="true" aria-labelledby="show-media-dialog-title"><div class="show-media-dialog-head"><div><small>SHOWTIME MEDIA LIBRARY</small><h4 id="show-media-dialog-title">'+(choose?'Add new media':editor.id?'Edit media':'Add '+meta[editor.type][0].toLowerCase())+'</h4></div><button type="button" data-show-media-close aria-label="Close media editor">'+icon('x',19)+'</button></div>'+
      (choose?'<div class="show-media-choices">'+types.map(function(k){return '<button type="button" data-show-media-choose="'+k+'">'+icon(meta[k][1],23)+'<span><strong>'+meta[k][0]+'</strong><small>'+(k==='photo'?'Upload multiple images or paste an image URL':k==='video'?'YouTube, Vimeo, performances and interviews':k==='audio'?'SoundCloud, Spotify, mixes and audio samples':k==='press'?'Interviews, coverage, reviews and articles':'Other websites and media destinations')+'</small></span>'+icon('chevron-right',17)+'</button>';}).join('')+'</div>':
      '<form data-show-media-form><div class="show-media-form-fields"><label>Media type<select class="input" data-show-media-kind>'+types.map(function(k){return '<option value="'+k+'" '+(editor.type===k?'selected':'')+'>'+meta[k][0]+'</option>';}).join('')+'</select></label>'+
      '<label>Title<input class="input" data-show-media-title maxlength="140" required placeholder="e.g. Live at Brooklyn Summer Sessions" value="'+esc(editor.title)+'"></label>'+
      '<label>Media URL<input class="input" data-show-media-url type="url" inputmode="url" placeholder="https://..." value="'+esc(editor.url)+'"></label>'+
      '<p class="show-media-platform" data-show-media-platform>'+esc(editor.url?platform(editor.url):'Paste a link. YouTube thumbnails appear automatically.')+'</p>'+
      (editor.type==='photo'?'<label class="show-media-upload">'+icon('image-up',18)+' Upload photo'+(editor.id?' or more photos':'s')+' (PNG, JPG, WebP; max 5MB each)<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-show-media-files></label>':'')+
      '<div class="show-media-flags"><label><input type="checkbox" data-show-media-visible '+(editor.visible?'checked':'')+'> Visible on my card</label><label><input type="checkbox" data-show-media-epk '+(editor.epk_include?'checked':'')+'> Include in my EPK</label></div><p class="show-media-error" data-show-media-error role="status"></p></div><div class="show-media-dialog-actions"><button type="button" class="btn btn-light" data-show-media-close>Cancel</button><button type="submit" class="btn btn-primary" data-show-media-save>Save media</button></div></form>')+'</div>';
    d.hidden=false;paintIcons();var focus=d.querySelector(choose?'[data-show-media-choose]':'[data-show-media-title]');if(focus)focus.focus();
  }
  function notice(msg){if(typeof window.toast==='function')window.toast(msg);else window.alert(msg);}
  function refresh(){bridge().renderMedia();bridge().renderSummary();bridge().queueSave();document.dispatchEvent(new CustomEvent('liw:artist-settings-rendered'));}
  function adjustEpk(id,include){var s=state();if(!Array.isArray(s.epk_media_ids))return;s.epk_media_ids=s.epk_media_ids.filter(function(x){return x!==id;});if(include&&s.epk_media_ids.length<limit)s.epk_media_ids.push(id);}
  function onAction(action,id){var rows=items(),i=rows.findIndex(function(x){return x.id===id;});if(i<0)return;var row=rows[i];
    if(action==='edit'){openEditor(row.type,row.id);return;}
    if(action==='delete'){if(!window.confirm('Remove "'+(row.title||'media item')+'"? This will be saved to your card.'))return;rows.splice(i,1);if(Array.isArray(state().epk_media_ids))state().epk_media_ids=state().epk_media_ids.filter(function(x){return x!==id;});}
    else if(action==='feature'){if(!url(row.url)||row.visible===false)return;rows.forEach(function(x){x.featured=x.id===id;});}
    else if(action==='visibility'){row.visible=row.visible===false;if(!row.visible)row.featured=false;}
    else if(action==='epk'){row.epk_include=row.epk_include===false;adjustEpk(id,row.epk_include);}
    else if(action==='up'&&i>0){rows.splice(i,1);rows.splice(i-1,0,row);}
    else if(action==='down'&&i<rows.length-1){rows.splice(i,1);rows.splice(i+1,0,row);}
    refresh();
  }
  function commit(){if(!editor||working)return;var d=modal(),title=safe(d.querySelector('[data-show-media-title]')?.value,140),address=url(d.querySelector('[data-show-media-url]')?.value),raw=safe(d.querySelector('[data-show-media-url]')?.value);
    var error=d.querySelector('[data-show-media-error]');if(!title){error.textContent='Add a title before saving.';return;}if(!address){error.textContent=raw?'Use a valid http:// or https:// web address.':'Add a URL or upload an image first.';return;}
    var type=d.querySelector('[data-show-media-kind]').value;if(!meta[type])type='link';
    var row=items().find(function(x){return x.id===editor.id;});if(!row&&items().length>=limit){error.textContent='All four media slots are used.';return;}
    if(!row){row={id:uid(),type:type,title:'',url:'',featured:false,visible:true,epk_include:true};items().push(row);}
    row.title=title;row.url=address;row.type=type;row.visible=d.querySelector('[data-show-media-visible]').checked;row.epk_include=d.querySelector('[data-show-media-epk]').checked;
    if(!row.visible)row.featured=false;adjustEpk(row.id,row.epk_include);
    if(items().length===1&&row.visible)row.featured=true;
    close();refresh();
  }
  async function upload(files){
    if(working||!editor||editor.type!=='photo')return;
    var selected=Array.from(files||[]),remaining=limit-items().length+(editor.id?1:0),d=modal(),error=d&&d.querySelector('[data-show-media-error]');
    if(!selected.length)return;if(selected.length>remaining){if(error)error.textContent='Only '+remaining+' photo slot'+(remaining===1?'':'s')+' available.';return;}
    if(selected.some(function(f){return !['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>5*1024*1024;})){if(error)error.textContent='Use PNG, JPG or WebP images under 5 MB each.';return;}
    working=true;if(error)error.textContent='Uploading photos…';
    try{
      var auth=await supabaseClient.auth.getUser(),user=auth.data&&auth.data.user;if(!user)throw new Error('Sign in to upload photos.');
      var rows=[];for(var i=0;i<selected.length;i++){
        var f=selected[i],id=i===0&&editor.id?editor.id:uid(),name=f.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-'),path=user.id+'/artist-media-images/'+id+'-'+Date.now()+'-'+name;
        var result=await supabaseClient.storage.from('profile-images').upload(path,f,{cacheControl:'3600',upsert:false});
        if(result.error)throw result.error;
        var publicUrl=supabaseClient.storage.from('profile-images').getPublicUrl(path).data.publicUrl;
        rows.push({id:id,type:'photo',title:safe(i===0&&editor.title?editor.title:f.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '),140)||'Artist photo',url:publicUrl,featured:false,visible:editor.visible!==false,epk_include:editor.epk_include!==false});
      }
      rows.forEach(function(row){var old=items().findIndex(function(x){return x.id===row.id;});if(old>=0)items()[old]=Object.assign({},items()[old],row);else items().push(row);adjustEpk(row.id,row.epk_include);});
      if(!items().some(function(x){return x.featured&&x.visible!==false;})&&items().length)items()[0].featured=true;
      close();refresh();notice(rows.length+' photo'+(rows.length===1?'':'s')+' added.');
    }catch(e){if(error)error.textContent=safe(e.message||'Unable to upload. Please retry.',200);}
    finally{working=false;}
  }
  function attach(){
    if(!root||root.dataset.showMediaBound)return;root.dataset.showMediaBound='1';
    var d=document.createElement('div');d.className='show-media-dialog';d.dataset.showMediaDialog='';d.hidden=true;root.appendChild(d);
    root.addEventListener('click',function(e){
      var add=e.target.closest('[data-media-open],[data-show-media-open]');if(add){openChooser();if(add.dataset.showMediaOpen==='photo')openEditor('photo');return;}
      var tab=e.target.closest('[data-show-media-filter]');if(tab){filter=tab.dataset.showMediaFilter;render();return;}
      var btn=e.target.closest('[data-show-media-action]');if(btn){onAction(btn.dataset.showMediaAction,btn.dataset.id);return;}
      var choice=e.target.closest('[data-show-media-choose]');if(choice){openEditor(choice.dataset.showMediaChoose);return;}
      if(e.target.closest('[data-show-media-close]')){if(!working)close();return;}
    });
    root.addEventListener('submit',function(e){if(e.target.matches('[data-show-media-form]')){e.preventDefault();commit();}});
    root.addEventListener('input',function(e){if(e.target.matches('[data-show-media-url]')){var p=modal()?.querySelector('[data-show-media-platform]');if(p)p.textContent=platform(e.target.value);}});
    root.addEventListener('change',function(e){if(e.target.matches('[data-show-media-files]')){upload(e.target.files);e.target.value='';}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal()&&!modal().hidden&&!working)close();});
  }
  window.LIWShowtimeMediaManager={render:function(host,cap){if(host)root=host;if(cap)limit=cap;if(!root)return;attach();render();}};
  var tries=0;var boot=setInterval(function(){tries++;var host=document.getElementById('artist-dressing-room');if(host&&bridge()){clearInterval(boot);window.LIWShowtimeMediaManager.render(host,4);}else if(tries>100)clearInterval(boot);},200);
})();
