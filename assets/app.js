// =========================
// Helpers & utils
// =========================
function $(q, el = document) { return el.querySelector(q); }
function norm(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
async function loadJSON(url) {
  const res = await fetch(withBase(url), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}
function getParam(name, def=''){
  const u = new URL(location.href);
  return u.searchParams.get(name) ?? def;
}
function slugRegion(s){ return norm(s).replace(/\s+/g,'_'); }

// --- GitHub Pages base-path helper ---
const REPO_BASE = (() => {
  const parts = location.pathname.split('/').filter(Boolean);
  return location.hostname.endsWith('github.io') && parts.length ? `/${parts[0]}` : '';
})();
const withBase = (p) => {
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;      // URL absolue http(s)
  if (p.startsWith(REPO_BASE + '/')) return p; // déjà préfixé
  if (p.startsWith('/')) return REPO_BASE + p; // /data/... -> /Pok-mon_Destination_Test/data/…
  return REPO_BASE + '/' + p.replace(/^.\//,'');
};

// ==============================
// Correction des accents cassés
// ==============================
function fixBrokenAccentsInDom(root = document.body) {
  const map = [
    ['Pokmon','Pokémon'], ['Pokdex','Pokédex'], ['Capacits','Capacités'],
    ['Non Rpertori','Non Répertorié'], ['chantillon laiss','échantillon laissé'], ['Pokmon','Pokémon'], ['tre utilis','être utilisé']
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
    const data = await loadJSON(withBase(`/data/pokedex_${rk}.json`));

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

      // Fallback images en cascade
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
    const c = $('.container');
    if (c) c.innerHTML = `<div class="card">Erreur de chargement du Pokédex.<br><span class="small">${err.message}</span></div>`;
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

    const data = await loadJSON(withBase(`/data/pokedex_${rk}.json`));
    const p = data.find(x => (x.name||'').toLowerCase() === name);
    if(!p){
      $('.container')?.insertAdjacentHTML('beforeend', `<div class="card">Pokémon introuvable dans ${region}.</div>`);
      return;
    }

    // Titre & en-tête
    $('#title') && ($('#title').textContent = p.name);
    const pn = $('#pokename'); if (pn) pn.textContent = p.name;

    // Types, évolution, description
    const typesEl = $('#types'); if (typesEl) typesEl.innerHTML = (p.types||[]).map(t=>`<span class="badge">${t}</span>`).join(' ');
    const evoEl   = $('#evo');   if (evoEl)   evoEl.textContent  = p.evolution || '?';
    const pokedEl = $('#pokedex'); if (pokedEl) pokedEl.textContent = p.pokedex || '?';

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

    // ===== Listes d’attaques =====
    // 1) Capacités par niveau (level_up: [{level, move}])
    (function renderLevelUp(){
      const lvlEl = $('#lvl');
      if (!lvlEl) return;
      const arr = (p.level_up || []).slice().sort((a,b)=>a.level-b.level);
      if (!arr.length){ lvlEl.innerHTML = '<li>?</li>'; return; }
      lvlEl.innerHTML = arr.map(m => {
        const label = `${m.level}`.padStart(2,'0');
        const href = `${withBase('moves.html')}#${encodeURIComponent(m.move)}`;
        return `<li>${label} <a href="${href}">${m.move}</a></li>`;
      }).join('');
    })();

    // Helper pour rendre une liste en colonnes
    const linkMove = (m)=> `<a href="${withBase('moves.html')}#${encodeURIComponent(m)}">${m}</a>`;
    const renderList = (arr)=> arr && arr.length
      ? `<li class="lvl-group"><ul class="cols">${arr.map(m => `<li>${linkMove(m)}</li>`).join('')}</ul></li>`
      : '<li>?</li>';

    // 2) Repro / CS / CT / DT  (noms EXACTS du JSON: egg_moves, cs, ct, dt)
    $('#eggs') && ($('#eggs').innerHTML = renderList(p.egg_moves || []));
    $('#cs')   && ($('#cs').innerHTML   = renderList(p.cs        || []));
    $('#ct')   && ($('#ct').innerHTML   = renderList(p.ct        || []));
    $('#dt')   && ($('#dt').innerHTML   = renderList(p.dt        || []));

    // ===== Objet tenu & Ressource (pokemon_drops_<rk>.json) =====
    try{
      const drops = await loadJSON(withBase(`/data/pokemon_drops_${rk}.json`));
      const d = drops.find(x => (x.name||'').toLowerCase() === (p.name||'').toLowerCase()) || null;

      const heldName = (d && d.held_item && d.held_item.name) ? d.held_item.name : 'Non Répertorié';
      const resName  = (d && d.ressource && d.ressource.name) ? d.ressource.name : 'Non Répertorié';
      const resDesc  = (d && d.ressource && d.ressource.description)
        ? d.ressource.description
        : 'Un échantillon laissé par un Pokémon. Il peut être utilisé pour fabriquer des objets.';

      const objres = $('#objres');
      if (objres){
        objres.innerHTML = `
          <ul id="objresGrid">
            <li class="lvl-group"><div class="lvl-title">Objet tenu</div><ul><li>${heldName}</li></ul></li>
            <li class="lvl-group"><div class="lvl-title">Ressource</div><ul><li><b>${resName}</b></li><li style="margin-top:4px;opacity:0.8;">${resDesc}</li></ul></li>
          </ul>`;
      }
    }catch(e){ /* drops absent : OK */ }

    fixBrokenAccentsInDom();
  }catch(err){
    console.error(err);
    const c = $('.container');
    if (c) c.innerHTML = `<div class="card">Erreur de chargement de la fiche.<br><span class="small">${err.message}</span></div>`;
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
