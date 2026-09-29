(function PromoterPackage(){
  'use strict';
  if(window.__LIW_PROMOTER_PACKAGE__)return;
  window.__LIW_PROMOTER_PACKAGE__=true;
  const encoder=new TextEncoder();
  const MAX_ASSET=10*1024*1024;
  const MAX_TOTAL=38*1024*1024;
  const safe=(v,n=1800)=>String(v??'').trim().slice(0,n);
  function webUrl(value){
    try{const u=new URL(safe(value,2000));return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch(_){return '';}
  }
  function address(value){const v=safe(value,180);return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(v)?v:'';}
  function slug(value){return safe(value,90).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'Artist';}
  function bytes(value){return typeof value==='string'?encoder.encode(value):value instanceof Uint8Array?value:new Uint8Array(value);}
  const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let j=0;j<8;j++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;});
  function crc32(data){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
  function zip(files){
    if(!files.length||files.length>64)throw Error('The package contains an invalid number of files.');
    let total=0,offset=0;const chunks=[],central=[];
    const now=new Date(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),date=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    const push=part=>{chunks.push(part);offset+=part.length;};
    for(const file of files){
      if(!/^[a-zA-Z0-9_ .()/-]+$/.test(file.name)||file.name.includes('..')||file.name.startsWith('/'))throw Error('Invalid package filename.');
      const name=encoder.encode(file.name),data=bytes(file.data);total+=data.length;
      if(total>MAX_TOTAL)throw Error('Package exceeds the 38 MB download limit.');
      const crc=crc32(data),localOffset=offset;
      const header=new Uint8Array(30+name.length),h=new DataView(header.buffer);
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);
      h.setUint16(10,time,true);h.setUint16(12,date,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);
      h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);header.set(name,30);push(header);push(data);
      const cd=new Uint8Array(46+name.length),v=new DataView(cd.buffer);
      v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x0800,true);
      v.setUint16(10,0,true);v.setUint16(12,time,true);v.setUint16(14,date,true);v.setUint32(16,crc,true);
      v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);
      v.setUint32(42,localOffset,true);cd.set(name,46);central.push(cd);
    }
    const centralStart=offset;central.forEach(push);const centralSize=offset-centralStart;
    const end=new Uint8Array(22),v=new DataView(end.buffer);
    v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
    v.setUint32(12,centralSize,true);v.setUint32(16,centralStart,true);push(end);
    const result=new Uint8Array(offset);let pos=0;for(const x of chunks){result.set(x,pos);pos+=x.length;}return result;
  }
  function sniff(data){
    const a=data.slice(0,16),text=String.fromCharCode(...a);
    if(text.startsWith('%PDF-'))return {type:'application/pdf',ext:'pdf'};
    if(a[0]===0xff&&a[1]===0xd8&&a[2]===0xff)return {type:'image/jpeg',ext:'jpg'};
    if(a[0]===0x89&&text.slice(1,4)==='PNG')return {type:'image/png',ext:'png'};
    if(text.startsWith('RIFF')&&text.slice(8,12)==='WEBP')return {type:'image/webp',ext:'webp'};
    return null;
  }
  async function fetchAsset(url,allowed){
    const target=webUrl(url);if(!target)throw Error('Invalid asset URL');
    const response=await fetch(target,{mode:'cors',credentials:'omit',cache:'no-store'});
    if(!response.ok)throw Error('Asset unavailable ('+response.status+')');
    const advertised=Number(response.headers.get('content-length')||0);
    if(advertised>MAX_ASSET)throw Error('Asset larger than 10 MB');
    const data=new Uint8Array(await response.arrayBuffer());
    if(data.length>MAX_ASSET)throw Error('Asset larger than 10 MB');
    const type=sniff(data);if(!type||!allowed.includes(type.ext))throw Error('Asset must be a JPG, PNG, WebP or PDF.');
    return {...type,data};
  }
  function pdfFromJpeg(jpeg,width,height){
    const parts=[],offsets=[0];let pos=0;
    function push(data){const x=bytes(data);parts.push(x);pos+=x.length;}
    function obj(n,body){offsets[n]=pos;push(n+' 0 obj\n');if(Array.isArray(body))body.forEach(push);else push(body);push('\nendobj\n');}
    push('%PDF-1.4\n%');
    push(new Uint8Array([0xe2,0xe3,0xcf,0xd3,10]));
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    obj(4,['<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n',jpeg,'\nendstream']);
    const stream='q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n';
    obj(5,['<< /Length '+encoder.encode(stream).length+' >>\nstream\n',stream,'endstream']);
    const start=pos;push('xref\n0 6\n0000000000 65535 f \n');
    for(let i=1;i<=5;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n');
    const out=new Uint8Array(pos);let i=0;for(const p of parts){out.set(p,i);i+=p.length;}return out;
  }
  function splitLines(ctx,value,maxWidth,maxRows){
    const out=[],blocks=safe(value,2400).split(/\r?\n/);
    for(const block of blocks){
      const words=block.split(/\s+/).filter(Boolean);let line='';
      for(const word of words){
        const attempt=line?line+' '+word:word;
        if(ctx.measureText(attempt).width<=maxWidth){line=attempt;continue;}
        if(line){out.push(line);if(out.length>=maxRows)return out;line='';}
        if(ctx.measureText(word).width<=maxWidth){line=word;continue;}
        for(const ch of word){if(ctx.measureText(line+ch).width>maxWidth&&line){out.push(line);if(out.length>=maxRows)return out;line='';}line+=ch;}
      }
      if(line){out.push(line);if(out.length>=maxRows)return out;}
    }
    return out;
  }
  function pdfOneSheet(card,s,photoBitmap){
    const width=1224,height=1584,margin=78,canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('PDF image renderer is unavailable');
    ctx.fillStyle='#f7f7fb';ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#111a38';ctx.fillRect(0,0,width,335);
    ctx.fillStyle='#ab95ff';ctx.fillRect(0,0,12,335);
    const artist=safe(s.stage_name||card.full_name,120)||'Artist';
    ctx.font='bold 19px Arial, sans-serif';ctx.fillStyle='#d5ccff';ctx.fillText('SHOWTIME  /  OFFICIAL ARTIST ONE-SHEET',margin,68);
    const maxName=photoBitmap?760:1060;
    let size=68;while(size>35){ctx.font='bold '+size+'px Arial, sans-serif';if(ctx.measureText(artist).width<=maxName)break;size--;}
    ctx.fillStyle='#fff';ctx.fillText(artist,margin,153);
    ctx.font='26px Arial, sans-serif';ctx.fillStyle='#e8e4f9';
    const meta=[safe(s.genre,80),safe(s.location,120)].filter(Boolean).join('  •  ');
    splitLines(ctx,meta,photoBitmap?700:1050,2).forEach((v,i)=>ctx.fillText(v,margin,205+i*30));
    ctx.font='22px Arial, sans-serif';ctx.fillStyle='#c6d0ef';
    splitLines(ctx,s.epk_tagline||card.headline||card.title,photoBitmap?700:1050,2).forEach((v,i)=>ctx.fillText(v,margin,265+i*26));
    if(photoBitmap){
      const x=965,y=66,w=174,h=205;
      ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.clip();
      const ratio=Math.max(w/photoBitmap.width,h/photoBitmap.height);
      ctx.drawImage(photoBitmap,x+(w-photoBitmap.width*ratio)/2,y+(h-photoBitmap.height*ratio)/2,photoBitmap.width*ratio,photoBitmap.height*ratio);
      ctx.restore();
    }
    let y=398;
    function paragraph(label,value,rows=8,fontSize=23){
      if(!safe(value)||y>height-165)return;
      ctx.fillStyle='#6142ad';ctx.font='bold 17px Arial, sans-serif';ctx.fillText(label.toUpperCase(),margin,y);y+=39;
      ctx.font=fontSize+'px Arial, sans-serif';ctx.fillStyle='#263047';
      const lines=splitLines(ctx,value,width-margin*2,rows);
      lines.forEach(line=>{if(y<height-105){ctx.fillText(line,margin,y);y+=fontSize+10;}});
      y+=23;
    }
    paragraph('Artist biography',s.epk_bio||card.biography,12,22);
    paragraph('Career highlights',safe(s.epk_highlights,600).split(/\r?\n/).filter(Boolean).slice(0,4).map(v=>'• '+v).join('\n'),5,21);
    const featured=(Array.isArray(s.releases)?s.releases:[]).find(r=>r.featured)||(s.releases||[])[0];
    if(featured?.title)paragraph('Featured release',featured.title,2,23);
    paragraph('Booking requirements',s.epk_booking_requirements,5,21);
    const bookingEmail=address(s.epk_booking_email)||address(card.email);
    const pressEmail=address(s.epk_press_email)||address(card.email);
    const management=[safe(s.epk_management_name,140),address(s.epk_management_email)].filter(Boolean).join(' — ');
    const contact=[management?'Management: '+management:'',bookingEmail?'Booking: '+bookingEmail:'',pressEmail&&pressEmail!==bookingEmail?'Press: '+pressEmail:'',webUrl(s.booking_url)?'Booking link: '+s.booking_url:''].filter(Boolean).join('\n');
    paragraph('Contact & bookings',contact,5,20);
    ctx.fillStyle='#111a38';ctx.fillRect(0,height-72,width,72);
    ctx.font='18px Arial, sans-serif';ctx.fillStyle='#e7e2f7';
    ctx.fillText('Prepared from artist-provided details  •  Showtime by LIW Cards',margin,height-27);
    return new Promise((resolve,reject)=>canvas.toBlob(async blob=>{
      if(!blob)return reject(Error('Unable to create the one-sheet PDF'));
      try{resolve(pdfFromJpeg(new Uint8Array(await blob.arrayBuffer()),width,height));}catch(error){reject(error);}
    },'image/jpeg',0.88));
  }
  function sectionLines(heading,lines){const rows=lines.filter(Boolean);return rows.length?heading+'\n'+'='.repeat(heading.length)+'\n'+rows.join('\n')+'\n\n':'';}
  async function build(card,s,epkLink,onProgress){
    const selected=(Array.isArray(s.media_items)?s.media_items:[])
      .filter(m=>m&&m.visible!==false&&m.epk_include!==false&&safe(m.title)&&webUrl(m.url))
      .filter(m=>!Array.isArray(s.epk_media_ids)||s.epk_media_ids.includes(m.id)).slice(0,4);
    const files=[],omissions=[],links=[];
    const added=new Set();
    function add(name,data){if(added.has(name))return;added.add(name);files.push({name,data});}
    async function asset(url,path,allowed){
      if(!webUrl(url))return null;
      try{
        onProgress?.('Adding '+path+'…');
        const file=await fetchAsset(url,allowed);
        const destination=path+'.'+file.ext;add(destination,file.data);return file;
      }catch(error){omissions.push(path+': '+safe(error?.message,130));links.push(path+': '+webUrl(url));return null;}
    }
    const name=safe(s.stage_name||card.full_name,120)||'Artist';
    const slugName=slug(name);
    const booking=address(s.epk_booking_email)||address(card.email),press=address(s.epk_press_email)||address(card.email);
    const biography=safe(s.epk_bio||card.biography,1800);
    const highlights=safe(s.epk_highlights,600);
    const bookingLines=[s.epk_management_name?'Management: '+safe(s.epk_management_name,140):'',
      address(s.epk_management_email)?'Management email: '+address(s.epk_management_email):'',
      booking?'Booking email: '+booking:'',press?'Press email: '+press:'',
      webUrl(s.booking_url)?'Booking link: '+webUrl(s.booking_url):'',
      webUrl(card.website)?'Website: '+webUrl(card.website):''].filter(Boolean);
    if(biography)add('01-Biography/Artist-Biography.txt',name+'\n\n'+biography+'\n\n'+(highlights?sectionLines('Career highlights',highlights.split(/\r?\n/)):''));
    if(bookingLines.length)add('02-Booking/Booking-Contacts.txt',sectionLines(name+' - Booking & Press',bookingLines));
    if(safe(s.epk_booking_requirements,700))add('02-Booking/Booking-Requirements.txt',sectionLines('Booking requirements',[safe(s.epk_booking_requirements,700)]));
    if(safe(s.epk_rider_notes,700))add('03-Technical/Technical-Rider-Notes.txt',sectionLines('Technical rider - artist supplied',[safe(s.epk_rider_notes,700)]));
    const hasPlot=webUrl(s.epk_stage_plot_url),hasRider=webUrl(s.epk_rider_url);
    if(hasRider)await asset(hasRider,'03-Technical/Technical-Rider',['pdf','jpg','png','webp']);
    if(hasPlot)await asset(hasPlot,'03-Technical/Stage-Plot',['pdf','jpg','png','webp']);
    const portrait=webUrl(card.profile_image_url);
    let portraitBitmap=null;
    if(portrait){
      const photo=await asset(portrait,'04-Photos/Official-Portrait',['jpg','png','webp']);
      if(photo&&typeof createImageBitmap==='function')try{portraitBitmap=await createImageBitmap(new Blob([photo.data],{type:photo.type}));}catch(_){}
    }
    const seen=new Set(portrait?[portrait]:[]);
    let index=0;
    for(const m of selected.filter(x=>x.type==='photo')){
      if(seen.has(m.url))continue;seen.add(m.url);index++;
      await asset(m.url,'04-Photos/Press-'+String(index).padStart(2,'0')+'-'+slug(m.title),['jpg','png','webp']);
    }
    const mediaLines=selected.filter(m=>m.type!=='photo').map(m=>safe(m.type,20).toUpperCase()+' — '+safe(m.title,140)+'\n'+webUrl(m.url));
    if(mediaLines.length)add('05-Media/Press-and-Video-Links.txt',sectionLines('Selected press and media',mediaLines));
    const releases=(Array.isArray(s.releases)?s.releases:[]).filter(r=>safe(r.title));
    if(releases.length)add('05-Media/Music-and-Listen-Links.txt',sectionLines('Releases',releases.map(r=>safe(r.title,140)+(r.featured?' (featured)':'')+(webUrl(r.listen_url)?'\n'+webUrl(r.listen_url):''))));
    const shows=(Array.isArray(s.shows)?s.shows:[]).filter(r=>safe(r.date||r.venue||r.city));
    if(shows.length)add('05-Media/Shows-and-Tour-Dates.txt',sectionLines('Shows',shows.map(r=>[safe(r.date,40),safe(r.venue,140),safe(r.city,120),webUrl(r.ticket_url)].filter(Boolean).join(' | '))));
    onProgress?.('Creating one-sheet PDF…');
    try{add('00-Artist-One-Sheet.pdf',await pdfOneSheet(card,s,portraitBitmap));}
    finally{portraitBitmap?.close?.();}
    const summary=[
      name+' — PROMOTER PACKAGE','',
      'Generated from this artist’s Showtime EPK. Only artist-supplied content is included.',
      'Open 00-Artist-One-Sheet.pdf for a printable single-page introduction.',
      'Contents vary depending on what the artist has supplied.',
      '',
      'Live EPK: '+webUrl(epkLink),
      ...(!biography?['','Biography: not supplied.']:[]),
      ...(!bookingLines.length?['Booking contact: not supplied.']:[]),
      ...(!hasPlot?['Stage plot: not supplied.']:[]),
      ...(!hasRider&&!safe(s.epk_rider_notes)?['Technical rider: not supplied.']:[]),
      ...(!selected.some(x=>x.type==='photo')&&!portrait?['Official press photos: not supplied.']:[]),
      ...(omissions.length?['','Some linked assets could not be included (source blocked, unavailable or oversized):',...omissions]:[]),
      ...(links.length?['','Original links for unavailable assets:',...links]:[]),
      '','Prepared with LIW Cards. Verify all technical and booking details directly with the artist.'
    ];
    add('README-FIRST.txt',summary.join('\n')+'\n');
    onProgress?.('Preparing ZIP…');
    return {filename:slugName+'-Promoter-Package.zip',blob:new Blob([zip(files)],{type:'application/zip'}),count:files.length,omissions};
  }
  async function download(card,s,link,onProgress){
    const result=await build(card,s,link,onProgress);
    const url=URL.createObjectURL(result.blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=result.filename;anchor.style.display='none';
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    return result;
  }
  window.LIWPromoterPackage={build,download};
})();
