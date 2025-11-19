/* ---------- app.js (VERSION CORRIGÉE "CHEMINS ABSOLUS") ---------- */

/***** 1. DÉTECTION INTELLIGENTE DE LA RACINE *****/
// Cette fonction trouve le chemin pour remonter à la racine du site
// peu importe où l'on se trouve (Pokedex/, Pages/Lieux/, etc.)
const getRoot = () => {
    const path = window.location.pathname;
    
    // Si on est dans "Pages/Lieux" ou "Pages/Attaques" (2 niveaux)
    if (path.includes('/Pages/Lieux/') || path.includes('/Pages/Attaques/')) return '../../';
    
    // Si on est dans "Pokedex" ou "Pages" (1 niveau)
    if (path.includes('/Pokedex/') || path.includes('/Pages/')) return '../';
    
    // Sinon on est à la racine
    return './';
};

const ROOT = getRoot();

/***** 2. CONFIGURATION *****/
const CONFIG = {
    baseTitle: "Pokémon Destination",
    // On utilise ROOT pour que les chemins soient toujours justes
    spritePaths: [`${ROOT}assets/pkm/`, `${ROOT}assets/pkm2/`],
    defaultRegion: 'Kanto'
};

/***** 3. UTILS *****/
const $ = (q, el = document) => el.querySelector(q);
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Charge un JSON en partant toujours de la racine
async function loadJSON(relativePath) {
    // Nettoie le chemin si il commence par / ou ./
    const cleanPath = relativePath.replace(/^\.?\//, '');
    const url = `${ROOT}${cleanPath}`;
    
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
    } catch (e) {
        console.error(`Erreur chargement ${url}:`, e);
        return null;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/***** 4. GESTION IMAGES (SPRITES) *****/
function getImageCandidates(pkmName, regionKey, specificImage) {
    if (specificImage) return [`${ROOT}${specificImage.replace(/^\//, '')}`];
    
    const cleanName = norm(pkmName).replace(/[^a-z0-9]/g, '');
    const files = [
        `${cleanName}.png`,
        `${cleanName.replace(/_/g, '-')}.png`,
        `${pkmName.toLowerCase()}.png`
    ];
    
    const paths = [];
    CONFIG.spritePaths.forEach(base => {
        files.forEach(f => {
            paths.push(`${base}${f}`);
            if(regionKey) paths.push(`${base}${regionKey}/${f}`);
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

/***** 5. RENDU HTML *****/
function renderBadges(types) {
    return (types || []).map(t => `<span class="badge type-${norm(t)}">${t}</span>`).join(' ');
}

function linkMove(m) {
    const id = norm(m).replace(/\s+/g, '_');
    return `<a href="${ROOT}Pages/Attaques/toutes.html#${encodeURIComponent(id)}" class="move-link">${m}</a>`;
}

function formatEvoText(text, region) {
    if (!text) return 'Pas d\'évolution connue';
    return text.replace(/([A-ZÀ-Ö][a-zà-ö]+)/g, (match) => {
        if(['Le', 'La', 'Au', 'Avec', 'En', 'Par', 'Une', 'Les', 'Pour', 'Sans'].includes(match)) return match;
        // Lien corrigé vers la racine
        return `<a href="${ROOT}pokemon.html?r=${encodeURIComponent(region)}&n=${match}" class="evo-link">${match}</a>`;
    });
}

/***** 6. INITIALISATION *****/

// --- PAGE POKÉDEX (LISTE) ---
async function initIndex() {
    const grid = $('.grid');
    if (!grid) return;

    const urlParam = new URL(location.href).searchParams.get('r');
    
    // Détection de la région via le nom du fichier (ex: Pokedex_Kanto.html)
    const filename = location.pathname.split('/').pop();
    const regionMatch = filename.match(/Pokedex_([^\.]+)/i);
    
    let region = urlParam || (regionMatch ? regionMatch[1] : CONFIG.defaultRegion);
    region = decodeURIComponent(region).replace(/_/g, ' '); 

    // Chargement des données
    const jsonFile = `data/pokedex_${norm(region).replace(/\s/g, '_')}.json`;
    const data = await loadJSON(jsonFile);

    if (!data) {
        grid.innerHTML = `<div class="card" style="color:#ff5959; padding:20px; text-align:center;">
            <h2>Données introuvables</h2>
            <p>Impossible de charger le fichier : <b>${jsonFile}</b></p>
            <p>Vérifiez que le fichier existe dans le dossier /data/.</p>
        </div>`;
        return;
    }

    const statusEl = $('#status');
    if(statusEl) statusEl.textContent = `${data.length} Pokémon`;

    const render = (list) => {
        grid.innerHTML = list.map(p => {
            const rk = norm(region).replace(/\s/g, '_');
            const candidates = getImageCandidates(p.name, rk, p.image);
            const linkUrl = `${ROOT}pokemon.html?r=${encodeURIComponent(region)}&n=${encodeURIComponent(p.name)}`;
            
            return `
            <article class="card pkm-card">
                <div class="cardRow">
                    <div class="thumb-wrapper">
                        <img class="thumb pokeimg" 
                             src="${candidates[0]}" 
                             alt="${p.name}" 
                             data-srcs="${encodeURIComponent(JSON.stringify(candidates))}" 
                             onerror="handleImageError(this)" 
                             loading="lazy">
                    </div>
                    <div class="cardBody">
                        <h2 class="h2" style="margin-bottom:5px;"><a href="${linkUrl}">${p.name}</a></h2>
                        <div class="types">${renderBadges(p.types)}</div>
                        <div class="small evo-text" style="margin-top:5px; opacity:0.8;">${formatEvoText(p.evolution, region)}</div>
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

// --- PAGE FICHE DÉTAIL ---
async function initPokemon() {
    const url = new URL(location.href);
    const region = url.searchParams.get('r') || CONFIG.defaultRegion;
    const name = url.searchParams.get('n');

    if (!name) {
        $('.container').innerHTML = `<div class="card"><h1>Erreur</h1><p>Aucun Pokémon spécifié.</p></div>`;
        return;
    }

    const jsonFile = `data/pokedex_${norm(region).replace(/\s/g, '_')}.json`;
    const data = await loadJSON(jsonFile);
    
    const p = data ? data.find(x => norm(x.name) === norm(name)) : null;

    if (!p) {
        $('.container').innerHTML = `<div class="card"><h1>Introuvable</h1><p>Impossible de trouver <b>${name}</b> dans ${region}.</p></div>`;
        return;
    }

    document.title = `${p.name} - ${CONFIG.baseTitle}`;
    
    // Remplissage
    const setText = (id, txt) => { const el = $(id); if(el) el.textContent = txt; };
    const setHTML = (id, htm) => { const el = $(id); if(el) el.innerHTML = htm; };

    setText('#pokename', p.name);
    setHTML('#types', renderBadges(p.types));
    setHTML('#pokedex', p.pokedex || "Aucune description disponible.");
    setHTML('#evo', formatEvoText(p.evolution, region));

    // Image
    const img = $('#sprite');
    if(img) {
        const rk = norm(region).replace(/\s/g, '_');
        const candidates = getImageCandidates(p.name, rk, p.image);
        img.dataset.srcs = encodeURIComponent(JSON.stringify(candidates));
        img.onerror = function() { handleImageError(this); };
        img.src = candidates[0];
    }

    // Metas
    setHTML('#habil', (p.abilities || []).map(linkMove).join(', ') || '-');
    setHTML('#habhid', p.hidden_ability ? linkMove(p.hidden_ability) : '-');

    // Objets
    if($('#objres')) {
        let html = '';
        if (p.held_items && Object.keys(p.held_items).length > 0) {
            html += '<div style="margin-bottom:10px;"><span class="meta-label">Objets tenus</span><ul style="font-size:0.9rem; margin-left:15px; list-style:disc;">';
            if(p.held_items.common && p.held_items.common !== "Aucun") html += `<li>Commun : ${p.held_items.common}</li>`;
            if(p.held_items.uncommon && p.held_items.uncommon !== "Aucun") html += `<li>Peu commun : ${p.held_items.uncommon}</li>`;
            if(p.held_items.rare && p.held_items.rare !== "Aucun") html += `<li>Rare : ${p.held_items.rare}</li>`;
            html += '</ul></div>';
        }
        if(p.resource) {
            html += `<div><span class="meta-label">Ressource</span><div class="meta-value">${p.resource}</div></div>`;
        }
        setHTML('#objres', html || '<span class="meta-value">-</span>');
    }

    // Attaques
    const makeList = (arr) => {
        if(!arr || !arr.length) return '<li><span style="opacity:0.5">Aucune</span></li>';
        return arr.map(m => `<li>${linkMove(m)}</li>`).join('');
    };

    if($('#lvl')) {
        const moves = (p.level_up || []).sort((a,b) => a.level - b.level);
        setHTML('#lvl', moves.length 
            ? moves.map(m => `<li><span class="lvl-num">${String(m.level).padStart(2, '0')}</span> ${linkMove(m.move)}</li>`).join('')
            : '<li>Aucune</li>');
    }
    
    setHTML('#eggs', `<ul class="cols">${makeList(p.egg_moves)}</ul>`);
    setHTML('#cs', `<ul class="cols">${makeList(p.cs)}</ul>`);
    setHTML('#ct', `<ul class="cols">${makeList(p.ct)}</ul>`);
    setHTML('#dt', `<ul class="cols">${makeList(p.dt)}</ul>`);
}

/***** 7. LANCEMENT *****/
document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname.toLowerCase();
    
    if (path.includes('pokemon.html')) initPokemon();
    else if (path.includes('pokedex_')) initIndex(); 
    else if (path.includes('toutes.html') && typeof initMoves !== 'undefined') initMoves();
});
