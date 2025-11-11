(function(){
  const msg     = document.getElementById('msg');
  const grid    = document.getElementById('moves');
  const search  = document.getElementById('search');
  const typeSel = document.getElementById('typeSel');
  const countEl = document.getElementById('count');
  const meta    = document.getElementById('meta');

  const norm = s => (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  // Détecte le préfixe du repo (ex: /Pok-mon_Destination_Test) pour GitHub Pages (project pages)
  const REPO_BASE = (() => {
    // pathname = /Pok-mon_Destination_Test/Pages/Attaques/toutes.html
    const parts = location.pathname.split('/').filter(Boolean);
    // prend le 1er segment comme repo quand il y en a au moins 1
    return parts.length ? '/' + parts[0] : '';
  })();

  // Tous les chemins possibles depuis /Pages/Attaques/toutes.html
  const CANDIDATES = [
    '../../data/moves_by_type.json',
    REPO_BASE + '/data/moves_by_type.json',
    // au cas où
    '../data/moves_by_type.json',
    './data/moves_by_type.json',
    '/data/moves_by_type.json'
  ];

  async function tryFetch(url){
    const res = await fetch(url + (url.includes('?')?'&':'?') + 'v=' + Date.now(), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${res.url}`);
    return await res.json();
  }

  async function loadByType(){
    let lastErr = null;
    for (const url of CANDIDATES){
      try{
        const j = await tryFetch(url);
        meta.textContent = `Recherche + filtre par type — Source: ${url}`;
        console.log('[toutes] loaded:', url);
        return j;
      }catch(e){
        lastErr = e;
        console.warn('[toutes] fail:', url, e.message);
      }
    }
    throw lastErr || new Error('moves_by_type.json introuvable');
  }

  function updateCount(n) {
    countEl.textContent = ` ${n} ${n>1?'attaques':'attaque'}`;
  }

  function moveId(m){
    return (m.upper || norm(m.name)).replace(/\s+/g,'_');
  }

  function renderList(ALL){
    const q = norm(search.value);
    const t = typeSel.value;

    const list = ALL
      .filter(m => t === 'ALL' ? true : m.type === t)
      .filter(m => !q || norm(m.name).includes(q) || norm(m.upper).includes(q));

    updateCount(list.length);

    if (!list.length) {
      grid.innerHTML = `<div class="alert">Aucune attaque trouvée pour ce filtre.</div>`;
      return;
    }

    grid.innerHTML = list.map(m => `
      <div class="card" id="${moveId(m)}">
        <div><strong>${m.name || m.upper}</strong>${m.type ? `<span class="tag">${m.type}</span>` : ''}</div>
        ${m.category ? `<div>Catégorie : ${m.category}</div>` : ''}
        <div>Puissance : ${m.power ?? '-'}&nbsp;&nbsp;Précision : ${m.accuracy ?? '-'}&nbsp;&nbsp;PP : ${m.pp ?? '-'}</div>
        ${m.description ? `<div class="small">${m.description}</div>` : ''}
      </div>
    `).join('');

    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
    }
  }

  (async () => {
    let byType;
    try {
      byType = await loadByType();
    } catch (e) {
      msg.innerHTML = `<div class="alert">
        <div><b>Erreur de chargement du JSON</b></div>
        <div style="margin-top:6px">${e.message}</div>
        <div style="margin-top:8px">Chemins testés :</div>
        <ul style="margin-top:6px">${CANDIDATES.map(u=>`<li><code>${u}</code></li>`).join('')}</ul>
        <div style="margin-top:8px">Le JSON est bien accessible publiquement, donc le blocage venait sûrement d'un script inline. Cette page n'utilise plus de script inline.</div>
      </div>`;
      return;
    }

    // Uniformise en {type: [...]}
    if (Array.isArray(byType)) {
      const regroup = {};
      for (const m of byType) {
        const t = m.type || 'Inconnu';
        (regroup[t] ||= []).push(m);
      }
      byType = regroup;
    }

    // Construire la liste plate + remplir le sélecteur
    const allTypes = Object.keys(byType).sort((a,b)=>a.localeCompare(b));
    for (const t of allTypes) {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      typeSel.appendChild(opt);
    }

    const ALL = [];
    for (const t of allTypes) {
      for (const m of byType[t]) {
        ALL.push({
          ...m,
          type: t,
          upper: m.upper || m.Upper || m.code || '',
          name:  m.name  || m.Nom   || m.Name  || '',
          category: m.category || m.categorie || m.Categorie || '',
          power: m.power ?? m.Puissance ?? '',
          accuracy: m.accuracy ?? m.Precision ?? '',
          pp: m.pp ?? m.TotalPP ?? ''
        });
      }
    }

    search.addEventListener('input', () => renderList(ALL));
    typeSel.addEventListener('change', () => renderList(ALL));
    renderList(ALL);

    window.addEventListener('hashchange', () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
    });
  })();
})();
