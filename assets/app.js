/* ---------- app.js (multi-régions + fetch robuste) ---------- */

/***** utils *****/
function $(q, el=document){ return el.querySelector(q); }
function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function regionSlug(r){ return norm(r).replace(/\s+/g,'_'); }

// Auto-détection d'un éventuel sous-chemin (ex: /Pok-mon_Destination_Test)
const AUTO_BASE = (()=>{
  const path = location.pathname;
  const m = path.match(/^(.*\/Pok-mon[^/]*)(?:\/|$)/i);
  return m ? m[1] : '';
})();

function withBase(p){
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/')) return (AUTO_BASE ? AUTO_BASE : '') + p;
  return p.replace(/^.\//,'');
}

// Fetch robuste avec fallback (essaie plusieurs variantes de chemin)
async function loadJSON(url){
  const candidates = [];
  candidates.push(url);
  if (url.startsWith('/')) candidates.push(withBase(url));
  if (!url.startsWith('./')) candidates.push('./' + url.replace(/^\/+/,''));
  candidates.push(url.replace(/^\/+/,''));

  let lastErr;
  for (const u of candidates){
    try{
      const r = await fetch(u, {cache:'no-cache'});
      if(r.ok) return r.json();
      lastErr = new Error(`HTTP ${r.status} on ${u}`);
    }catch(e){ lastErr = e; }
  }
  throw lastErr || new Error("loadJSON failed for " + url);
}

/***** corrections texte *****/
function fixBrokenAccentsInDom(root=document.body){
  const pairs = [
    ['Pokmon','Pokémon'], ['Pokdex','Pokédex'], ['Capacits','Capacités'],
    ['Non Rpertori','Non Répertorié'], ['chantillon laiss','échantillon laissé'],
    ['tre utilis','être utilisé']
  ];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n; const arr=[];
  while(n=w.nextNode()) if(n.nodeValue) arr.push(n);
  for(const node of arr){
    let t=node.nodeValue;
    for(const [a,b] of pairs) t=t.split(a).join(b);
    if(t!==node.nodeValue) node.nodeValue=t;
  }
}

/***** sprites *****/
function nameVariants(n){
  const raw = (n||'').toString();
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  const unders = lower.replace(/\s+/g,'_');
  const undersU = upper.replace(/\s+/g,'_');
  return [lower, unders, upper, undersU];
}
function makeSpriteCandidates(name, rk){
  const vars = nameVariants(name);
  const out = [];
  for (const v of vars){
    out.push(withBase(`/assets/pkm/${v}.png`));
    if (rk) out.push(withBase(`/assets/pkm/${rk}/${v}.png`));
    out.push(withBase(`/assets/pkm2/${v}.png`));
    if (rk) out.push(withBase(`/assets/pkm2/${rk}/${v}.png`));
  }
  return out;
}

/***** Région helpers *****/
function getRegionFromURL(defaultRegion='Johto'){
  const url = new URL(location.href);
  const r = url.searchParams.get('r');
  return r || defaultRegion;
}
function regionSlug(r){ return norm(r).replace(/\s+/g,'_'); }
function pokedexPathFor(r){ return `/data/pokedex_${regionSlug(r)}.json`; }

/***** Liens d'évolution *****/
function linkifyEvo(p, region){
  const evoText = p.evolution || '';
  const baseHref = `pokemon.html?r=${encodeURIComponent(region)}&n=`;

  if (Array.isArray(p.evolutions_detailed) && p.evolutions_detailed.length){
    return p.evolutions_detailed.map(e => {
      const name = e.target_name || e.target_token || '???';
      const href = baseHref + encodeURIComponent(String(name).toLowerCase());
      if (e.method === 'Level' && e.level != null) return `Évolue en <a href="${href}" class="evo-link">${name}</a> au niveau ${e.level}`;
      if (e.method === 'Trade') return `Évolue en <a href="${href}" class="evo-link">${name}</a> par échange`;
      if (e.method === 'Happiness') return `Évolue en <a href="${href}" class="evo-link">${name}</a> avec une grande amitié`;
      if (e.method === 'HoldItem' || e.method === 'NightHoldItem'){
        const when = e.time === 'night' ? ' la nuit' : '';
        return `Évolue en <a href="${href}" class="evo-link">${name}</a> en tenant l'objet ${e.item_name || e.item_token}${when}`;
      }
      if (e.method === 'Item') return `Évolue en <a href="${href}" class="evo-link">${name}</a> en utilisant ${e.item_name || e.item_token}`;
      if (e.method === 'HasMove') return `Évolue en <a href="${href}" class="evo-link">${name}</a> en connaissant ${e.move_name || e.move_token}`;
      if (e.method === 'HasMoveType') return `Évolue en <a href="${href}" class="evo-link">${name}</a> en connaissant une attaque de type ${e.move_type}`;
      return `Évolue en <a href="${href}" class="evo-link">${name}</a>`;
    }).join(' / ');
  }

  return evoText.replace(
    /(?:É|E)volue en\s+([^,.;/]+)/g,
    (full, rest) => {
      const parts = rest.split(/\s+(?:au|avec|en|si|lorsqu|quand|dans)(?:\s|$)/);
      const name  = (parts[0] || '').trim();
      if (!name) return full;
      const suffixStart = rest.indexOf(name) + name.length;
      const suffix = rest.slice(suffixStart);
      const href = baseHref + encodeURIComponent(name.toLowerCase());
      return `Évolue en <a href="${href}" class="evo-link">${name}</a>${suffix}`;
    }
  );
}

/***** LISTE POKÉDEX *****/
async function initIndex(){
  try{
    const grid = $('.grid');
    if(!grid){
      (document.body).insertAdjacentHTML('beforeend','<div class="card" style="color:#ff8080">Erreur : .grid manquant.</div>');
      return;
    }
    const region = getRegionFromURL('Johto');
    const rk = regionSlug(region);

    let status = $('#status');
    if(!status){
      status = document.createElement('div');
      status.id='status'; status.className='small';
      (grid.parentElement||document.body).insertAdjacentElement('afterbegin', status);
    }

    const data = await loadJSON(pokedexPathFor(region));

    const render = (items)=>{
      grid.innerHTML = items.map(p=>{
        const nameLower = (p.name||'').toLowerCase();
        const imgCandidates = [
          p.image ? withBase('/'+String(p.image).replace(/^\/+/,'')) : ''
        ].concat(makeSpriteCandidates(p.name, rk)).filter(Boolean);

        const first = imgCandidates[0] || '';
        const dataSrcs = encodeURIComponent(JSON.stringify(imgCandidates));
        const href = `pokemon.html?r=${encodeURIComponent(region)}&n=${encodeURIComponent(nameLower)}`;

        return `
          <div class="card">
            <div class="cardRow">
              <img class="thumb pokeimg"
                   src="${first}"
                   alt="${p.name||''}"
                   data-srcs="${dataSrcs}"
                   data-idx="0"
                   loading="lazy"
                   style="width:64px;height:64px;image-rendering:pixelated;object-fit:contain;">
              <div class="cardBody">
                <div class="h2">${p.name||''}</div>
                <div>${(p.types||[]).map(t=>\`<span class="badge">\${t}</span>\`).join(' ')}</div>
                <div class="small" style="margin-top:4px">\${linkifyEvo(p, region)}</div>
                <div style="margin-top:8px"><a href="${href}">Ouvrir la fiche</a></div>
              </div>
            </div>
          </div>`;
      }).join('');

      status.textContent = `${items.length} Pokémon affiché${items.length>1?'s':''}`;

      grid.querySelectorAll('img.pokeimg').forEach(img=>{
        img.onerror = ()=>{
          try{
            const srcs = JSON.parse(decodeURIComponent(img.getAttribute('data-srcs')));
            let idx = parseInt(img.getAttribute('data-idx')||'0',10);
            idx++;
            if(idx < srcs.length){
              img.setAttribute('data-idx', String(idx));
              img.src = srcs[idx];
            }else{
              img.style.display='none';
            }
          }catch{ img.style.display='none'; }
        };
      });
    };

    render(data);

    const q = $('#q');
    if(q){
      q.addEventListener('input', e=>{
        const v = norm(e.target.value);
        const f = data.filter(p =>
          norm(p.name||'').includes(v) ||
          norm((p.types||[]).join(' ')).includes(v)
        );
        render(f);
      });
    }

    fixBrokenAccentsInDom();
  }catch(err){
    console.error(err);
    const c = $('.container') || document.body;
    c.insertAdjacentHTML('beforeend', `<div class="card" style="color:#ff8080">Erreur de chargement du Pokédex.<br><span class="small">${err.message}</span></div>`);
  }
}

/***** FICHE POKÉMON *****/
async function initPokemon(){
  try{
    const url = new URL(location.href);
    const region = getRegionFromURL('Johto');
    const rk = regionSlug(region);
    const name = (url.searchParams.get('n')||'').toLowerCase();

    if(!name){
      $('.container')?.insertAdjacentHTML('beforeend', `<div class="card">Aucun Pokémon précisé.</div>`);
      return;
    }

    const data = await loadJSON(pokedexPathFor(region));
    const p = data.find(x => (x.name||'').toLowerCase() === name);
    if(!p){
      $('.container')?.insertAdjacentHTML('beforeend', `<div class="card">Pokémon introuvable dans ${region}.</div>`);
      return;
    }

    $('#pokename') && ($('#pokename').textContent = p.name);
    const typesEl = $('#types'); if(typesEl) typesEl.innerHTML = (p.types||[]).map(t=>`<span class="badge">${t}</span>`).join(' ');
    const evoEl = $('#evo'); if(evoEl) evoEl.innerHTML = linkifyEvo(p, region) || '?';

    const linkMove = (m)=> `<a href="moves.html#${encodeURIComponent(m)}">${m}</a>`;
    const habilEl = $('#habil'); if(habilEl){
      const abilities = p.abilities || [];
      habilEl.innerHTML = abilities.length ? abilities.map(a=>linkMove(a)).join(', ') : '?';
    }
    const habhidEl = $('#habhid'); if(habhidEl){
      habhidEl.innerHTML = p.hidden_ability ? linkMove(p.hidden_ability) : '?';
    }

    const img = $('#sprite');
    if(img){
      const candidates = [
        p.image ? withBase('/'+String(p.image).replace(/^\/+/,'')) : ''
      ].concat(makeSpriteCandidates(p.name, rk)).filter(Boolean);

      let i=0;
      img.onerror = ()=>{ i++; if(i<candidates.length) img.src=candidates[i]; else img.style.display='none'; };
      img.src = candidates[0] || '';
    }

    (function(){
      const lvlEl = $('#lvl'); if(!lvlEl) return;
      const arr = (p.level_up||[]).slice().sort((a,b)=>a.level-b.level);
      lvlEl.innerHTML = arr.length
        ? arr.map(m=>`<li>${String(m.level).padStart(2,'0')} <a href="moves.html#${encodeURIComponent(m.move)}">${m.move}</a></li>`).join('')
        : '<li>?</li>';
    })();

    const renderList = (arr)=> arr && arr.length
      ? `<li class="lvl-group"><ul class="cols">${arr.map(m=>`<li><a href="moves.html#${encodeURIComponent(m)}">${m}</a></li>`).join('')}</ul></li>`
      : '<li>?</li>';
    $('#eggs') && ($('#eggs').innerHTML = renderList(p.egg_moves || []));
    $('#cs')   && ($('#cs').innerHTML   = renderList(p.cs || []));
    $('#ct')   && ($('#ct').innerHTML   = renderList(p.ct || []));
    $('#dt')   && ($('#dt').innerHTML   = renderList(p.dt || []));

    $('#pokedex') && ($('#pokedex').textContent = p.pokedex || '?');

    fixBrokenAccentsInDom();
  }catch(err){
    console.error(err);
    const c = $('.container') || document.body;
    c.insertAdjacentHTML('beforeend', `<div class="card" style="color:#ff8080">Erreur de chargement de la fiche.<br><span class="small">${err.message}</span></div>`);
  }
}

/***** auto init *****/
document.addEventListener('DOMContentLoaded', ()=>{
  const path = location.pathname.toLowerCase();
  const file = path.split('/').pop();
  if (file === 'pokemon.html')  initPokemon();
  else if (file.startsWith('pokedex')) initIndex();
});
