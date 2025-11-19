/* ---------- app.js (VERSION CORRIGÉE DIRECTE) ---------- */

/***** 1. DÉTECTION DE LA RACINE *****/
const getRoot = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/pages/lieux/') || path.includes('/pages/attaques/')) return '../../';
    if (path.includes('/pokedex/') || path.includes('/pages/')) return '../';
    return './'; 
};
const ROOT = getRoot();

/***** 2. CONFIGURATION *****/
const CONFIG = {
    baseTitle: "Pokémon Destination",
    spritePaths: [`${ROOT}assets/pkm/`, `${ROOT}assets/pkm2/`], 
    defaultRegion: 'Kanto'
};

/***** 3. UTILITAIRES *****/
const $ = (q, el = document) => el.querySelector(q);
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/***** 4. CHARGEMENT DES DONNÉES (JSON) *****/
async function loadJSON(filename) {
    // CORRECTION ICI : On ne modifie plus le nom du fichier !
    // On suppose que le nom passé est le bon (ex: "pokedex_kanto.json")
    const url = `${ROOT}data/${filename}`;
    
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
    } catch (e) {
        console.error(`[ERREUR] Impossible de charger ${url}`, e);
        return null;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

/***** 5. GESTION IMAGES *****/
function getImageCandidates(pkmName, regionKey, specificImage) {
    if (specificImage) return [`${ROOT}${specificImage.replace(/^\.?\//, '')}`];
    
    const n = norm(pkmName);
    const cleanName = n.replace(/[^a-z0-9]/g, '');
    
    const files = [
        `${pkmName}.png`, 
        `${pkmName.toLowerCase()}.png`,
        `${cleanName}.png`,
        `${n.replace(/\s+/g, '-')}.png`,
        `${n.replace(/\s+/g, '_')}.png`
    ];
    
    const paths = [];
    CONFIG.spritePaths.forEach(base => {
        files.forEach(f => {
            paths.push(`${base}${f}`);
            if(regionKey) {
                 paths.push(`${base}${regionKey}/${f}`);
                 paths.push(`${base}${norm(regionKey)}/${f}`);
            }
        });
    });
    return [...new Set(paths)];
}

function handleImageError(img) {
    const srcs = JSON.parse(decodeURIComponent(img.dataset.srcs || '[]'));
    let idx = parseInt(img.dataset.idx || '0', 10) + 1;
    if (idx < srcs.length) {
        img.dataset.idx = idx;
        img.src = srcs[idx];
    } else {
        img.style.opacity = 0.3; 
        img.alt = "Introuvable";
    }
}

/***** 6. RENDU HTML *****/
function renderBadges(types) {
    return (types || []).map(t => `<span class="badge type-${norm(t)}">${t}</span>`).join(' ');
}

function linkMove(m) {
    const id = norm(m).replace(/\s+/g, '_');
    return `<a href="${ROOT}Pages/Attaques/toutes.html#${encodeURIComponent(id)}" class="move-link">${m}</a>`;
}

function formatEvoText(text, region) {
    if (!text) return 'Pas d\'évolution connue';
    return text.replace(/\b([A-ZÀ-Ö][a-zà-öéèêëîïôûü]+)\b/g, (match) => {
        const ignore = ['Le', 'La', 'Au', 'Avec', 'En', 'Par', 'Une', 'Les', 'Pour', 'Sans', 'De', 'Du', 'Des', 'Pierre', 'Niveau', 'Bonheur', 'Jour', 'Nuit', 'Matin', 'Soir'];
        if (ignore.includes(match)) return match;
        return `<a href="${ROOT}pokemon.html?r=${encodeURIComponent(region)}&n=${match}" class="evo-link">${match}</a>`;
    });
}

/***** 7. INITIALISATION *****/

// --- PAGE LISTE (POKEDEX) ---
async function initIndex() {
    const grid = $('.grid');
    if (!grid) return;

    const urlParam = new URL(location.href).searchParams.get('r');
    const filename = location.pathname.split('/').pop();
    const regionMatch = filename.match(/Pokedex_([^\.]+)/i);
    
    let regionName = urlParam || (regionMatch ? regionMatch[1] : CONFIG.defaultRegion);
    regionName = decodeURIComponent(regionName).replace(/_/g, ' '); 

    // Construction simple du nom de fichier : "pokedex_" + nom de région nettoyé (espaces -> _)
    const slug = norm(regionName).replace(/\s+/g, '_');
    const jsonFile = `pokedex_${slug}.json`;

    const data = await loadJSON(jsonFile);

    if (!data) {
        grid.innerHTML = `<div class="card" style="color:#ff5959; padding:20px; text-align:center;">
            <h3>Données introuvables</h3>
            <p>Impossible de charger : <b>data/${jsonFile}</b></p>
        </div>`;
        return;
    }

    $('#status').textContent = `${data.length} Pokémon`;

    const render = (list) => {
        grid.innerHTML = list.map(p => {
            const candidates = getImageCandidates(p.name, slug, p.image);
            const linkUrl = `${ROOT}pokemon.html?r=${encodeURIComponent(regionName)}&n=${encodeURIComponent(p.name)}`;
            
            return `
            <article class="card pkm-card">
                <div class="cardRow">
                    <div class="thumb-wrapper">
                        <img class="thumb pokeimg" src="${candidates[0]}" alt="${p.name}" 
                             data-srcs="${encodeURIComponent(JSON.stringify(candidates))}" 
                             onerror="handleImageError(this)" loading="lazy">
                    </div>
                    <div class="cardBody">
                        <h2 class="h2" style="margin-bottom:5px;"><a href="${linkUrl}">${p.name}</a></h2>
                        <div class="types">${renderBadges(p.types)}</div>
                        <div class="small evo-text" style="margin-top:5px; opacity:0.8;">${formatEvoText(p.evolution, regionName)}</div>
                        <a href="${linkUrl}" class="btn-small" style="margin-top:10px;">Voir fiche</a>
                    </div>
                </div>
            </article>`;
        }).join('');
    };

    render(data);
    const searchInput = $('#q');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const term = norm(e.target.value);
            render(data.filter(p => norm(p.name).includes(term) || (p.types && norm(p.types.join(' ')).includes(term))));
        }, 200));
    }
}

