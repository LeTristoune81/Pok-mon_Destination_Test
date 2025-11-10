/***** app.js — version stable avec fallback pkm2 *****/

// --------- utils ----------
function $(q, el=document){ return el.querySelector(q); }
function norm(s){ return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
function slugRegion(s){ return norm(s).replace(/\s+/g,'_'); }

const REPO = '/Pok-mon_Destination_Test';
function withBase(p){
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith(REPO + '/')) return p;
  if (p.startsWith('/')) return REPO + p;
  return REPO + '/' + p.replace(/^.\//,'');
}

async function loadJSON(url){
  const u = withBase(url);
  const r = await fetch(u, {cache:'no-cache'});
  if(!r.ok) throw new Error(`HTTP ${r.status} on ${u}`);
  return r.json();
}

// --------- corrections texte ----------
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

// --------- helpers sprites ----------
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

// --------- LISTE POKÉDEX ----------
async function initIndex(){
  try{
    const grid = $('.grid');
    if(!grid){
      (document.body).insertAdjacentHTML('beforeend','<div class="card" style="color:#ff8080">Erreur : .grid manquant.</div>');
      return;
    }
    const q = $('#q');
    let status = $('#status');
    if(!status){
      status = document.createElement('div');
      status.id='status'; status.className='small';
      (q || grid).insertAdjacentElement('afterend', status);
    }

    const region = 'Johto';
    const rk = 'johto';
    const data = await loadJSON('/data/pokedex_johto.json');

    const render = (items)=>{
      grid.innerHTML = items.map(p=>{
        const name = (p.name||'').toLowerCase();
        const imgCandidates = makeSpriteCandidates(p.name, rk);
        const first = imgCandidates[0] || '';
        const dataSrcs = encodeURIComponent(JSON.stringify(imgCandidates));
        const href = `${REPO}/pokemon.html?r=${encodeURIComponent(region)}&n=${encodeURIComponent(name)}`;

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
                <div>${(p.types||[]).map(t=>`<span class="badge">${t}</span>`).join(' ')}</div>
                <div class="small" style="margin-top:4px">${p.evolution||''}</div>
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
  }catch(err){
    console.error(err);
    const c = $('.container') || document.body;
    c.insertAdjacentHTML('beforeend', `<div class="card" style="color:#ff8080">Erreur de chargement du Pokédex.<br><span class="small">${err.message}</span></div>`);
  }
}

// --------- FICHE POKÉMON ----------
async function initPokemon(){
  try{
    const region = 'Johto';
    const rk = slugRegion(region);
    const name = (new URL(location.href)).searchParams.get('n')?.toLowerCase() || '';

    if(!name){
      $('.container')?.insertAdjacentHTML('beforeend', `<div class="card">Aucun Pokémon précisé.</div>`);
      return;
    }

    const data = await loadJSON(`/data/pokedex_${rk}.json`);
    const p = data.find(x => (x.name||'').toLowerCase() === name);
    if(!p){
      $('.container')?.insertAdjacentHTML('beforeend', `<div class="card">Pokémon introuvable dans ${region}.</div>`);
      return;
    }

    $('#pokename') && ($('#pokename').textContent = p.name);
    const typesEl = $('#types'); if(typesEl) typesEl.innerHTML = (p.types||[]).map(t=>`<span class="badge">${t}</span>`).join(' ');
    const evoEl = $('#evo'); if(evoEl) evoEl.textContent = p.evolution || '?';

    const linkMove = (m)=> `<a href="${withBase('/moves.html')}#${encodeURIComponent(m)}">${m}</a>`;
    const habilEl = $('#habil'); if(habilEl){
      const abilities = p.abilities || [];
      habilEl.innerHTML = abilities.length ? abilities.map(a=>linkMove(a)).join(', ') : '?';
    }
    const habhidEl = $('#habhid'); if(habhidEl){
      habhidEl.innerHTML = p.hidden_ability ? linkMove(p.hidden_ability) : '?';
    }

    const img = $('#sprite');
    if(img){
      const candidates = makeSpriteCandidates(p.name, rk);
      let i = 0;
      img.onerror = ()=>{ i++; if(i < candidates.length) img.src=candidates[i]; else img.style.display='none'; };
      img.src = candidates[0] || '';
    }

    // reste inchangé (listes, objets, etc.)
    ...
  }catch(err){
    console.error(err);
    const c = $('.container') || document.body;
    c.insertAdjacentHTML('beforeend', `<div class="card" style="color:#ff8080">Erreur de chargement de la fiche.<br><span class="small">${err.message}</span></div>`);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const path = location.pathname.toLowerCase();
  const file = path.split('/').pop();
  if (file === 'pokemon.html') initPokemon();
  else if (path.includes('pokedex_johto')) initIndex();
  else if (file.startsWith('pokedex')) initIndex();
});
