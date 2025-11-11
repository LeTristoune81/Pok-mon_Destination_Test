/* ---------- app.js (fix7: +initMoves toutes.html, liens vers toutes.html, sprites & JSON tolérants) ---------- */

/***** utils *****/
function $(q, el=document){ return el.querySelector(q); }
function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function regionSlug(r){ return norm(r).replace(/\s+/g,'_'); }

// Auto-détection d'un éventuel sous-chemin (ex: /Pok-mon_Destination_Test)
const AUTO_BASE = (()=> {
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

// Fetch robuste
async function loadJSON(url){
  const candidates = [url];
  if (url.startsWith('/')) candidates.push(withBase(url));
  if (!url.startsWith('./')) candidates.push('./' + url.replace(/^\/+/, ''));
  candidates.push(url.replace(/^\/+/, ''));

  let lastErr;
  for (const u of candidates){
    try{
      const r = await fetch(u, { cache: 'no-cache' });
      if (r.ok) return r.json();
      lastErr = new Error('HTTP ' + r.status + ' on ' + u);
    }catch(e){ lastErr = e; }
  }
  throw lastErr || new Error('loadJSON failed for ' + url);
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
    for(const p of pairs){ t = t.split(p[0]).join(p[1]); }
    if(t!==node.nodeValue) node.nodeValue=t;
  }
}

/***** sprites *****/
// Variantes robustes: enlève accents, apostrophes, genres, ET teste versions "compactes" (sans séparateurs)
function spriteVariants(n){
  const raw = (n||'').toString();
  const lower = raw.toLowerCase();
  const deacc = lower.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const base = deacc
    .replace(/[’']/g,'')
    .replace(/[♂]/g,'')
    .replace(/[♀]/g,'f')
    .replace(/[^a-z0-9 _-]/g,' ');
  const tokens = base.trim().split(/\s+/).filter(Boolean);
  const joined = tokens.join(' ');
  const seps = [' ', '_', '-', ''];
  const vars = new Set();
  function pushForm(s){
    if (!s) return;
    vars.add(s);
    vars.add(s.replace(/\s+/g,'_'));
    vars.add(s.replace(/\s+/g,'-'));
    vars.add(s.replace(/\s+/g,''));
    const up = s.toUpperCase();
    vars.add(up);
    vars.add(up.replace(/\s+/g,'_'));
    vars.add(up.replace(/\s+/g,'-'));
    vars.add(up.replace(/\s+/g,''));
  }
  pushForm(joined);
  for (const sep of seps) pushForm(tokens.join(sep));
  const compact = joined.replace(/[^a-z0-9]/gi,'');
  pushForm(compact);
  return Array.from(vars);
}

function makeSpriteCandidates(name, rk){
  const vars = spriteVariants(name);
  const out = [];
  for (const v of vars){
    out.push(withBase('/assets/pkm/' + v + '.png'));
    if (rk) out.push(withBase('/assets/pkm/' + rk + '/' + v + '.png'));
    out.push(withBase('/assets/pkm2/' + v + '.png'));
    if (rk) out.push(withBase('/assets/pkm2/' + rk + '/' + v + '.png'));
  }
  return out;
}

/***** Région helpers *****/
function inferRegionFromPath(){
  const path = decodeURIComponent(location.pathname);
  const m = path.match(/Pokedex_([^/.]+)\.html$/i);
  if (m && m[1]){
    return m[1].replace(/_/g,' ');
  }
  return null;
}
function getRegion(defaultRegion='Johto'){
  const url = new URL(location.href);
  const viaQuery = url.searchParams.get('r');
  if (viaQuery) return viaQuery;
  const viaPath = inferRegionFromPath();
  return viaPath || defaultRegion;
}
function pokedexPathFor(r){ return '/data/pokedex_' + regionSlug(r) + '.json'; }

/***** Liens d'évolution *****/
function linkifyEvo(p, region){
  const evoText = p.evolution || '';
  const baseHref = 'pokemon.html?r=' + encodeURIComponent(region) + '&n=';

  if (Array.isArray(p.evolutions_detailed) && p.evolutions_detailed.length){
    const parts = p.evolutions_detailed.map(function(e){
      const name = e.target_name || e.target_token || '???';
      const href = baseHref + encodeURIComponent(String(name).toLowerCase());
      if (e.method === 'Level' && e.level != null) return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a> au niveau ' + e.level;
      if (e.method === 'Trade') return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a> par échange';
      if (e.method === 'Happiness') return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a> avec une grande amitié';
      if (e.method === 'HoldItem' || e.method === 'NightHoldItem'){
        const when = e.time === 'night' ? ' la nuit' : '';
        return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a> en tenant l\'objet ' + (e.item_name || e.item_token) + when;
      }
      if (e.method === 'Item') return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a> en utilisant ' + (e.item_name || e.item_token);
      if (e.method === 'HasMove') return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a> en connaissant ' + (e.move_name || e.move_token);
      if (e.method === 'HasMoveType') return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a> en connaissant une attaque de type ' + e.move_type;
      return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a>';
    });
    return parts.join(' / ');
  }

  return evoText.replace(
    /(?:É|E)volue en\s+([^,.;/]+)/g,
    function(full, rest){
      const split = rest.split(/\s+(?:au|avec|en|si|lorsqu|quand|dans)(?:\s|$)/);
      const name  = (split[0] || '').trim();
      if (!name) return full;
      const suffixStart = rest.indexOf(name) + name.length;
      const suffix = rest.slice(suffixStart);
      const href = baseHref + encodeURIComponent(name.toLowerCase());
      return 'Évolue en <a href="' + href + '" class="evo-link">' + name + '</a>' + suffix;
    }
  );
}

/***** Rendu HTML helpers *****/
function renderBadges(types){
  return (types||[]).map(function(t){ return '<span class="badge">' + t + '</span>'; }).join(' ');
}
function renderHeldItems(held){
  if (!held || typeof held !== 'object') {
    return '<li class="lvl-group"><div class="lvl-title">Objet tenu</div><ul><li>Non Répertorié</li></ul></li>';
  }
  function val(x){ return (x && String(x).trim()) ? x : 'Aucun'; }
  return ''
    + '<li class="lvl-group">'
    +   '<div class="lvl-title">Objet tenu</div>'
    +   '<ul>'
    +     '<li><b>Commun :</b> '   + val(held.common)   + '</li>'
    +     '<li><b>Peu commun :</b> ' + val(held.uncommon) + '</li>'
    +     '<li><b>Rare :</b> '     + val(held.rare)     + '</li>'
    +   '</ul>'
    + '</li>';
}
function renderResource(res){
  if (!res) {
    return '<li class="lvl-group"><div class="lvl-title">Ressource</div><ul><li><b>Non Répertorié</b></li><li class="small" style="margin-top:4px;opacity:0.8;">Un échantillon laissé par un Pokémon. Il peut être utilisé pour fabriquer des objets.</li></ul></li>';
  }
  return ''
    + '<li class="lvl-group">'
    +   '<div class="lvl-title">Ressource</div>'
    +   '<ul>'
    +     '<li><b>' + res + '</b></li>'
    +   '</ul>'
    + '</li>';
}

/***** LISTE POKÉDEX *****/
async function initIndex(){
  try{
    const grid = $('.grid');
    if(!grid){
      (document.body).insertAdjacentHTML('beforeend','<div class="card" style="color:#ff8080">Erreur : .grid manquant.</div>');
      return;
    }
    const region = getRegion('Johto');
    const rk = regionSlug(region);

    let status = $('#status');
    if(!status){
      status = document.createElement('div');
      status.id='status'; status.className='small';
      (grid.parentElement||document.body).insertAdjacentElement('afterbegin', status);
    }

    const data = await loadJSON(pokedexPathFor(region));

    const cards = data.map(function(p){
      const nameLower = (p.name||'').toLowerCase();
      const imgCandidates = []
        .concat(p.image ? [withBase('/'+String(p.image).replace(/^\/+/,''))] : [])
        .concat(makeSpriteCandidates(p.name, rk));

      const first = imgCandidates[0] || '';
      const dataSrcs = encodeURIComponent(JSON.stringify(imgCandidates));
      const href = 'pokemon.html?r=' + encodeURIComponent(region) + '&n=' + encodeURIComponent(nameLower);

      return ''
        + '<div class="card">'
        +   '<div class="cardRow">'
        +     '<img class="thumb pokeimg"'
        +          ' src="' + first + '"'
        +          ' alt="' + (p.name||'') + '"'
        +          ' data-srcs="' + dataSrcs + '"'
        +          ' data-idx="0"'
        +          ' loading="lazy"'
        +          ' style="width:64px;height:64px;image-rendering:pixelated;object-fit:contain;">'
        +     '<div class="cardBody">'
        +       '<div class="h2">' + (p.name||'') + '</div>'
        +       '<div>' + renderBadges(p.types) + '</div>'
        +       '<div class="small" style="margin-top:4px">' + linkifyEvo(p, region) + '</div>'
        +       '<div style="margin-top:8px"><a href="' + href + '">Ouvrir la fiche</a></div>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    });

    grid.innerHTML = cards.join('');

    status.textContent = data.length + ' Pokémon affiché' + (data.length>1?'s':'');

    grid.querySelectorAll('img.pokeimg').forEach(function(img){
      img.onerror = function(){
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
        }catch(e){ img.style.display='none'; }
      };
    });

    const q = $('#q');
    if(q){
      q.addEventListener('input', function(e){
        const v = norm(e.target.value);
        const f = data.filter(function(p){
          return norm(p.name||'').includes(v) || norm((p.types||[]).join(' ')).includes(v);
        });
        const cards2 = f.map(function(p){
          const nameLower = (p.name||'').toLowerCase();
          const imgCandidates = []
            .concat(p.image ? [withBase('/'+String(p.image).replace(/^\/+/,''))] : [])
            .concat(makeSpriteCandidates(p.name, rk));
          const first = imgCandidates[0] || '';
          const dataSrcs = encodeURIComponent(JSON.stringify(imgCandidates));
          const href = 'pokemon.html?r=' + encodeURIComponent(region) + '&n=' + encodeURIComponent(nameLower);
          return ''
            + '<div class="card">'
            +   '<div class="cardRow">'
            +     '<img class="thumb pokeimg"'
            +          ' src="' + first + '"'
            +          ' alt="' + (p.name||'') + '"'
            +          ' data-srcs="' + dataSrcs + '"'
            +          ' data-idx="0"'
            +          ' loading="lazy"'
            +          ' style="width:64px;height:64px;image-rendering:pixelated;object-fit:contain;">'
            +     '<div class="cardBody">'
            +       '<div class="h2">' + (p.name||'') + '</div>'
            +       '<div>' + renderBadges(p.types) + '</div>'
            +       '<div class="small" style="margin-top:4px">' + linkifyEvo(p, region) + '</div>'
            +       '<div style="margin-top:8px"><a href="' + href + '">Ouvrir la fiche</a></div>'
            +     '</div>'
            +   '</div>'
            + '</div>';
        });
        grid.innerHTML = cards2.join('');
      });
    }

    fixBrokenAccentsInDom();
  }catch(err){
    console.error(err);
    const c = $('.container') || document.body;
    c.insertAdjacentHTML('beforeend', '<div class="card" style="color:#ff8080">Erreur de chargement du Pokédex.<br><span class="small">' + err.message + '</span></div>');
  }
}

/***** FICHE POKÉMON *****/
async function initPokemon(){
  try{
    const url = new URL(location.href);
    const region = getRegion('Johto');
    const rk = regionSlug(region);
    const name = (url.searchParams.get('n')||'').toLowerCase();

    if(!name){
      const ctn = $('.container') || document.body;
      ctn.insertAdjacentHTML('beforeend', '<div class="card">Aucun Pokémon précisé.</div>');
      return;
    }

    const data = await loadJSON(pokedexPathFor(region));
    const p = data.find(function(x){ return (x.name||'').toLowerCase() === name; });
    if(!p){
      const ctn = $('.container') || document.body;
      ctn.insertAdjacentHTML('beforeend', '<div class="card">Pokémon introuvable dans ' + region + '.</div>');
      return;
    }

    const pn = $('#pokename'); if(pn) pn.textContent = p.name;
    const typesEl = $('#types'); if(typesEl) typesEl.innerHTML = renderBadges(p.types);
    const evoEl = $('#evo'); if(evoEl) evoEl.innerHTML = linkifyEvo(p, region) || '?';

    // Tous les liens d’attaques pointent désormais vers toutes.html
    const linkMove = function(m){ return '<a href="toutes.html#' + encodeURIComponent(m) + '">' + m + '</a>'; };

    const habilEl = $('#habil'); if(habilEl){
      const abilities = p.abilities || [];
      habilEl.innerHTML = abilities.length ? abilities.map(linkMove).join(', ') : '?';
    }
    const habhidEl = $('#habhid'); if(habhidEl){
      habhidEl.innerHTML = p.hidden_ability ? linkMove(p.hidden_ability) : '?';
    }

    // OBJETS & RESSOURCE
    const objres = $('#objres');
    if (objres){
      const heldHTML = renderHeldItems(p.held_items);
      const resHTML = renderResource(p.resource);
      objres.innerHTML = heldHTML + resHTML;
    }

    // Image
    const img = $('#sprite');
    if(img){
      const candidates = []
        .concat(p.image ? [withBase('/'+String(p.image).replace(/^\/+/,''))] : [])
        .concat(makeSpriteCandidates(p.name, rk));

      let i=0;
      img.onerror = function(){
        i++;
        if(i < candidates.length) img.src = candidates[i];
        else img.style.display='none';
      };
      img.src = candidates[0] || '';
    }

    // Moves par niveau -> liens vers toutes.html
    (function(){
      const lvlEl = $('#lvl'); if(!lvlEl) return;
      const arr = (p.level_up||[]).slice().sort(function(a,b){ return a.level - b.level; });
      if (arr.length){
        lvlEl.innerHTML = arr.map(function(m){
          return '<li>' + String(m.level).padStart(2,'0') + ' <a href="toutes.html#' + encodeURIComponent(m.move) + '">' + m.move + '</a></li>';
        }).join('');
      }else{
        lvlEl.innerHTML = '<li>?</li>';
      }
    })();

   const renderList = (arr=[]) => {
  if (!arr.length) return '<li><em>Aucune</em></li>';
  return '<li><ul>' + arr.map(m => {
    const hash = norm(m).replace(/\s+/g, '_'); // ex: "Coupe" -> "coupe" -> "coupe"
    return '<li><a href="Pages/Attaques/toutes.html#' + encodeURIComponent(hash) + '">' + m + '</a></li>';
  }).join('') + '</ul></li>';
};

    const eggs = $('#eggs'); if(eggs) eggs.innerHTML = renderList(p.egg_moves || []);
    const cs   = $('#cs');   if(cs)   cs.innerHTML   = renderList(p.cs || []);
    const ct   = $('#ct');   if(ct)   ct.innerHTML   = renderList(p.ct || []);
    const dt   = $('#dt');   if(dt)   dt.innerHTML   = renderList(p.dt || []);

    const pokedex = $('#pokedex'); if(pokedex) pokedex.textContent = p.pokedex || '?';

    fixBrokenAccentsInDom();
  }catch(err){
    console.error(err);
    const c = $('.container') || document.body;
    c.insertAdjacentHTML('beforeend', '<div class="card" style="color:#ff8080">Erreur de chargement de la fiche.<br><span class="small">' + err.message + '</span></div>');
  }
}

/***** TOUTES LES ATTAQUES (toutes.html) *****/
async function initMoves(){
  const grid = $('.grid');
  if (!grid){
    console.warn('Pas de .grid sur cette page');
    return;
  }
  const q = $('#q');

  // 1) charge moves_all.json ou moves_index.json (objet/array)
  async function loadMovesAny(){
    const tries = [
      '/data/moves_all.json',
      '/data/moves_index.json',
      '/Data/moves_all.json',
      '/Data/moves_index.json'
    ];
    let lastErr = null;
    for (const p of tries){
      try{
        const j = await loadJSON(p);
        return { data: j, source: p };
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('Aucune source JSON trouvée');
  }

  function coerceArray(data){
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return Object.values(data);
    return [];
  }

  function normalizeMove(m){
    return {
      Nom:        m.Nom ?? m.name ?? m.Name ?? '',
      Upper:      m.upper ?? m.Upper ?? m.UPPER ?? m.code ?? '',
      Type:       m.Type ?? m.type ?? '',
      Categorie:  m.Categorie ?? m.categorie ?? m.Category ?? m.category ?? '',
      Puissance:  m.Puissance ?? m.puissance ?? m.Power ?? '',
      Precision:  m.Precision ?? m.precision ?? m.Accuracy ?? '',
      PP:         m.PP ?? m.pp ?? m.TotalPP ?? '',
      Description:m.Description ?? m.description ?? ''
    };
  }

  function cardHTML(m){
    // Ancre: permet d’arriver depuis pokemon.html#MOVE
    const id = (m.Upper || norm(m.Nom)).replace(/\s+/g,'_');
    return `
      <div class="card" id="${id}" style="padding:12px">
        <div class="h2" style="margin-bottom:6px">${m.Nom || '?'}</div>
        <div class="muted" style="margin-bottom:8px">${[m.Type, m.Categorie].filter(Boolean).join(' • ')}</div>
        <div class="grid-mini" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px; margin-bottom:8px">
          <div><strong>Puissance</strong><br>${m.Puissance || '-'}</div>
          <div><strong>Précision</strong><br>${m.Precision || '-'}</div>
          <div><strong>PP</strong><br>${m.PP || '-'}</div>
        </div>
        ${m.Description ? `<div class="small">${m.Description}</div>` : ``}
      </div>`;
  }

  function render(list, metaText){
    if (!list.length){
      grid.innerHTML = `<div class="card" style="padding:12px">Aucune attaque</div>`;
      return;
    }
    grid.innerHTML = list.map(cardHTML).join('');
    // Auto-scroll si on a un hash (ex: toutes.html#CRACHFUMEE)
    if (location.hash){
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
    }
    // Info en-tête si tu veux en afficher une (facultatif)
    const header = $('.header');
    if (header && !header.querySelector('.muted-info')){
      const span = document.createElement('div');
      span.className = 'muted muted-info';
      span.style.marginTop = '4px';
      span.textContent = metaText || '';
      header.appendChild(span);
    }else if (header && header.querySelector('.muted-info')){
      header.querySelector('.muted-info').textContent = metaText || '';
    }
  }

  try{
    const { data, source } = await loadMovesAny();
    let ALL = coerceArray(data).map(normalizeMove);
    // Tri accent-insensible par Nom
    ALL.sort((a,b)=> norm(a.Nom).localeCompare(norm(b.Nom)));
    render(ALL, `Source: ${source} — ${ALL.length} attaques`);

    if (q){
      q.addEventListener('input', ()=>{
        const n = norm(q.value);
        const filtered = ALL.filter(m =>
          norm(m.Nom).includes(n) ||
          norm(m.Type).includes(n) ||
          norm(m.Categorie).includes(n)
        );
        render(filtered, `Source: ${source} — ${filtered.length}/${ALL.length} attaques`);
      });
    }

    fixBrokenAccentsInDom();
  }catch(e){
    console.error(e);
    grid.innerHTML = `
      <div class="card" style="padding:12px;color:#a00">
        Erreur de chargement des attaques.<br>
        <small>${e.message}</small>
      </div>`;
  }
}

/***** auto init *****/
document.addEventListener('DOMContentLoaded', function(){
  const path = location.pathname.toLowerCase();
  const file = path.split('/').pop();
  if (file === 'pokemon.html')  initPokemon();
  else if (file.startsWith('pokedex')) initIndex();
  else if (file === 'toutes.html' || file === 'moves.html') initMoves(); // moves.html reste supporté si la page existe encore
});
