import {STORAGE_KEY,emptyState,normalizeState,affinities,rankTitles,castVote,undoVote,reasonFor} from './recommender.mjs';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:'#';}catch{return '#';}};
const fmt=d=>d?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z')):'Date unavailable';
const icons={spark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></svg>',heart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/></svg>',cross:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>'};
let catalog=[],dataset,state=emptyState(),filter={type:'all',provider:'all'},view='discover',spotlight=null,busy=false,storageAvailable=true,toastTimer;
let pointer=null;
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;notify('Browser storage is unavailable. Export your choices to keep them.');}}
function providerHTML(t){return (t.providers||[]).map(p=>`<a class="provider-link" href="${esc(safeURL(p.url))}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(t.title)} on ${esc(p.name)} (subscription; new tab)"><span class="provider-symbol">${esc(p.name==='Netflix'?'N':p.name==='Hulu'?'h':p.name==='Apple TV'?'tv':p.name[0])}</span>${esc(p.name)}<span class="provider-arrow" aria-hidden="true">↗</span></a>`).join('');}
function list(){const ranked=rankTitles(catalog,state,filter);const selected=ranked.find(t=>t.id===spotlight);return selected?[selected,...ranked.filter(t=>t.id!==spotlight)]:ranked;}
function titleMeta(t){return `<span>${esc(t.year)}</span><span>${t.type==='tv'?'Series':'Movie'}</span>${t.runtimeMinutes?`<span>${esc(t.runtimeMinutes)} min${t.type==='tv'?' / episode':''}</span>`:''}`;}
function artwork(t,cls=''){return `<img class="${cls}" src="${esc(t.image)}" alt="${esc(t.title)} promotional artwork" ${cls?'loading="lazy"':''}>`;}
function showBrokenImages(){ $$('img').forEach(img=>{img.addEventListener('error',()=>{img.style.opacity='0';img.alt='';if(img.parentElement.classList.contains('poster-panel')&&!img.parentElement.querySelector('.no-image-label')){const label=document.createElement('span');label.className='no-image-label';label.textContent=img.parentElement.dataset.title||'Next Up';img.parentElement.append(label);}}, {once:true});}); }
function render(){
  const saved=catalog.filter(t=>state.votes[t.id]==='yes');
  $('#saved-count').textContent=saved.length;
  $$('.nav-button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
  $('#discover-view').hidden=view!=='discover';$('#saved-view').hidden=view!=='saved';$('.toolbar').hidden=view!=='discover';
  $('#undo-button').disabled=!state.history.length||busy;
  if(view==='saved'){renderSaved(saved);showBrokenImages();return;}
  const queue=list(),t=queue[0],card=$('#current-card');
  card.classList.remove('exit-yes','exit-no');card.style.transform='';
  if(!t){
    card.classList.add('empty-state');card.removeAttribute('tabindex');
    const anyUnseen=catalog.some(x=>!state.votes[x.id]);
    card.innerHTML=`<div><span class="empty-icon" aria-hidden="true">${anyUnseen?'⌕':'✦'}</span><h2>${anyUnseen?'A little too specific.':'You’ve met the whole lineup.'}</h2><p>${anyUnseen?'No unseen picks match these filters. Try everything or another service.':`${saved.length?'Your saved picks are ready for movie night.':'Nothing clicked? You can revisit your choices.'}<br>This first edition has ${catalog.length} curated titles. It doesn’t fetch new titles automatically.`}</p><button class="small-button" id="empty-action">${anyUnseen?'Clear filters':saved.length?'See your list':'Revisit passed picks'}</button>${!anyUnseen&&saved.length?'<p><button class="inline-link" id="revisit-button">Revisit passed picks</button></p>':''}</div>`;
    $('#empty-action').onclick=()=>{if(anyUnseen)clearFilters();else if(saved.length)setView('saved');else revisit();};
    $('#revisit-button')?.addEventListener('click',revisit);
  }else{
    card.classList.remove('empty-state');card.setAttribute('tabindex','0');card.setAttribute('aria-label',`${t.title}. Left arrow to pass; right arrow to save.`);
    const evidence=t.socialEvidence[0],sourceDate=fmt(evidence.publishedDate);
    card.innerHTML=`<div class="swipe-label yes" aria-hidden="true">YES PLEASE</div><div class="swipe-label no" aria-hidden="true">NOT TONIGHT</div><div class="poster-panel ${t.artworkLayout==='landscape'?'landscape-art':''}" data-title="${esc(t.title)}">${artwork(t)}<div class="poster-label">${icons.spark} THE NEXT UP EDIT</div><div class="poster-bottom"><span>r/</span> Found in real conversations</div></div><div class="card-content"><p class="card-reason">${icons.spark}${esc(reasonFor(t,catalog,state))}</p><h2${t.title.length>25?' class="long-title"':''}>${esc(t.title)}</h2><p class="meta">${titleMeta(t)}</p><div class="genre-tags">${t.genres.map(g=>`<span>${esc(g==='Science-Fiction'?'Sci-fi':g)}</span>`).join('')}</div><p class="synopsis">${esc(t.synopsis)}</p><div class="viewer-evidence"><p class="evidence-label"><span class="reddit-dot" aria-hidden="true">r/</span> A VIEWER’S TAKE <span class="paraphrase">· PARAPHRASED</span></p><p>${esc(evidence.summary)}</p><a class="evidence-link" href="${esc(safeURL(evidence.url))}" target="_blank" rel="noopener noreferrer" aria-label="Read ${esc(evidence.author)} on Reddit${evidence.containsSpoilers?', contains spoilers':''}"><span>${esc(evidence.author)} · ${evidence.dateScope==='post'?'Thread ':''}${sourceDate}${evidence.containsSpoilers?' · Spoilers':''}</span><span aria-hidden="true">↗</span></a></div><div class="watch-links"><p class="watch-label">WHERE TO WATCH <span>· US</span></p><div class="providers">${providerHTML(t)}</div><p class="availability">Subscription required · Listings checked ${fmt(dataset.asOf)}<br>Availability can change. <button class="inline-link" data-title-info="${esc(t.id)}">Sources & details ↗</button></p></div><div class="choice-actions"><button class="choice-button no" data-vote="no" aria-label="Pass on ${esc(t.title)}">${icons.cross} Not tonight</button><button class="choice-button yes" data-vote="yes" aria-label="Save ${esc(t.title)}">${icons.heart} Yes, please</button></div></div>`;
    card.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>vote(b.dataset.vote));
    card.querySelector('[data-title-info]').onclick=()=>showTitleInfo(t.id);
  }
  renderTaste();$('#remaining-count').textContent=`${queue.length} left`;
  $('#upcoming-list').innerHTML=queue.slice(1,4).map(t=>`<button class="upcoming-item" data-peek="${esc(t.id)}" aria-label="Preview ${esc(t.title)}">${artwork(t,'upcoming-image')}<span><span class="upcoming-title">${esc(t.title)}</span><span class="upcoming-meta">${t.type==='tv'?'Series':'Movie'} · ${esc(t.providers[0]?.name||'Check availability')}</span></span><span class="upcoming-arrow" aria-hidden="true">↗</span></button>`).join('') || '<p class="queue-empty">That’s the mix for now. Your saved list is a good next stop.</p>';
  $$('[data-peek]').forEach(b=>b.onclick=()=>{spotlight=b.dataset.peek;render();$('#current-card').focus({preventScroll:true});});
  showBrokenImages();
}
function renderTaste(){
  const choices=Object.keys(state.votes).length,saved=Object.values(state.votes).filter(v=>v==='yes').length;
  const tastes=Object.entries(affinities(catalog,state.votes)).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,3);
  $('#taste-heading').innerHTML=saved?'Now we’re<br>getting your vibe.':choices?'Finding your kind<br>of good.':'A blank canvas.<br>A great night ahead.';
  $('#taste-description').textContent=saved?`${saved} saved. We’re favoring similar genres in the remaining picks.`:choices?'Your passes help us reshuffle. A yes tells us what to bring more of.':'Save a few things you like. We’ll bring more of that energy.';
  $('#taste-tags').innerHTML=tastes.map(([g])=>`<span>${esc(g==='Science-Fiction'?'Sci-fi':g)}</span>`).join('');
  $('.taste-meter').classList.toggle('learning',choices>0);
  $('.local-note').innerHTML=`<span class="tiny-dot"></span> ${storageAvailable?'Your choices stay in this browser':'Session only · storage unavailable'}`;
}
function renderSaved(saved){
  $('#saved-summary').textContent=`${saved.length} ${saved.length===1?'good possibility':'good possibilities'}. No more starting from scratch.`;
  $('#saved-grid').innerHTML=saved.length?saved.map(t=>`<article class="saved-card">${artwork(t)}<div class="saved-card-body"><h3>${esc(t.title)}</h3><p class="meta">${titleMeta(t)}</p><div class="providers">${providerHTML(t)}</div><button class="inline-link" data-title-info="${esc(t.id)}">Viewer take & sources ↗</button><br><button class="text-button" data-remove="${esc(t.id)}">Remove from list</button></div></article>`).join(''):'<div class="empty-state"><span class="empty-icon" aria-hidden="true">♡</span><h2>Your next favorite is out there.</h2><p>Tap “Yes, please” on a pick and it will be waiting here.</p><button class="small-button" id="back-discover">Find something good</button></div>';
  $('#back-discover')?.addEventListener('click',()=>setView('discover'));
  $$('[data-title-info]').forEach(b=>b.onclick=()=>showTitleInfo(b.dataset.titleInfo));
  $$('[data-remove]').forEach(b=>b.onclick=()=>{const id=b.dataset.remove;state.history.push({id,vote:'clear',previous:state.votes[id]});delete state.votes[id];saveState();render();($('#saved-grid [data-remove]')||$('#saved-heading')).focus({preventScroll:true});notify('Removed from your list. Your taste is updated.');});
}
function setView(next){view=next;location.hash=next;render();}
function clearFilters(){filter={type:'all',provider:'all'};spotlight=null;$('#provider-filter').value='all';$$('[data-type]').forEach(b=>{b.classList.toggle('active',b.dataset.type==='all');b.setAttribute('aria-pressed',b.dataset.type==='all');});render();}
function revisit(){for(const[id,vote]of Object.entries(state.votes))if(vote==='no')delete state.votes[id];state.history=[];spotlight=null;saveState();render();notify('Passed picks are back in the mix.');}
async function vote(value){
  if(busy||view!=='discover'||$('#info-dialog').open)return;
  const t=list()[0];if(!t)return;busy=true;
  $$('#current-card button').forEach(b=>b.disabled=true);$('#undo-button').disabled=true;
  $('#current-card').classList.add(value==='yes'?'exit-yes':'exit-no');
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(r=>setTimeout(r,180));
  state=castVote(state,t.id,value);spotlight=null;saveState();busy=false;render();if(list().length)$('#current-card').focus({preventScroll:true});else $('#empty-action')?.focus({preventScroll:true});notify(value==='yes'?`${t.title} is on your list.`:'Not tonight. Let’s try a different vibe.');
}
function generalInfo(){
  if(!dataset){notify('The lineup is still loading. Please try again in a moment.');return;}
  $('#dialog-heading').textContent='Good picks. No black box.';
  $('#info-content').innerHTML=`<h3>Real conversations, carefully labeled</h3><p>This first edition contains ${catalog.length} hand-curated titles and ${catalog.reduce((n,t)=>n+t.socialEvidence.length,0)} public Reddit discussion links. Viewer takes are original paraphrases, not quotes, ratings, consensus, or verified identities. Opinions may be biased. Each title shows the discussion’s date and links to its source.</p><p><strong>Research snapshot: ${fmt(dataset.asOf)}.</strong> Some discussions are older. This is not a live trending feed and does not refresh itself.</p><h3>What about TikTok?</h3><p>Zero TikTok posts are included. We could not verify public videos through the available access, so we haven’t invented testimonials or substituted promotional material.</p><h3>Your swipes actually change the lineup</h3><p>“Yes, please” saves a title and raises similar genres. “Not tonight” lowers those genres. Remaining titles are re-ranked locally after each choice. This simple preference model does not use AI, streaming watch history, or linked accounts.</p><h3>For two people, on this browser</h3><p>You share one taste profile on this browser. Choices are stored locally, not sent to us. There is no sign-in, shared server, or automatic device sync. Use export/import to move the same choices to another device. Clearing browser data also clears your list.</p><h3>Where to watch</h3><p>Links go to official US subscription-service listings, checked ${fmt(dataset.asOf)}. We don’t know which services you subscribe to. Region, plan, and availability can change; a listing is not a playback guarantee.</p><h3>Credits & privacy</h3><p>Series metadata is adapted from <a href="https://www.tvmaze.com/api" target="_blank" rel="noopener noreferrer">TVMaze</a> under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Artwork belongs to its respective rights holders. Each title links to its image and metadata source. There are no analytics or tracking scripts. Opening Reddit or streaming links sends you to those services and their privacy policies.</p>`;
  $('.dialog-actions').hidden=false;
  $('#storage-status').textContent=storageAvailable?'Preferences stay on this device. Exported files contain only title IDs and yes/no choices.':'Browser storage is unavailable. Choices last only this session unless you export them.';
  if(!$('#info-dialog').open)$('#info-dialog').showModal();
}
function showTitleInfo(id){
  const t=catalog.find(x=>x.id===id);if(!t)return;
  $('#dialog-heading').textContent=t.title;
  $('#info-content').innerHTML=`<p>${esc(t.synopsis)}</p><h3>What viewers said, in our words</h3>${t.socialEvidence.map(e=>`<section class="detail-source"><p>${esc(e.summary)}</p><p class="source-caution">${esc(e.caveat||'Individual opinion, not a consensus.')}</p><a href="${esc(safeURL(e.url))}" target="_blank" rel="noopener noreferrer">${esc(e.author)} · ${esc(e.community)} ↗</a><p class="source-dates">${e.dateScope==='post'?'Thread date':'Published'}: ${fmt(e.publishedDate)} · Checked: ${fmt(e.checkedAt)}${e.containsSpoilers?'<br><strong>Contains spoilers.</strong>':''}</p></section>`).join('')}<h3>US streaming listings</h3><div class="providers">${providerHTML(t)}</div><p>Subscription access. Checked ${fmt(dataset.asOf)}. Availability and plans can change. We haven’t tested playback or connected your accounts.</p><h3>Metadata & artwork</h3><p><a href="${esc(safeURL(t.metadataSource))}" target="_blank" rel="noopener noreferrer">Metadata source ↗</a> · <a href="${esc(safeURL(t.imageSource))}" target="_blank" rel="noopener noreferrer">Artwork source ↗</a>${t.metadataSource.includes('tvmaze')?' · TVMaze data: CC BY-SA 4.0':''}.</p>`;
  $('.dialog-actions').hidden=true;$('#storage-status').textContent='Curated research, not a live feed. Provider marketing was not used as viewer evidence.';
  if(!$('#info-dialog').open)$('#info-dialog').showModal();
}
$('#about-button').onclick=generalInfo;$('#source-button').onclick=generalInfo;$('#data-button').onclick=generalInfo;
$('[data-close-dialog]').onclick=()=>$('#info-dialog').close();
$('#info-dialog').addEventListener('click',e=>{if(e.target===$('#info-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$$('[data-view]').forEach(b=>b.onclick=()=>{if(!busy)setView(b.dataset.view);});
$$('[data-type]').forEach(b=>b.onclick=()=>{if(busy)return;filter.type=b.dataset.type;spotlight=null;$$('[data-type]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b);});render();});
$('#provider-filter').onchange=e=>{filter.provider=e.target.value;spotlight=null;render();};
$('#undo-button').onclick=()=>{if(busy)return;const last=state.history.at(-1);state=undoVote(state);spotlight=last?.id||null;saveState();render();notify('Last choice undone.');};
addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||$('#info-dialog').open||view!=='discover'||['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(document.activeElement.tagName))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();vote(e.key==='ArrowRight'?'yes':'no');}});
$('#current-card').addEventListener('pointerdown',e=>{if(busy||e.button!==0||e.target.closest('button,a,select')||!list()[0])return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};});
$('#current-card').addEventListener('pointermove',e=>{if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dy)>70&&Math.abs(dy)>Math.abs(dx)){cancelSwipe();return;}if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){const offset=Math.max(-100,Math.min(100,dx));e.currentTarget.style.transform=`translateX(${offset*.25}px) rotate(${offset*.025}deg)`;const yes=$('.swipe-label.yes'),no=$('.swipe-label.no');if(yes)yes.style.opacity=dx>0?Math.min(dx/100,.95):0;if(no)no.style.opacity=dx<0?Math.min(-dx/100,.95):0;}});
function cancelSwipe(){pointer=null;const card=$('#current-card');card.style.transform='';$$('.swipe-label').forEach(l=>l.style.opacity=0);}
addEventListener('pointerup',e=>{if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;cancelSwipe();if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*1.4)vote(dx>0?'yes':'no');});
addEventListener('pointercancel',cancelSwipe);addEventListener('blur',cancelSwipe);
$('#export-button').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,votes:state.votes,history:[]},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='next-up-choices.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Your choices are ready to download.');};
$('#import-button').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>64000)throw Error('Choose a Next Up export smaller than 64 KB.');const value=JSON.parse(await file.text());if(value.version!==1||!value.votes||typeof value.votes!=='object'||Array.isArray(value.votes))throw Error('This does not look like a Next Up choices file.');if(!confirm('Replace this browser’s choices with the imported choices?'))return;state=normalizeState(value,catalog);state.history=[];saveState();render();notify('Choices imported. Your lineup is updated.');}catch(err){notify(err.message||'Could not import that file.');}finally{e.target.value='';}};
$('#reset-button').onclick=()=>{if(!confirm('Clear all saved and passed titles in this browser? This cannot be undone.'))return;state=emptyState();spotlight=null;saveState();render();notify('Fresh start. Your choices are cleared.');};
addEventListener('hashchange',()=>{view=location.hash==='#saved'?'saved':'discover';render();});
addEventListener('storage',e=>{if(e.key!==STORAGE_KEY)return;try{state=normalizeState(JSON.parse(e.newValue),catalog);spotlight=null;render();}catch{}});
async function init(){try{const response=await fetch('./catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('Catalog unavailable');dataset=await response.json();catalog=dataset.titles;if(!Array.isArray(catalog)||!catalog.length)throw Error('Empty catalog');try{state=normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)),catalog);}catch{state=emptyState();storageAvailable=false;}const providers=[...new Set(catalog.flatMap(t=>t.providers.map(p=>p.name)))].sort();$('#provider-filter').innerHTML='<option value="all">All services</option>'+providers.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('');$('#catalog-date').textContent=`Curated ${fmt(dataset.asOf)} · Not a live feed`;$('#load-state').hidden=true;view=location.hash==='#saved'?'saved':'discover';render();}catch(err){$('#load-state').innerHTML='<span class="empty-icon" aria-hidden="true">☁</span><h2>The lineup couldn’t load.</h2><p>Check your connection, then try again. Your saved choices are still in this browser.</p><button class="small-button" id="retry-load">Try again</button>';$('#retry-load').onclick=init;}}
init();
