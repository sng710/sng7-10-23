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
    zl: 'ז״ל',
    noResults: 'לא נמצאו תוצאות',
    displaying: 'מוצגים',
    from: 'מתוך',
    noText: 'לא נמצא טקסט להצגה עבור אדם זה. יש לוודא שקיים profile_text.txt ושהרצת את run_build_manifest_windows.bat.',
    noManifest: 'לא נטענו אנשים. יש להעתיק את assets/people ואז להריץ run_build_manifest_windows.bat כדי ליצור people_assets_manifest.js.'
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

  const BOILERPLATE_LINES = [
    /^עבור לתפריט/,
    /^עבור למפת האתר/,
    /^אזרחים חללי פעולות איבה/,
    /^חללי "?חרבות ברזל"?/,
    /^האנדרטה לזכרם בהר הרצל$/,
    /^דבר שר/,
    /^דבר מנכ/,
    /^מידע שימושי/,
    /^אוגדן זכויות/,
    /^על אודות האתר$/,
    /^דף חלל$/,
    /^אלבום זיכרון$/,
    /^תמונות המצבה$/,
    /^בניית אתרים:?$/,
    /^פיתוח מאגרי מידע$/,
    /^שיתוף בפייסבוק/,
    /^הדפסת תווית/,
    /^אנו עושים כל מאמץ/,
    /^אם ברצונכם להעיר/,
    /^פרטים אישיים והנצחה:?$/,
    /^קורות חיים$/
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
      .replace(/^\d+[_\-\s]*/,'')
      .replace(/_/g,' ')
      .replace(/\s*ז[״"'׳`]{0,2}\s*ל\s*$/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }
  function normalizeForSearch(v){ return cleanName(v).toLowerCase().replace(/[\u0591-\u05C7]/g,'').replace(/["'״׳`]/g,'').replace(/[_\-–—.,;:()\[\]{}]/g,' ').replace(/\s+/g,' ').trim(); }
  function esc(v){ return text(v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function unique(arr){ return Array.from(new Set(arr.map(text).filter(Boolean))); }

  function cleanDisplayText(s){
    const lines = [];
    const seen = new Set();
    text(s).replace(/\r/g,'').split('\n').forEach(raw => {
      const line = raw.replace(/\s+/g,' ').trim();
      if(!line) return;
      if(BOILERPLATE_LINES.some(rx => rx.test(line))) return;
      const key = line.replace(/[\s"'״׳`.,:;()\[\]{}_-]+/g,'');
      if(key.length < 120 && seen.has(key)) return;
      if(key.length < 120) seen.add(key);
      lines.push(line);
    });
    return lines.join('\n').trim();
  }
  function nl2p(v){
    const cleaned = cleanDisplayText(v);
    if(!cleaned) return '<p>'+esc(T.noText)+'</p>';
    return cleaned.split(/\n{2,}/).map(block => {
      const compact = block.split('\n').filter(Boolean);
      return '<p>' + compact.map(esc).join('<br>') + '</p>';
    }).join('');
  }

  function firstImageFromRaw(p){
    const candidates = [p.photo,p.image,p.img,p.src,p.portrait,p.mainImage,p.thumbnail,p.imageUrl,p.photoUrl];
    if(Array.isArray(p.images) && p.images.length){
      const im = p.images.find(x => typeof x === 'string') || p.images.find(x => x && (x.src || x.url || x.path));
      if(typeof im === 'string') candidates.push(im); else if(im) candidates.push(im.src || im.url || im.path);
    }
    return text(candidates.find(Boolean));
  }
  function getStory(p){ return text(p.profileText || p.storySummaryClean || p.storySummary || p.summary_he || p.summary || p.description || p.bio || p.story || p.content || p.role); }
  function inferResidenceFromText(story){
    const s = text(story);
    const patterns = [/התגורר(?:ה)?\s+ב([^\n,.]+)/, /מקום אירוע:\s*([^\n,.]+)/, /מקום מגורים:\s*([^\n,.]+)/];
    for(const rx of patterns){ const m = s.match(rx); if(m) return text(m[1]); }
    return '';
  }
  function inferAgeFromText(story){
    const m = text(story).match(/(?:בן|בת)\s+(\d{1,3})\s+במות/);
    return m ? (m[1] + ' במותו/ה') : '';
  }
  function assetNameFromFolder(folder){ return cleanName(text(folder).split('/').pop()); }

  function personFromAsset(asset, i){
    const name = cleanName(asset.name || asset.displayName || assetNameFromFolder(asset.folder) || ('אדם ' + (i+1)));
    const photos = unique(Array.isArray(asset.photos) ? asset.photos : []);
    const story = cleanDisplayText(asset.profileText || asset.text || asset.summaryText || '');
    const community = text(asset.community || asset.place || inferResidenceFromText(story));
    return {
      raw: asset,
      name,
      id: asset.id || asset.slug || asset.folder || ('asset-' + i),
      photo: photos[0] || '',
      photos,
      asset,
      community,
      age: text(asset.age || inferAgeFromText(story)),
      role: text(asset.role || asset.subtitle || ''),
      story,
      familyGroupId: text(asset.familyGroupId || asset.family_group_id || asset.familyGroupTitle || ''),
      search: normalizeForSearch([name, community, story, asset.folder].join(' '))
    };
  }

  function bestAssetFor(raw, name, photo){
    if(!ASSET_MANIFEST.length) return null;
    const explicitFolder = text(raw.assetsFolder || raw.assetFolder || raw.peopleFolder || raw.folder || raw.directory || raw.personFolder);
    if(explicitFolder){
      const f = explicitFolder.replace(/^assets\/people\//,'').replace(/[\\/]+$/,'');
      const exact = ASSET_MANIFEST.find(a => text(a.folder) === f || text(a.folder).endsWith('/'+f));
      if(exact) return exact;
    }
    if(photo && photo.includes('assets/people/')){
      const m = photo.match(/assets\/people\/([^/]+)/);
      if(m){
        const rawFolder = decodeURIComponent(m[1]);
        const exact = ASSET_MANIFEST.find(a => text(a.folder) === rawFolder || encodeURIComponent(text(a.folder)) === m[1]);
        if(exact) return exact;
      }
    }
    const personNorm = normalizeForSearch(name);
    const personTokens = personNorm.split(/\s+/).filter(x => x.length > 1);
    let best = null;
    ASSET_MANIFEST.forEach(a => {
      const names = unique([a.name, a.displayName, assetNameFromFolder(a.folder), ...(Array.isArray(a.names) ? a.names : [])]);
      let score = 0;
      names.forEach(n => {
        const nn = normalizeForSearch(n);
        if(!nn) return;
        if(nn === personNorm) score = Math.max(score, 100);
        else if(nn.includes(personNorm) || personNorm.includes(nn)) score = Math.max(score, 90);
        else {
          const at = new Set(nn.split(/\s+/).filter(x => x.length > 1));
          const hit = personTokens.filter(t => at.has(t)).length;
          if(hit >= 2) score = Math.max(score, Math.round(hit / Math.max(personTokens.length, at.size) * 80));
        }
      });
      if(!best || score > best.score) best = {score, asset: a};
    });
    return best && best.score >= 45 ? best.asset : null;
  }

  function normalizePerson(raw, i){
    const name = cleanName(raw.name || raw.fullName || raw.title || raw.excelDisplayName || raw.updatedExcelName || ('person ' + (i+1)));
    const rawPhoto = firstImageFromRaw(raw);
    const asset = bestAssetFor(raw, name, rawPhoto);
    const photos = unique([...(asset && Array.isArray(asset.photos) ? asset.photos : []), ...(Array.isArray(raw.images) ? raw.images.map(x => typeof x === 'string' ? x : (x && (x.src || x.url || x.path))) : []), rawPhoto]);
    const story = cleanDisplayText((asset && asset.profileText) || getStory(raw));
    const community = text(raw.community || raw.place || raw.residence || raw.location || raw.eventPlace || inferResidenceFromText(story));
    return {
      raw, name, id: raw.id || raw.slug || (asset && asset.folder) || ('p-' + i),
      photo: photos[0] || '',
      photos,
      asset,
      community,
      age: text(raw.age || raw.ageText || inferAgeFromText(story)),
      role: text(raw.role || raw.job || raw.subtitle || raw.guardRole),
      story,
      familyGroupId: text(raw.familyGroupId || raw.family_group_id || raw.familyGroupTitle || ''),
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
    if(Array.isArray(data) && data.length) return data.map(normalizePerson).filter(p => p.name);
    if(ASSET_MANIFEST.length) return ASSET_MANIFEST.map(personFromAsset).filter(p => p.name);
    return [];
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
    if(!batches.length){
      stage.innerHTML = '<div class="empty-state">'+esc(allPeople.length ? T.noResults : T.noManifest)+'</div>';
      if(countLine) countLine.textContent='';
      return;
    }
    batchIndex = (index + batches.length) % batches.length;
    const doRender = () => {
      const batch = batches[batchIndex];
      stage.innerHTML = batch.map(cardHTML).join('');
      stage.querySelectorAll('.memory-card').forEach((card,i)=>{
        card.addEventListener('click',()=>openModal(card.dataset.id));
        setTimeout(()=>card.classList.add('is-visible'), 90 + i*95);
      });
      if(countLine) countLine.textContent = T.displaying + ' ' + batch.length + ' ' + T.from + ' ' + filteredPeople.length;
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
  function thumbsHTML(p){
    const list = (p.photos || []).slice(0, 12);
    if(list.length <= 1) return '';
    return list.map((src, idx) => '<button type="button" class="modal-thumb" data-src="'+esc(src)+'" aria-label="תמונה '+(idx+1)+'"><img src="'+esc(src)+'" alt="'+esc(p.name)+'"></button>').join('');
  }
  function setModalImage(src, name){
    const fig = $('#modalImage');
    if(!fig) return;
    fig.innerHTML = src ? '<img src="'+esc(src)+'" alt="'+esc(name)+'">' : '<span class="memory-photo no-photo" aria-hidden="true"></span>';
  }
  async function maybeFetchText(p){
    if(p.story || !p.asset || !p.asset.folder || window.location.protocol === 'file:') return p.story;
    const folder = encodeURIComponent(p.asset.folder);
    const urls = [
      'assets/people/'+folder+'/profile_text.txt',
      'assets/people/'+folder+'/all_text_profile_and_inner_pages.txt'
    ];
    for(const url of urls){
      try{
        const res = await fetch(url, {cache:'force-cache'});
        if(res.ok){
          const val = cleanDisplayText(await res.text());
          if(val){ p.story = val; return val; }
        }
      }catch(e){}
    }
    return p.story;
  }
  async function openModal(id){
    const p = filteredPeople.find(x=>String(x.id)===String(id)) || allPeople.find(x=>String(x.id)===String(id));
    if(!p || !modal) return;
    lastFocus = document.activeElement;
    $('#modalKicker').textContent = T.page;
    $('#modalName').textContent = p.name + ' ' + T.zl;
    $('#modalMeta').textContent = [p.community, p.age ? p.age : '', p.role].filter(Boolean).join(' | ');
    const storyEl = $('#modalStory');
    storyEl.innerHTML = nl2p(p.story);
    setModalImage(p.photo, p.name);
    const thumbs = $('#modalThumbs');
    if(thumbs){
      thumbs.innerHTML = thumbsHTML(p);
      thumbs.querySelectorAll('.modal-thumb').forEach(btn => btn.addEventListener('click', () => setModalImage(btn.dataset.src, p.name)));
    }
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
    if(modalCard) modalCard.focus();
    const fetched = await maybeFetchText(p);
    if(fetched && storyEl) storyEl.innerHTML = nl2p(fetched);
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
