(function(){
  'use strict';

  const T = {
    poem1: 'כולנו רקמה אנושית אחת חיה',
    poem2: 'ואם אחד מאיתנו הולך מעמנו',
    poem3: 'משהו מת בנו - ומשהו, נשאר איתו',
    next: 'הבא', prev: 'קודם', pause: 'עצירה', play: 'המשך', search: 'חיפוש שם...',
    page: 'דף זיכרון', zl: 'ז״ל', noResults: 'לא נמצאו תוצאות', loading: 'טוען אנשים...',
    noPeople: 'לא נטענו אנשים. בדקי שהתיקייה assets/people-original קיימת או שהקובץ people_assets_manifest.js נוצר מחדש.',
    displaying: 'מוצגים', from: 'מתוך'
  };

  const BATCH_SIZE = 6;
  const ROTATE_MS = 7600;
  const FADE_MS = 650;
  const preferredFirst = [
    'אופיר ליבשטיין','עומר צדיקביץ','אילן פיורנטינו','שחר אביאני','מירה שטהל','נדב עמיקם'
  ];
  const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
  const TEXT_PRIORITY = ['profile_text.txt','summary.txt','person_summary.txt','all_text_profile_and_inner_pages.txt'];
  const PEOPLE_ROOTS = ['assets/people-original','assets/people','assets/people_original'];

  const $ = (sel) => document.querySelector(sel);
  const stage = $('#memoryStage');
  const countLine = $('#countLine');
  const searchInput = $('#searchInput');
  const nextBtn = $('#nextBtn');
  const prevBtn = $('#prevBtn');
  const pauseBtn = $('#pauseBtn');
  const modal = $('#personModal');
  const modalCard = modal ? modal.querySelector('.modal-card') : null;
  let allPeople = [];
  let filteredPeople = [];
  let batches = [];
  let batchIndex = 0;
  let timer = null;
  let paused = false;
  let lastFocus = null;

  function setText(id, value){ const el = document.getElementById(id); if(el) el.textContent = value; }
  setText('poem1', T.poem1); setText('poem2', T.poem2); setText('poem3', T.poem3);
  if(nextBtn) nextBtn.textContent = T.next;
  if(prevBtn) prevBtn.textContent = T.prev;
  if(pauseBtn) pauseBtn.textContent = T.pause;
  if(searchInput) searchInput.placeholder = T.search;

  function text(v){ return v == null ? '' : String(v).trim(); }
  function esc(v){ return text(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function cleanName(name){
    return text(name).replace(/^\d+[_\-\s]*/,'').replace(/_/g,' ')
      .replace(/\s*ז[\"״'׳`]{0,2}\s*ל\s*$/,'')
      .replace(/\s+/g,' ').trim();
  }
  function normalizeForSearch(v){
    return cleanName(v).toLowerCase().replace(/[\u0591-\u05C7]/g,'').replace(/["'״׳`]/g,'').replace(/[\-–—_.,:;()\[\]{}]/g,' ').replace(/\s+/g,' ').trim();
  }
  function decodePathSegment(v){ try { return decodeURIComponent(v); } catch(e){ return v; } }
  function encodePathForUrl(path){
    return path.split('/').filter(Boolean).map(seg => encodeURIComponent(decodePathSegment(seg))).join('/');
  }
  function rawUrl(owner, repo, branch, path){
    return 'https://raw.githubusercontent.com/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/' + encodeURIComponent(branch) + '/' + encodePathForUrl(path);
  }

  const BOILERPLATE_PATTERNS = [
    /^עבור לתפריט/, /^עבור למפת האתר/, /^אזרחים חללי פעולות איבה/, /^חללי ["״]?חרבות ברזל["״]?/,
    /^האנדרטה לזכרם בהר הרצל$/, /^דבר שר/, /^דבר מנכ/, /^מידע שימושי/, /^אוגדן זכויות/,
    /^על אודות האתר$/, /^דף חלל$/, /^אלבום זיכרון$/, /^תמונות המצבה$/, /^בניית אתרים:?$/,
    /^פיתוח מאגרי מידע$/, /^שיתוף בפייסבוק/, /^הדפסת תווית/, /^אנו עושים כל מאמץ/, /^אם ברצונכם להעיר/,
    /^פרטים אישיים והנצחה:?$/, /^קורות חיים$/
  ];
  function cleanProfileText(s){
    const lines = [];
    const seen = new Set();
    text(s).replace(/\r/g,'').split('\n').forEach(raw => {
      const line = raw.replace(/\s+/g,' ').trim();
      if(!line) return;
      if(BOILERPLATE_PATTERNS.some(rx => rx.test(line))) return;
      const key = line.replace(/[\s"'״׳`.,:;()\[\]{}_-]+/g,'');
      if(key.length < 120 && seen.has(key)) return;
      if(key.length < 120) seen.add(key);
      lines.push(line);
    });
    return lines.join('\n').trim();
  }
  function inferNameFromText(profileText){
    const cleaned = cleanProfileText(profileText);
    const lines = cleaned.split('\n').slice(0,25);
    for(const line of lines){
      if(/ז[\"״'׳`]{0,2}\s*ל/.test(line) && line.length <= 90) return cleanName(line);
    }
    return '';
  }
  function inferCommunity(profileText){
    const s = profileText || '';
    const patterns = [/התגורר(?:ה)?\s+ב([^\n,.]+)/, /מקום אירוע:\s*([^\n,.]+)/, /מקום מגורים:\s*([^\n,.]+)/];
    for(const rx of patterns){ const m = s.match(rx); if(m) return m[1].replace(/\s+/g,' ').trim(); }
    return '';
  }
  function inferAge(profileText){
    const m = (profileText || '').match(/(?:בן|בת)\s+(\d{1,3})\s+במות/);
    return m ? (m[1] + ' במותו/ה') : '';
  }
  function firstImage(p){ return (Array.isArray(p.photos) && p.photos[0]) || (Array.isArray(p.images) && p.images[0]) || p.photo || p.image || ''; }
  function getStory(p){ return cleanProfileText(p.profileText || p.storySummaryClean || p.storySummary || p.summary_he || p.summary || p.description || p.bio || p.story || p.content || ''); }

  function normalizePerson(raw, i){
    const story = getStory(raw);
    const name = cleanName(raw.name || raw.fullName || raw.title || inferNameFromText(story) || raw.folder || ('person ' + (i+1)));
    const photos = Array.isArray(raw.photos) ? raw.photos.filter(Boolean) : (firstImage(raw) ? [firstImage(raw)] : []);
    const community = text(raw.community || raw.place || raw.residence || raw.location || raw.eventPlace || inferCommunity(story));
    const age = text(raw.age || raw.ageText || inferAge(story));
    return {
      raw, name, id: raw.id || raw.folder || ('p-' + i), folder: raw.folder || '',
      photo: photos[0] || '', photos,
      community, age,
      role: text(raw.role || raw.job || raw.subtitle || raw.guardRole),
      story,
      familyGroupId: text(raw.familyGroupId || raw.family_group_id || raw.familyGroupTitle),
      search: normalizeForSearch([name, community, age, raw.folder, story].join(' '))
    };
  }

  function peopleFromManifest(){
    const data = Array.isArray(window.PEOPLE_ASSETS_MANIFEST) ? window.PEOPLE_ASSETS_MANIFEST : [];
    if(data.length) return data.map(normalizePerson).filter(p => p.name);
    const legacy = [window.MEMORIAL_PEOPLE, window.FALLEN_PEOPLE, window.PEOPLE, window.people, window.peopleData, window.fallenPeople].find(Array.isArray);
    return Array.isArray(legacy) ? legacy.map(normalizePerson).filter(p => p.name) : [];
  }

  function getGitHubContext(){
    const host = location.hostname;
    if(!host.endsWith('.github.io')) return null;
    const owner = host.split('.')[0];
    const parts = location.pathname.split('/').filter(Boolean);
    if(!owner || !parts.length) return null;
    const repo = parts[0];
    const baseDir = parts.slice(1).join('/').replace(/\/$/,'');
    return {owner, repo, baseDir};
  }
  async function fetchJson(url){
    const res = await fetch(url, {headers:{'Accept':'application/vnd.github+json'}});
    if(!res.ok) throw new Error(String(res.status));
    return await res.json();
  }
  async function loadGitHubTree(ctx){
    const branches = ['main','master'];
    let lastErr = null;
    for(const branch of branches){
      try{
        const url = 'https://api.github.com/repos/' + encodeURIComponent(ctx.owner) + '/' + encodeURIComponent(ctx.repo) + '/git/trees/' + encodeURIComponent(branch) + '?recursive=1';
        const json = await fetchJson(url);
        if(json && Array.isArray(json.tree)) return {branch, tree: json.tree};
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('GitHub tree not found');
  }
  function groupFromTree(ctx, branch, tree){
    const roots = PEOPLE_ROOTS.map(root => (ctx.baseDir ? ctx.baseDir + '/' + root : root).replace(/^\/+|\/+$/g,''));
    let selectedRoot = '';
    let rootFiles = [];
    for(const root of roots){
      const prefix = root + '/';
      const files = tree.filter(x => x.type === 'blob' && x.path && x.path.startsWith(prefix));
      if(files.length){ selectedRoot = root; rootFiles = files; break; }
    }
    if(!selectedRoot) return [];
    const groups = new Map();
    const prefix = selectedRoot + '/';
    rootFiles.forEach(f => {
      const rel = f.path.slice(prefix.length);
      const pieces = rel.split('/');
      if(pieces.length < 2) return;
      const folder = pieces[0];
      if(!folder || ['images','old','backup','backups','tmp','temp'].includes(folder.toLowerCase())) return;
      if(!groups.has(folder)) groups.set(folder, {folder, files: []});
      groups.get(folder).files.push({path:f.path, rel:pieces.slice(1).join('/')});
    });
    return Array.from(groups.values()).map(g => {
      const txt = TEXT_PRIORITY.map(t => g.files.find(f => f.rel.toLowerCase() === t.toLowerCase())).find(Boolean)
        || g.files.find(f => /\.txt$/i.test(f.rel) && !f.rel.includes('/'));
      const photos = g.files.filter(f => /^photos\//i.test(f.rel) && IMAGE_RE.test(f.rel)).map(f => rawUrl(ctx.owner, ctx.repo, branch, f.path));
      return {folder:g.folder, textPath: txt ? txt.path : '', photos};
    }).filter(x => x.textPath || x.photos.length);
  }
  async function loadPeopleFromGitHub(){
    const ctx = getGitHubContext();
    if(!ctx) return [];
    const {branch, tree} = await loadGitHubTree(ctx);
    const groups = groupFromTree(ctx, branch, tree);
    const people = [];
    for(const g of groups){
      let profileText = '';
      if(g.textPath){
        try{
          const res = await fetch(rawUrl(ctx.owner, ctx.repo, branch, g.textPath));
          if(res.ok) profileText = await res.text();
        }catch(e){}
      }
      people.push(normalizePerson({folder:g.folder, name: inferNameFromText(profileText) || cleanName(g.folder), profileText, photos:g.photos}, people.length));
    }
    return people.filter(p => p.name);
  }

  function orderPeople(list){
    const byPreferred = new Map(preferredFirst.map((n,i)=>[normalizeForSearch(n), i]));
    return list.slice().sort((a,b)=>{
      const ai = byPreferred.has(normalizeForSearch(a.name)) ? byPreferred.get(normalizeForSearch(a.name)) : 9999;
      const bi = byPreferred.has(normalizeForSearch(b.name)) ? byPreferred.get(normalizeForSearch(b.name)) : 9999;
      if(ai !== bi) return ai - bi;
      return String(a.folder || a.name).localeCompare(String(b.folder || b.name), 'he');
    });
  }
  function buildBatches(list){
    const ordered = orderPeople(list);
    const used = new Set(); const units = [];
    ordered.forEach(p=>{
      if(used.has(p.id)) return;
      if(p.familyGroupId){
        const members = ordered.filter(x => x.familyGroupId && x.familyGroupId === p.familyGroupId && !used.has(x.id));
        members.forEach(x=>used.add(x.id));
        if(members.length && members.length <= BATCH_SIZE) units.push(members); else members.forEach(x=>units.push([x]));
      } else { used.add(p.id); units.push([p]); }
    });
    const out = []; let current = [];
    units.forEach(unit=>{
      if(current.length && current.length + unit.length > BATCH_SIZE){ out.push(current); current = []; }
      current = current.concat(unit);
      if(current.length === BATCH_SIZE){ out.push(current); current = []; }
    });
    if(current.length) out.push(current);
    return out;
  }
  function cardHTML(p){
    const meta = [p.community, p.age ? p.age : ''].filter(Boolean).map(x=>'<span>'+esc(x)+'</span>').join('');
    const img = p.photo ? '<img src="'+esc(p.photo)+'" alt="'+esc(p.name)+'" loading="eager" onerror="this.closest(\'.memory-photo\').classList.add(\'no-photo\');this.remove();">' : '';
    return '<button type="button" class="memory-card" data-id="'+esc(p.id)+'">' +
      '<span class="memory-photo '+(p.photo?'':'no-photo')+'">'+img+'</span>' +
      '<span class="memory-body"><strong class="memory-name">'+esc(p.name)+' <span class="memory-zl">'+T.zl+'</span></strong>' +
      '<span class="memory-meta">'+meta+'</span>' +
      (p.role ? '<span class="memory-role">'+esc(p.role)+'</span>' : '') + '</span></button>';
  }
  function renderBatch(index, animate){
    if(!stage) return;
    if(!batches.length){ stage.innerHTML = '<div class="empty-state">'+T.noResults+'</div>'; countLine.textContent=''; return; }
    batchIndex = (index + batches.length) % batches.length;
    const doRender = () => {
      const batch = batches[batchIndex];
      stage.innerHTML = batch.map(cardHTML).join('');
      stage.querySelectorAll('.memory-card').forEach((card,i)=>{
        card.addEventListener('click',()=>openModal(card.dataset.id));
        setTimeout(()=>card.classList.add('is-visible'), 90 + i*95);
      });
      countLine.textContent = T.displaying + ' ' + batch.length + ' ' + T.from + ' ' + filteredPeople.length;
    };
    if(animate && stage.children.length){ stage.querySelectorAll('.memory-card').forEach(card=>card.classList.remove('is-visible')); setTimeout(doRender, FADE_MS); }
    else doRender();
  }
  function restartTimer(){
    clearInterval(timer);
    if(paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(()=>renderBatch(batchIndex+1,true), ROTATE_MS);
  }
  function applyFilter(){
    const q = normalizeForSearch(searchInput ? searchInput.value : '');
    filteredPeople = q ? allPeople.filter(p=>p.search.includes(q)) : allPeople.slice();
    batches = buildBatches(filteredPeople); batchIndex = 0; renderBatch(0,false); restartTimer();
  }
  function setPaused(value){
    paused = value;
    if(pauseBtn){ pauseBtn.setAttribute('aria-pressed', String(paused)); pauseBtn.textContent = paused ? T.play : T.pause; }
    restartTimer();
  }
  function renderModalImage(p, src){
    const fig = $('#modalImage');
    if(!fig) return;
    fig.innerHTML = src ? '<img src="'+esc(src)+'" alt="'+esc(p.name)+'">' : '';
  }
  function openModal(id){
    const p = filteredPeople.find(x=>String(x.id)===String(id)) || allPeople.find(x=>String(x.id)===String(id));
    if(!p || !modal) return;
    lastFocus = document.activeElement;
    $('#modalKicker').textContent = T.page;
    $('#modalName').textContent = p.name + ' ' + T.zl;
    $('#modalMeta').textContent = [p.community, p.age ? p.age : '', p.role].filter(Boolean).join(' | ');
    $('#modalStory').textContent = p.story || '';
    renderModalImage(p, p.photo);
    const thumbs = $('#modalThumbs');
    if(thumbs){
      thumbs.innerHTML = (p.photos || []).slice(0,12).map((src,i)=>'<button type="button" data-src="'+esc(src)+'" aria-label="תמונה '+(i+1)+'"><img src="'+esc(src)+'" alt=""></button>').join('');
      thumbs.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => renderModalImage(p, btn.dataset.src)));
    }
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
    if(modalCard) modalCard.focus();
  }
  function closeModal(){
    if(!modal) return;
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open');
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function showMessage(msg){ if(stage) stage.innerHTML = '<div class="empty-state">'+esc(msg)+'</div>'; if(countLine) countLine.textContent=''; }
  function initPeople(list){
    allPeople = list || [];
    filteredPeople = allPeople.slice(); batches = buildBatches(filteredPeople);
    if(!allPeople.length) showMessage(T.noPeople); else { renderBatch(0,false); restartTimer(); }
  }
  async function boot(){
    let people = peopleFromManifest();
    if(!people.length){
      showMessage(T.loading);
      try { people = await loadPeopleFromGitHub(); } catch(e) { people = []; }
    }
    initPeople(people);
  }

  nextBtn && nextBtn.addEventListener('click',()=>{renderBatch(batchIndex+1,true); restartTimer();});
  prevBtn && prevBtn.addEventListener('click',()=>{renderBatch(batchIndex-1,true); restartTimer();});
  pauseBtn && pauseBtn.addEventListener('click',()=>setPaused(!paused));
  searchInput && searchInput.addEventListener('input', applyFilter);
  modal && modal.addEventListener('click', e=>{ if(e.target.matches('[data-close-modal]')) closeModal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
  boot();
})();