// --- PAGE DÉTAIL ---
async function initPokemon() {
    const url = new URL(location.href);
    const regionName = url.searchParams.get('r') || CONFIG.defaultRegion;
    const pkmName = url.searchParams.get('n');

    if (!pkmName) return $('.container').innerHTML = `<div class="card"><h1>Erreur</h1><p>Nom manquant.</p></div>`;

    // Même logique de nommage simple
    const slug = norm(regionName).replace(/\s+/g, '_');
    const jsonFile = `pokedex_${slug}.json`;
    
    const data = await loadJSON(jsonFile);
    const p = data ? data.find(x => norm(x.name) === norm(pkmName)) : null;

    if (!p) return $('.container').innerHTML = `<div class="card"><h1>Introuvable</h1><p>${pkmName} dans ${regionName}</p></div>`;

    document.title = `${p.name} - ${CONFIG.baseTitle}`;
    
    const setText = (id, txt) => { const el = $(id); if(el) el.textContent = txt; };
    const setHTML = (id, htm) => { const el = $(id); if(el) el.innerHTML = htm; };

    setText('#pokename', p.name);
    setHTML('#types', renderBadges(p.types));
    setHTML('#pokedex', p.pokedex || "Pas de description.");
    setHTML('#evo', formatEvoText(p.evolution, regionName));

    const img = $('#sprite');
    if(img) {
        const candidates = getImageCandidates(p.name, slug, p.image);
        img.dataset.srcs = encodeURIComponent(JSON.stringify(candidates));
        img.onerror = function() { handleImageError(this); };
        img.src = candidates[0];
    }

    setHTML('#habil', (p.abilities || []).map(linkMove).join(', ') || '-');
    setHTML('#habhid', p.hidden_ability ? linkMove(p.hidden_ability) : '-');

    if($('#objres')) {
        let html = '';
        if (p.held_items && Object.keys(p.held_items).length > 0) {
            html += '<div style="margin-bottom:10px;"><span class="meta-label">Objets tenus</span><ul style="font-size:0.9rem; margin-left:15px; list-style:disc;">';
            if(p.held_items.common && p.held_items.common !== "Aucun") html += `<li>Commun : ${p.held_items.common}</li>`;
            if(p.held_items.uncommon && p.held_items.uncommon !== "Aucun") html += `<li>Peu commun : ${p.held_items.uncommon}</li>`;
            if(p.held_items.rare && p.held_items.rare !== "Aucun") html += `<li>Rare : ${p.held_items.rare}</li>`;
            html += '</ul></div>';
        }
        if(p.resource) html += `<div><span class="meta-label">Ressource</span><div class="meta-value">${p.resource}</div></div>`;
        setHTML('#objres', html || '<span class="meta-value">-</span>');
    }

    const makeList = (arr) => (!arr || !arr.length) ? '<li><span style="opacity:0.5;">Aucune</span></li>' : arr.map(m => `<li>${linkMove(m)}</li>`).join('');

    if($('#lvl')) {
        const moves = (p.level_up || []).sort((a,b) => a.level - b.level);
        setHTML('#lvl', moves.length ? moves.map(m => `<li><span class="lvl-num">${String(m.level).padStart(2, '0')}</span> ${linkMove(m.move)}</li>`).join('') : '<li>Aucune</li>');
    }
    
    const fillList = (id, data) => { const el = $(id); if(el) el.innerHTML = `<ul>${makeList(data)}</ul>`; };
    fillList('#eggs', p.egg_moves);
    fillList('#cs', p.cs);
    fillList('#ct', p.ct);
    fillList('#dt', p.dt);
}

document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('pokemon.html')) initPokemon();
    else if (path.includes('pokedex_')) initIndex(); 
    else if (path.includes('toutes.html') && typeof initMoves !== 'undefined') initMoves();
});
