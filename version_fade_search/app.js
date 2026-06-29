(function(){
  'use strict';

  const T = {
    poem1: 'כולנו רקמה אנושית אחת חיה',
    poem2: 'ואם אחד מאיתנו הולך מעמנו',
    poem3: 'משהו מת בנו - ומשהו, נשאר איתו',
    next: 'הבא',
    prev: 'קודם',
    pause: 'עצירה',
    play: 'המשך',
    search: 'חיפוש שם...',
    page: 'דף זיכרון',
    gallery: 'גלריית תמונות',
    personal: 'פרטים אישיים והנצחה',
    biography: 'קורות חיים',
    zl: 'ז״ל',
    noResults: 'לא נמצאו תוצאות',
    displaying: 'מוצגים',
    from: 'מתוך',
    noText: 'לא נמצא קובץ profile_text.txt עבור אדם זה.',
    noPhotos: 'לא נמצאו תמונות בתיקיית photos.'
  };

  const BATCH_SIZE = 6;
  const ROTATE_MS = 7600;
  const FADE_MS = 650;
  const ASSET_MANIFEST = Array.isArray(window.PEOPLE_ASSETS_MANIFEST) ? window.PEOPLE_ASSETS_MANIFEST : [];

  const preferredFirst = [
    'אופיר ליבשטיין',
    'עומר צדיקביץ',
    'אילן פיורנטינו',
    'שחר אביאני',
    'מירה שטהל',
    'נדב עמיקם'
  ];

  const $ = (sel, root=document) => root.querySelector(sel);
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
  function cleanName(name){
    return text(name)
      .replace(/\s*ז[״"'׳`]{0,2}\s*ל\s*$/g,'')
      .replace(/\s+ז[״"'׳`]{0,2}\s*ל\s*$/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }
  function normalizeForSearch(v){
    return cleanName(v)
      .toLowerCase()
      .replace(/[\u0591-\u05C7]/g,'')
      .replace(/["'״׳`]/g,'')
      .replace(/[\u200e\u200f]/g,'')
      .replace(/[_\-–—.,;:()\[\]{}]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function tokens(v){
    return normalizeForSearch(v).split(/\s+/).filter(x => x && x !== 'זל' && x.length > 1);
  }
  function esc(v){ return text(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function nl2p(v){
    return cleanDisplayText(v).split(/\n{2,}/).map(p => '<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('');
  }
  function unique(arr){ return Array.from(new Set(arr.map(text).filter(Boolean))); }

  function firstImageFromRaw(p){
    const candidates = [p.photo,p.image,p.img,p.src,p.portrait,p.mainImage,p.thumbnail,p.imageUrl,p.photoUrl];
    if(Array.isArray(p.images) && p.images.length){
      const im = p.images.find(x => typeof x === 'string') || p.images.find(x => x && (x.src || x.url || x.path));
      if(typeof im === 'string') candidates.push(im); else if(im) candidates.push(im.src || im.url || im.path);
    }
    return text(candidates.find(Boolean));
  }
  function getStory(p){ return text(p.storySummaryClean || p.storySummary || p.summary_he || p.summary || p.description || p.bio || p.story || p.content || p.role); }

  function assetNameFromFolder(folder){
    return cleanName(text(folder).split('/').pop()
      .replace(/^\d+[_\-\s]*/,'')
      .replace(/_/g,' ')
      .replace(/\s+/g,' '));
  }
  function bestAssetFor(raw, name, photo){
    if(!ASSET_MANIFEST.length) return null;
    const explicitFolder = text(raw.assetsFolder || raw.assetFolder || raw.peopleFolder || raw.folder || raw.directory || raw.personFolder);
    if(explicitFolder){
      const f = explicitFolder.replace(/^assets\/people\//,'').replace(/[\\/]+$/,'');
      const exact = ASSET_MANIFEST.find(a => text(a.folder) === f || text(a.folder).endsWith('/'+f) || text(a.path) === explicitFolder);
      if(exact) return exact;
    }
    if(photo && photo.includes('assets/people/')){
      const m = photo.match(/assets\/people\/([^/]+)/);
      if(m){
        const exact = ASSET_MANIFEST.find(a => text(a.folder) === decodeURIComponent(m[1]) || encodeURIComponent(text(a.folder)) === m[1]);
        if(exact) return exact;
      }
    }
    const personNorm = normalizeForSearch(name);
    const personTokens = tokens(name);
    let best = null;
    ASSET_MANIFEST.forEach(a => {
      const names = unique([a.name, a.displayName, assetNameFromFolder(a.folder), ...(Array.isArray(a.names) ? a.names : [])]);
      let localBest = 0;
      names.forEach(n => {
        const nn = normalizeForSearch(n);
        if(!nn) return;
        if(nn === personNorm) localBest = Math.max(localBest, 100);
        else if(nn.includes(personNorm) || personNorm.includes(nn)) localBest = Math.max(localBest, 90);
        else {
          const at = new Set(tokens(nn));
          const hit = personTokens.filter(t => at.has(t)).length;
          const denom = Math.max(1, Math.max(personTokens.length, at.size));
          const score = Math.round((hit / denom) * 80);
          if(hit >= 2) localBest = Math.max(localBest, score);
        }
      });
      if(!best || localBest > best.score) best = {score: localBest, asset: a};
    });
    return best && best.score >= 45 ? best.asset : null;
  }

  function normalizePerson(raw, i){
    const name = cleanName(raw.name || raw.fullName || raw.title || raw.excelDisplayName || raw.updatedExcelName || ('person ' + (i+1)));
    const rawPhoto = firstImageFromRaw(raw);
    const asset = bestAssetFor(raw, name, rawPhoto);
    const photos = unique([...(asset && Array.isArray(asset.photos) ? asset.photos : []), ...(Array.isArray(raw.images) ? raw.images.map(x => typeof x === 'string' ? x : (x && (x.src || x.url || x.path))) : []), rawPhoto]);
    const mainPhoto = photos[0] || '';
    const assetText = text(asset && (asset.profileText || asset.text || asset.summaryText));
    const story = assetText || getStory(raw);
    const community = text(raw.community || raw.place || raw.residence || raw.location || raw.eventPlace || inferResidenceFromText(story));
    return {
      raw, name, id: raw.id || raw.slug || (asset && asset.folder) || ('p-' + i),
      photo: mainPhoto,
      photos,
      asset,
      community,
      age: text(raw.age || raw.ageText || inferAgeFromText(story)),
      role: text(raw.role || raw.job || raw.subtitle || raw.guardRole),
      story,
      familyGroupId: text(raw.familyGroupId || raw.family_group_id || raw.familyGroupTitle),
      search: normalizeForSearch([name, community, raw.role, raw.eventPlace, raw.familyGroupTitle, story, asset && asset.folder].join(' '))
    };
  }

  function readPeople(){
    const candidates = [window.MEMORIAL_PEOPLE, window.FALLEN_PEOPLE, window.PEOPLE, window.people, window.peopleData, window.fallenPeople];
    let data = candidates.find(Array.isArray);
    if(!data){
      const el = document.getElementById('peopleData');
      if(el){ try{ data = JSON.parse(el.textContent); } catch(e){} }
    }
    return Array.isArray(data) ? data.map(normalizePerson).filter(p => p.name) : [];
  }

  function orderPeople(list){
    const byPreferred = new Map(preferredFirst.map((n,i)=>[normalizeForSearch(n), i]));
    return list.slice().sort((a,b)=>{
      const ai = byPreferred.has(normalizeForSearch(a.name)) ? byPreferred.get(normalizeForSearch(a.name)) : 9999;
      const bi = byPreferred.has(normalizeForSearch(b.name)) ? byPreferred.get(normalizeForSearch(b.name)) : 9999;
      if(ai !== bi) return ai - bi;
      return 0;
    });
  }

  function buildBatches(list){
    const ordered = orderPeople(list);
    const used = new Set();
    const units = [];
    ordered.forEach(p=>{
      if(used.has(p.id)) return;
      if(p.familyGroupId){
        const members = ordered.filter(x => x.familyGroupId && x.familyGroupId === p.familyGroupId && !used.has(x.id));
        members.forEach(x=>used.add(x.id));
        if(members.length && members.length <= BATCH_SIZE) units.push(members);
        else members.forEach(x=>units.push([x]));
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
    const meta = [p.community, p.age ? (p.age + '') : ''].filter(Boolean).map(x=>'<span>'+esc(x)+'</span>').join('');
    const img = p.photo ? '<img src="'+esc(p.photo)+'" alt="'+esc(p.name)+'" loading="eager" onerror="this.closest(\'.memory-photo\').classList.add(\'no-photo\');this.remove();">' : '';
    return '<button type="button" class="memory-card" data-id="'+esc(p.id)+'">' +
      '<span class="memory-photo '+(p.photo?'':'no-photo')+'">'+img+'</span>' +
      '<span class="memory-body"><strong class="memory-name">'+esc(p.name)+' <span class="memory-zl">'+T.zl+'</span></strong>' +
      '<span class="memory-meta">'+meta+'</span>' +
      (p.role ? '<span class="memory-role">'+esc(p.role)+'</span>' : '') + '</span></button>';
  }

  function renderBatch(index, animate){
    if(!stage) return;
    if(!batches.length){ stage.innerHTML = '<div class="empty-state">'+T.noResults+'</div>'; if(countLine) countLine.textContent=''; return; }
    batchIndex = (index + batches.length) % batches.length;
    const doRender = () => {
      const batch = batches[batchIndex];
      stage.innerHTML = batch.map(cardHTML).join('');
      stage.querySelectorAll('.memory-card').forEach((card,i)=>{
        card.addEventListener('click',()=>openModal(card.dataset.id));
        setTimeout(()=>card.classList.add('is-visible'), 90 + i*95);
      });
      const shown = batch.length;
      if(countLine) countLine.textContent = T.displaying + ' ' + shown + ' ' + T.from + ' ' + filteredPeople.length;
    };
    if(animate && stage.children.length){
      stage.querySelectorAll('.memory-card').forEach(card=>card.classList.remove('is-visible'));
      setTimeout(doRender, FADE_MS);
    } else doRender();
  }

  function restartTimer(){
    clearInterval(timer);
    if(paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = setInterval(()=>renderBatch(batchIndex+1,true), ROTATE_MS);
  }

  function applyFilter(){
    const q = normalizeForSearch(searchInput ? searchInput.value : '');
    filteredPeople = q ? allPeople.filter(p=>p.search.includes(q)) : allPeople.slice();
    batches = buildBatches(filteredPeople);
    batchIndex = 0;
    renderBatch(0,false);
    restartTimer();
  }

  function setPaused(value){
    paused = value;
    if(pauseBtn){ pauseBtn.setAttribute('aria-pressed', String(paused)); pauseBtn.textContent = paused ? T.play : T.pause; }
    restartTimer();
  }

  const BOILERPLATE_PATTERNS = [
    /^עבור לתפריט/, /^עבור למפת האתר/, /^אזרחים חללי פעולות איבה/, /^חללי "?חרבות ברזל"?/, /^האנדרטה לזכרם בהר הרצל$/,
    /^דבר שר/, /^דבר מנכ/, /^מידע שימושי/, /^אוגדן זכויות/, /^על אודות האתר$/, /^דף חלל$/, /^אלבום זיכרון$/,
    /^תמונות המצבה$/, /^בניית אתרים:?$/, /^פיתוח מאגרי מידע$/, /^שיתוף בפייסבוק/, /^הדפסת תווית/, /^אנו עושים כל מאמץ/, /^אם ברצונכם להעיר/
  ];

  function cleanDisplayText(raw){
    const lines = text(raw).replace(/\r/g,'').split('\n')
      .map(x => x.replace(/\s+/g,' ').trim())
      .filter(Boolean)
      .filter(line => !BOILERPLATE_PATTERNS.some(re => re.test(line)));
    const seen = new Set();
    const out = [];
    lines.forEach(line => {
      const key = normalizeForSearch(line);
      if(key.length < 120 && seen.has(key)) return;
      if(key.length < 120) seen.add(key);
      out.push(line);
    });
    return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }

  function inferResidenceFromText(raw){
    const s = cleanDisplayText(raw);
    const m = s.match(/התגורר(?:ה)?\s+ב([^\n.]+)/);
    return m ? m[1].trim() : '';
  }
  function inferAgeFromText(raw){
    const s = cleanDisplayText(raw);
    const m = s.match(/\b(?:בן|בת)\s+(\d{1,3})\s+במות[וה]/);
    return m ? m[1] : '';
  }

  function splitProfile(raw){
    const cleaned = cleanDisplayText(raw);
    if(!cleaned) return {facts: [], bio: '', title: ''};
    const lines = cleaned.split('\n').map(x=>x.trim()).filter(Boolean);
    const facts = [];
    let title = '';
    let bioLines = [];
    let inBio = false;
    lines.forEach(line => {
      if(/קורות חיים|קורות חייו|קורות חייה|קורות/.test(line)) { inBio = true; return; }
      if(!title && /ז["״'׳]{0,2}ל/.test(line) && line.length < 80){ title = line; return; }
      if(inBio) bioLines.push(line);
      else facts.push(line);
    });
    return {facts, bio: bioLines.join('\n\n'), title};
  }

  function profileHTML(p){
    const source = p.story || '';
    const split = splitProfile(source);
    let facts = split.facts.slice();
    const bio = split.bio || (facts.length > 6 ? facts.splice(6).join('\n\n') : '');
    let html = '';
    if(facts.length){
      html += '<section class="profile-section"><h3>'+T.personal+'</h3><div class="fact-list">';
      facts.slice(0, 16).forEach(line => {
        const labelValue = line.includes(':') ? line.split(/:(.+)/).filter(Boolean) : null;
        if(labelValue && labelValue.length >= 2){
          html += '<div class="fact-row"><strong>'+esc(labelValue[0])+':</strong><span>'+esc(labelValue.slice(1).join(':').trim())+'</span></div>';
        } else {
          html += '<div class="fact-row full"><span>'+esc(line)+'</span></div>';
        }
      });
      html += '</div></section>';
    }
    if(bio){
      html += '<section class="profile-section"><h3>'+T.biography+'</h3><div class="profile-body">'+nl2p(bio)+'</div></section>';
    }
    if(!html){
      html = '<p class="modal-empty">'+T.noText+'</p>';
    }
    return html;
  }

  function galleryHTML(p){
    const photos = unique(p.photos).filter(Boolean).slice(0, 18);
    if(!photos.length) return '<p class="modal-empty small">'+T.noPhotos+'</p>';
    return '<section class="modal-gallery"><h3>'+T.gallery+'</h3><div class="thumb-grid">' + photos.map((src, i) =>
      '<button type="button" class="thumb-btn" data-src="'+esc(src)+'" aria-label="תמונה '+(i+1)+'"><img src="'+esc(src)+'" alt="'+esc(p.name)+' - תמונה '+(i+1)+'" loading="lazy"></button>'
    ).join('') + '</div></section>';
  }

  function openModal(id){
    const p = filteredPeople.find(x=>String(x.id)===String(id)) || allPeople.find(x=>String(x.id)===String(id));
    if(!p || !modal) return;
    lastFocus = document.activeElement;
    $('#modalKicker').textContent = T.page;
    $('#modalName').textContent = p.name + ' ' + T.zl;
    $('#modalMeta').textContent = [p.community, p.age ? ('בן/בת ' + p.age) : '', p.role].filter(Boolean).join(' | ');
    const fig = $('#modalImage');
    fig.innerHTML = p.photo ? '<img id="modalMainImg" src="'+esc(p.photo)+'" alt="'+esc(p.name)+'">' : '<div class="no-modal-photo"></div>';
    $('#modalProfile').innerHTML = profileHTML(p) + galleryHTML(p);
    modal.querySelectorAll('.thumb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const main = $('#modalMainImg');
        if(main){ main.src = btn.dataset.src; }
      });
    });
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
    if(modalCard) modalCard.focus();
  }

  function closeModal(){
    if(!modal) return;
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open');
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }

  allPeople = readPeople();
  filteredPeople = allPeople.slice();
  batches = buildBatches(filteredPeople);
  renderBatch(0,false); restartTimer();
  nextBtn && nextBtn.addEventListener('click',()=>{renderBatch(batchIndex+1,true); restartTimer();});
  prevBtn && prevBtn.addEventListener('click',()=>{renderBatch(batchIndex-1,true); restartTimer();});
  pauseBtn && pauseBtn.addEventListener('click',()=>setPaused(!paused));
  searchInput && searchInput.addEventListener('input', applyFilter);
  modal && modal.addEventListener('click', e=>{ if(e.target.matches('[data-close-modal]')) closeModal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });
})();
