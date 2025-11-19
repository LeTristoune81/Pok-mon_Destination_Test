/* ---------- app.js (FINAL & OPTIMISÉ - CORRECTION LIENS) ---------- */

/***** CONFIGURATION *****/
const CONFIG = {
    baseTitle: "Pokémon Destination",
    spritePaths: ['/assets/pkm/', '/assets/pkm2/'],
    defaultRegion: 'Johto'
};

/***** UTILS *****/
const $ = (q, el = document) => el.querySelector(q);
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Détection du chemin de base pour GitHub Pages ou local
const BASE_URL = (() => {
    const m = location.pathname.match(/^(.*\/Pok-mon[^/]*)(?:\/|$)/i);
    return m ? m[1] : '';
})();

const withBase = (p) => {
    if (!p || /^https?:\/\//i.test(p)) return p;
    return (p.startsWith('/') ? BASE_URL : '') + p;
};

// Chargement JSON robuste
async function loadJSON(url) {
    const target = withBase(url.startsWith('/') ? url : '/' + url);
    try {
        const r = await fetch(target);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
    } catch (e) {
        console.error("Erreur JSON:", url, e);
        return null;
    }
}

// Anti-lag pour la recherche
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/***** IMAGES & SPRITES *****/
function getImageCandidates(pkmName, regionKey, specificImage) {
    if (specificImage) return [withBase('/' + specificImage.replace(/^\/+/, ''))];
    
    const cleanName = norm(pkmName).replace(/[^a-z0-9]/g, '');
    const files = [
        cleanName + '.png',
        cleanName.replace(/_/g, '-') + '.png',
        pkmName.toLowerCase() + '.png'
    ];
    
    const paths = [];
    CONFIG.spritePaths.forEach(base => {
        files.forEach(f => {
            paths.push(withBase(base + f));
            if(regionKey) paths.push(withBase(base + regionKey + '/' + f));
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
        img.alt = "Image introuvable";
    }
}

/***** RENDU HTML *****/
function renderBadges(types) {
    return (types || []).map(t => `<span class="badge type-${norm(t)}">${t}</span>`).join(' ');
}

function linkMove(m) {
    const id = norm(m).replace(/\s+/g, '_');
    return `<a href="${withBase('/Pages/Attaques/toutes.html')}#${encodeURIComponent(id)}" class="move-link">${m}</a>`;
}

function formatEvoText(text, region) {
    if (!text) return 'Pas d\'évolution connue';
    return text.replace(/([A-ZÀ-Ö][a-zà-ö]+)/g, (match) => {
        if(['Le', 'La', 'Au', 'Avec', 'En', 'Par', 'Une', 'Les'].includes(match)) return match;
        // CORRECTION : Lien absolu pour l'évolution aussi
        const url = `/pokemon.html?r=${encodeURIComponent(region)}&n=${match}`;
        return `<a href="${withBase(url)}" class="evo-link">${match}</a>`;
    });
}

/***** INITIALISATION *****/

// --- PAGE POKÉDEX (LISTE) ---
async function initIndex() {
    const grid = $('.grid');
    if (!grid) return;

    const urlParam = new URL(location.href).searchParams.get('r');
    const filename = location.pathname.split('/').pop();
    const regionMatch = filename.match(/Pokedex_([^\.]+)/i);
    let region = urlParam || (regionMatch ? regionMatch[1] : CONFIG.defaultRegion);
    region = region.replace(/_/g, ' '); 

    const data = await loadJSON(`/data/pokedex_${norm(region).replace(/\s/g, '_')}.json`);
    if (!data) return grid.innerHTML = `<div class="error">Données introuvables pour ${region}</div>`;

    $('#status').textContent = `${data.length} Pokémon dans ${decodeURIComponent(region)}`;

    const render = (list) => {
        grid.innerHTML = list.map(p => {
            const rk = norm(region).replace(/\s/g, '_');
            const candidates = getImageCandidates(p.name, rk, p.image);
            
            // CORRECTION ICI : On utilise un chemin absolu (/pokemon.html) géré par withBase
            // Cela permet au lien de marcher que l'on soit dans /Pokedex/ ou à la racine
            const linkUrl = withBase(`/pokemon.html?r=${encodeURIComponent(region)}&n=${encodeURIComponent(p.name)}`);
            
            return `
            <article class="card pkm-card">
                <div class="cardRow">
                    <div class="thumb-wrapper">
                        <img class="thumb pokeimg" src="${candidates[0]}" alt="${p.name}" 
                             data-srcs="${encodeURIComponent(JSON.stringify(candidates))}" 
                             onerror="handleImageError(this)" loading="lazy">
                    </div>
                    <div class="cardBody">
                        <h2 class="h2"><a href="${linkUrl}">${p.name}</a></h2>
                        <div class="types">${renderBadges(p.types)}</div>
                        <div class="small evo-text">${formatEvoText(p.evolution, region)}</div>
                        <a href="${linkUrl}" class="btn-small" style="margin-top:8px; display:inline-block;">Voir fiche</a>
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
    if (!name) return;

    const data = await loadJSON(`/data/pokedex_${norm(region).replace(/\s/g, '_')}.json`);
    const p = data ? data.find(x => norm(x.name) === norm(name)) : null;

    if (!p) {
        $('.container').innerHTML = `<div class="card"><h1>Pokémon introuvable</h1></div>`;
        return;
    }

    // 1. Infos de base
    document.title = `${p.name} - ${CONFIG.baseTitle}`;
    $('#pokename').textContent = p.name;
    $('#types').innerHTML = renderBadges(p.types);
    if($('#pokedex')) $('#pokedex').textContent = p.pokedex || "Aucune description disponible.";
    if($('#evo')) $('#evo').innerHTML = formatEvoText(p.evolution, region);

    // 2. Image
    const img = $('#sprite');
    if(img) {
        const rk = norm(region).replace(/\s/g, '_');
        const candidates = getImageCandidates(p.name, rk, p.image);
        img.dataset.srcs = encodeURIComponent(JSON.stringify(candidates));
        img.onerror = function() { handleImageError(this); };
        img.src = candidates[0];
    }

    // 3. Talents
    if($('#habil')) $('#habil').innerHTML = (p.abilities || []).map(linkMove).join(', ') || '?';
    if($('#habhid')) $('#habhid').innerHTML = p.hidden_ability ? linkMove(p.hidden_ability) : 'Aucun';

    // 4. Objets & Ressources
    if($('#objres')) {
        let html = '<div class="lvl-group"><div class="lvl-title">Objets tenus</div><ul>';
        const held = p.held_items || {};
        if(Object.keys(held).length === 0) html += '<li>Aucun</li>';
        else {
            if(held.common) html += `<li>Commun: ${held.common}</li>`;
            if(held.uncommon) html += `<li>Peu commun: ${held.uncommon}</li>`;
            if(held.rare) html += `<li>Rare: ${held.rare}</li>`;
        }
        html += '</ul></div>';
        
        if(p.resource) {
            html += `<div class="lvl-group" style="margin-top:10px"><div class="lvl-title">Ressource</div><ul><li>${p.resource}</li></ul></div>`;
        }
        $('#objres').innerHTML = html;
    }

    // 5. Attaques (Niveau, CT, etc.)
    const makeList = (arr) => {
        if(!arr || !arr.length) return '<li>Aucune</li>';
        return arr.map(m => `<li>${linkMove(m)}</li>`).join('');
    };

    if($('#lvl')) {
        const moves = (p.level_up || []).sort((a,b) => a.level - b.level);
        $('#lvl').innerHTML = moves.length 
            ? moves.map(m => `<li><span class="lvl-num">N.${m.level}</span> ${linkMove(m.move)}</li>`).join('')
            : '<li>Aucune</li>';
    }
    
    const fillList = (id, data) => {
        const el = $(id);
        if(el) el.innerHTML = `<ul class="cols">${makeList(data)}</ul>`;
    };

    fillList('#eggs', p.egg_moves);
    fillList('#cs', p.cs);
    fillList('#ct', p.ct);
    fillList('#dt', p.dt);
}

/***** AUTO-START *****/
document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('pokemon.html')) initPokemon();
    else if (path.includes('pokedex')) initIndex();
    else if (path.includes('toutes.html') && typeof initMoves !== 'undefined') initMoves();
});
