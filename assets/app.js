// =========================
// Helpers & utils
// =========================
function $(q, el = document) { return el.querySelector(q); }
function norm(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
async function loadJSON(url) {
  const res = await fetch(withBase(url), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${withBase(url)}`);
  return res.json();
}
function getParam(name, def=''){
  const u = new URL(location.href);
  return u.searchParams.get(name) ?? def;
}
function slugRegion(s){ return norm(s).replace(/\s+/g,'_'); }

// --- Base-path dynamique (GitHub Pages) ---
const REPO_BASE = (() => {
  const parts = location.pathname.split('/').filter(Boolean);
  return location.hostname.endsWith('github.io') && parts.length ? `/${parts[0]}` : '';
})();
const withBase = (p) => {
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith(REPO_BASE + '/')) return p;
  if (p.startsWith('/')) return REPO_BASE + p;
  return REPO_BASE + '/' + p.replace(/^.\//,'');
};

// ==============================
// Correction légère d'accents (UI)
function fixBrokenAccentsInDom(root = document.body) {
  const map = [
    ['Pokmon','Pokémon'], ['Pokdex','Pokédex'], ['Capacits','Capacités'],
    ['Non Rpertori','Non Répertorié'], ['chantillon laiss','échantillon laissé'],
    ['tre utilis','être utilisé']
  ];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n; const toFix = [];
  while ((n = walker.nextNode())) { if (n.nodeValue) toFix.push(n); }
  for (const node of toFix) {
    let t = node.nodeValue;
    for (const [bad, good] of map) t = t.split(bad).join(good);
    if (t !== node.nodeValue) node.nodeValue = t;
  }
}

// ==================
// Détection région depuis l'URL
// ==================
function detectRegionFromPath() {
  const decoded = decodeURIComponent(location.pathname);
  const m = decoded.match(/\/region\/([^/]+)/i);
  return m ? m[1] : 'Johto';
}

// ==================
// Pokédex (liste)
// ==================
async function initIndex(){
  try{
    const list = $('.grid');
    const q = $('#q');

    let status = document.getElementById('status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'status';
      status.className = 'small';
      if (q && q.parentElement) {
        q.insertAdjacentElement('afterend', status);
      } else if (list && list.parentElement) {
        list.parentElement.insertBefore(status, list);
      }
    }

    const region = detectRegionFromPath();
    const rk = slugRegion(region);
    const data = await loadJSON(`/data/pokedex_${rk}.json`);

    const render = (items)=>{
      list.innerHTML = items.map(p=>{
        const name = p.name.toLowerCase();
        const candidates = [
          p.image || '',
          withBase(`/assets/pkm/${name}.png`),
          withBase(`/assets/pkm/${rk}/${name}.png`),
          withBase(`/assets/pkm/${name}_TCG.png`),
          withBase(`/assets/pkm/${p.name.toUpperCase()}.png`)
        ].filter(Boolean);

        const dataSrcs = encodeURIComponent(JSON.stringify(candidates));
        const firstSrc = candidates[0];
        const href = withBase(`/pokemon.html?r=${encodeURIComponent(region)}&n=${encodeURIComponent(name)}`);

        return `
          <div class="card">
            <div class="cardRow">
              <img class="thumb pokeimg"
                   src="${firstSrc}"
                   alt="${p.name}"
                   data-srcs="${dataSrcs}"
                   data-idx="0"
                   loading="lazy"
                   style="width:64px;height:64px;image-rendering:pixelated;object-fit:contain;">
              <div class="cardBody">
                <div class="h2">${p.name}</div>
                <div>${(p.types||[]).map(t=>`<span class="badge">${t}</span>`).join(' ')}</div>
                <div class="small" style="margin-top:4px">${p.evolution ? p.evolution : ''}</div>
                <div style="margin-top:8px"><a href="${href}">Ouvrir la fiche </a></div>
              </div>
            </div>
          </div>`;
      }).join('');
      status.textContent = `${items.length} Pokémon affiché${items.length>1?'s':''}`;

      list.querySelectorAll('img.pokeimg').forEach(img=>{
        img.onerror = () => {
          try {
            const srcs = JSON.parse(decodeURIComponent(img.getAttribute('data-srcs')));
            let idx = parseInt(img.getAttribute('data-idx') || '0', 10);
            idx++;
            if (idx < srcs.length) {
              img.setAttribute('data-idx', String(idx));
              img.src = srcs[idx];
            } else {
              img.style.display = 'none';
            }
          } catch {
            img.style.display = 'none';
          }
        };
      });
    };

    render(data);

    if(q){
      q.addEventListener('input', e=>{
        const v = norm(e.target.value);
        const f = data.filter(p =>
          norm(p.name).includes(v) ||
          norm((p.types||[]).join(' ')).includes(v)
        );
        render(f);
      });
    }
  }catch(err){
    console.error(err);
    const c = $('.container') || document.body;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div style="color:#ff8080">Erreur de chargement du Pokédex.<br><span class="small">${err.message}</span></div>`;
    c.appendChild(card);
  }
}

// ==================
// Fiche Pokémon
// ==================
async function initPokemon(){
  try{
    const region = getParam('r','Johto');
    const rk = slugRegion(region);
    const name  = decodeURIComponent(getParam('n',''));
    if (!name){
      $('.container')?.insertAdjacentHTML('beforeend', `<div class="card">Aucun Pokémon précisé.</div>`);
      return;
    }

    const data = await loadJSON(`/data/pokedex_${rk}.json`);
    const p = data.find(x => x.name.toLowerCase() === name);
    if(!p){
      $('.container')?.insertAdjacentHTML('beforeend', `<div class="card">Pokémon introuvable dans ${region}.</div>`);
      return;
    }

    // --- ENTÊTE propre ---
    $('#title')?.textContent = p.name;
    $('#pokename')?.textContent = p.name;

    // Types
    const typesEl = $('#types');
    if (typesEl) {
      typesEl.innerHTML = (p.types || []).map(t => `<span class="badge">${t}</span>`).join(' ');
    }

    // Évolution
    const evoEl = $('#evo');
    if (evoEl) {
      evoEl.textContent = p.evolution || '?';
    }

    // Talents & Talent caché
    const linkMove = (m)=> `<a href="${withBase('/moves.html')}#${encodeURIComponent(m)}">${m}</a>`;
    const habilEl = $('#habil');
    if (habilEl) {
      const abilities = p.abilities || [];
      habilEl.innerHTML = abilities.length ? abilities.map(a => linkMove(a)).join(', ') : '?';
    }
    const habhidEl = $('#habhid');
    if (habhidEl) {
      habhidEl.innerHTML = p.hidden_ability ? linkMove(p.hidden_ability) : '?';
    }

    // Description
    $('#pokedex')?.textContent = p.pokedex || '?';

    // Image
    const img = $('#sprite');
    if (img){
      const tryList = [
        withBase(`/assets/pkm/${name}.png`),
        withBase(`/assets/pkm/${rk}/${name}.png`),
        p.image ? withBase('/'+p.image.replace(/^\/+/,'')) : ''
      ].filter(Boolean);
      let i = 0;
      img.onerror = ()=>{ i++; if (i < tryList.length) img.src = tryList[i]; else img.style.display='none'; };
      img.src = tryList[0];
    }

    // ===== Capacités par niveau =====
    (function renderLevelUp(){
      const lvlEl = $('#lvl');
      if (!lvlEl) return;
      const arr = (p.level_up || []).slice().sort((a,b)=>a.level-b.level);
      if (!arr.length){ lvlEl.innerHTML = '<li>?</li>'; return; }
      const linkMove2 = (m)=> `<a href="${withBase('/moves.html')}#${encodeURIComponent(m)}">${m}</a>`;
      lvlEl.innerHTML = arr.map(m => {
        const label = `${m.level}`.padStart(2,'0');
        return `<li>${label} ${linkMove2(m.move)}</li>`;
      }).join('');
    })();

    // ===== Repro / CS / CT / DT =====
    const renderList = (arr)=> arr && arr.length
      ? `<li class="lvl-group"><ul class="cols">${arr.map(m => `<li><a href="${withBase('/moves.html')}#${encodeURIComponent(m)}">${m}</a></li>`).join('')}</ul></li>`
      : '<li>?</li>';

    const eggs = p.egg_moves || [];
    const cs   = p.cs || [];
    const ct   = p.ct || [];
    const dt   = p.dt || [];

    if (window.__once_debug_moves !== true) {
      console.debug('Moves debug:', {
        name: p.name, lvl: (p.level_up||[]).length,
        eggs: eggs.length, cs: cs.length, ct: ct.length, dt: dt.length
      });
      window.__once_debug_moves = true;
    }

    $('#eggs') && ($('#eggs').innerHTML = renderList(eggs));
    $('#cs')   && ($('#cs').innerHTML   = renderList(cs));
    $('#ct')   && ($('#ct').innerHTML   = renderList(ct));
    $('#dt')   && ($('#dt').innerHTML   = renderList(dt));

    // ===== Objet tenu & Ressource =====
    let heldName = 'Non Répertorié';
    let resName  = 'Non Répertorié';
    let resDesc  = 'Un échantillon laissé par un Pokémon. Il peut être utilisé pour fabriquer des objets.';

    try{
      const drops = await loadJSON(`/data/pokemon_drops_${rk}.json`);
      const d = drops.find(x => (x.name||'').toLowerCase() === (p.name||'').toLowerCase()) || null;

      if (d){
        // Objet tenu : si WildItemCommon est null => Non Répertorié
        const hasWildItem = d.WildItemCommon !== null && d.WildItemCommon !== undefined;
        if (hasWildItem && d.held_item && d.held_item.name) {
          heldName = d.held_item.name;
        } else {
          heldName = 'Non Répertorié';
        }

        // Ressource
        if (d.ressource) {
          if (d.ressource.name)  resName = d.ressource.name;
          if (d.ressource.description) resDesc = d.ressource.description;
        }
      }
    }catch(e){
      console.warn('drops non dispo', e);
    }

    const objres = $('#objres');
    if (objres){
      objres.innerHTML = `
        <li class="lvl-group">
          <div class="lvl-title">Objet tenu</div>
          <ul><li>${heldName}</li></ul>
        </li>
        <li class="lvl-group">
          <div class="lvl-title">Ressource</div>
          <ul>
            <li><b>${resName}</b></li>
            <li class="small" style="margin-top:4px;opacity:0.8;">${resDesc}</li>
          </ul>
        </li>`;
    }

    fixBrokenAccentsInDom();
  }catch(err){
    console.error(err);
    const c = $('.container') || document.body;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div style="color:#ff8080">Erreur de chargement de la fiche.<br><span class="small">${err.message}</span></div>`;
    c.appendChild(card);
  }
}

// ==================
// Auto-init
// ==================
document.addEventListener('DOMContentLoaded', () => {
  const file = location.pathname.split('/').pop().toLowerCase();
  if (file.startsWith('pokedex')) initIndex();
  else if (file === 'pokemon.html') initPokemon();
});
