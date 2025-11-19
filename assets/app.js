/* ---------- app.js Optimisé ---------- */

/***** CONFIGURATION *****/
const CONFIG = {
    baseTitle: "Pokémon Destination",
    spritePaths: ['/assets/pkm/', '/assets/pkm2/'],
    defaultRegion: 'Johto'
};

/***** UTILS *****/
const $ = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => el.querySelectorAll(q);
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Détection automatique du chemin de base (GitHub Pages ou local)
const getBaseUrl = () => {
    const path = location.pathname;
    // Cherche le nom du repo dans l'URL ou utilise racine
    const m = path.match(/^(.*\/Pok-mon[^/]*)(?:\/|$)/i); 
    return m ? m[1] : '';
};
const BASE_URL = getBaseUrl();

const withBase = (p) => {
    if (!p || /^https?:\/\//i.test(p)) return p;
    return (p.startsWith('/') ? BASE_URL : '') + p;
};

// Fetch générique avec gestion d'erreur
async function loadJSON(url) {
    const target = withBase(url.startsWith('/') ? url : '/' + url);
    try {
        const r = await fetch(target);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
    } catch (e) {
        console.error("Erreur chargement JSON:", url, e);
        return null;
    }
}

// Debounce pour la recherche (évite de laguer quand on tape vite)
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/***** GESTION DES SPRITES *****/
// Génère les chemins possibles pour une image
function getImageCandidates(pkmName, regionKey, specificImage) {
    if (specificImage) return [withBase('/' + specificImage.replace(/^\/+/, ''))];
    
    const cleanName = norm(pkmName).replace(/[^a-z0-9]/g, ''); // ex: "mrmime"
    const files = [
        cleanName + '.png',
        cleanName.replace(/_/g, '-') + '.png', // Support tirets
        pkmName.toLowerCase() + '.png' // Support nom original
    ];

    const paths = [];
    CONFIG.spritePaths.forEach(base => {
        files.forEach(f => {
            paths.push(withBase(base + f));
            if(regionKey) paths.push(withBase(base + regionKey + '/' + f));
        });
    });
    
    return [...new Set(paths)]; // Retire les doublons
}

// Gère le fallback d'image (si la 1ere ne charge pas, tente la 2eme...)
function handleImageError(img) {
    const srcs = JSON.parse(decodeURIComponent(img.dataset.srcs || '[]'));
    let idx = parseInt(img.dataset.idx || '0', 10) + 1;
    
    if (idx < srcs.length) {
        img.dataset.idx = idx;
        img.src = srcs[idx];
    } else {
        // Image par défaut si aucune n'est trouvée (optionnel)
        img.style.opacity = 0.3; 
        img.alt = "Image introuvable";
    }
}

/***** RENDU HTML (TEMPLATES) *****/

function renderBadges(types) {
    return (types || []).map(t => `<span class="badge type-${norm(t)}">${t}</span>`).join(' ');
}

function renderPokedexCard(p, region) {
    const rk = norm(region).replace(/\s/g, '_');
    const candidates = getImageCandidates(p.name, rk, p.image);
    const dataSrcs = encodeURIComponent(JSON.stringify(candidates));
    const link = `pokemon.html?r=${encodeURIComponent(region)}&n=${encodeURIComponent(p.name)}`;

    return `
    <article class="card pkm-card">
        <div class="cardRow">
            <div class="thumb-wrapper">
                <img class="thumb pokeimg" 
                     src="${candidates[0]}" 
                     alt="${p.name}" 
                     data-srcs="${dataSrcs}" 
                     data-idx="0" 
                     loading="lazy"
                     onerror="handleImageError(this)">
            </div>
            <div class="cardBody">
                <h2 class="h2"><a href="${link}">${p.name}</a></h2>
                <div class="types">${renderBadges(p.types)}</div>
                <div class="small evo-text">${formatEvoText(p.evolution, region)}</div>
                <a href="${link}" class="btn-small">Voir fiche</a>
            </div>
        </div>
    </article>`;
}

function formatEvoText(text, region) {
    if (!text) return '';
    // Rend les noms de Pokémon cliquables dans le texte d'évolution
    return text.replace(/([A-ZÀ-Ö][a-zà-ö]+)/g, (match) => {
        // Ignore les mots de liaison courants si ils commencent par une majuscule par erreur
        if(['Le', 'La', 'Au', 'Avec'].includes(match)) return match;
        return `<a href="pokemon.html?r=${encodeURIComponent(region)}&n=${match}" class="evo-link">${match}</a>`;
    });
}

/***** INITIALISATION DES PAGES *****/

// Page LISTE (Pokedex_Region.html)
async function initIndex() {
    const grid = $('.grid');
    if (!grid) return;

    // Récupère la région depuis l'URL ou le nom du fichier
    const urlParam = new URL(location.href).searchParams.get('r');
    const filename = location.pathname.split('/').pop();
    const regionMatch = filename.match(/Pokedex_([^\.]+)/i);
    
    let region = urlParam || (regionMatch ? regionMatch[1] : CONFIG.defaultRegion);
    // Gestion des espaces dans les noms de fichiers (ex: Ile_Carmonte -> Ile Carmonte)
    region = region.replace(/_/g, ' '); 

    const dataPath = `/data/pokedex_${norm(region).replace(/\s/g, '_')}.json`;
    const data = await loadJSON(dataPath);

    if (!data) {
        grid.innerHTML = `<div class="error">Impossible de charger les données pour : ${region}</div>`;
        return;
    }

    $('#status').textContent = `${data.length} Pokémon dans ${decodeURIComponent(region)}`;

    // Fonction de rendu optimisée
    const render = (list) => {
        // Utilise un fragment pour meilleure performance
        const fragment = document.createRange().createContextualFragment(
            list.map(p => renderPokedexCard(p, region)).join('')
        );
        grid.innerHTML = '';
        grid.appendChild(fragment);
    };

    // Affichage initial
    render(data);

    // Recherche avec Debounce
    const searchInput = $('#q');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const term = norm(e.target.value);
            const filtered = data.filter(p => 
                norm(p.name).includes(term) || 
                (p.types && norm(p.types.join(' ')).includes(term))
            );
            render(filtered);
        }, 250)); // Attend 250ms après la frappe
    }
}

// Page FICHE DÉTAIL (pokemon.html)
async function initPokemon() {
    const url = new URL(location.href);
    const region = url.searchParams.get('r') || CONFIG.defaultRegion;
    const name = url.searchParams.get('n');

    if (!name) return; // Gérer erreur ou redirection

    const dataPath = `/data/pokedex_${norm(region).replace(/\s/g, '_')}.json`;
    const data = await loadJSON(dataPath);
    
    // Recherche insensible à la casse/accents
    const p = data.find(x => norm(x.name) === norm(name));

    if (!p) {
        $('.container').innerHTML = `<h1>Pokémon introuvable</h1><p>Impossible de trouver ${name} dans ${region}.</p>`;
        return;
    }

    // Remplissage du DOM
    document.title = `${p.name} - ${CONFIG.baseTitle}`;
    $('#pokename').textContent = p.name;
    $('#types').innerHTML = renderBadges(p.types);
    $('#pokedex').textContent = p.pokedex || "Pas de description.";
    
    // Gestion Image Principale
    const img = $('#sprite');
    const rk = norm(region).replace(/\s/g, '_');
    const candidates = getImageCandidates(p.name, rk, p.image);
    img.dataset.srcs = encodeURIComponent(JSON.stringify(candidates));
    img.onerror = function() { handleImageError(this); };
    img.src = candidates[0];

    // Stats / Evolutions / Attaques...
    // (J'ai simplifié ici, tu peux remettre tes logiques spécifiques pour les attaques)
    if($('#evo')) $('#evo').innerHTML = formatEvoText(p.evolution || "Pas d'évolution connue", region);

    // Exemple remplissage simple pour les objets
    if(p.held_items && $('#objres')) {
        let html = '<ul class="list-group">';
        for(const [rarity, item] of Object.entries(p.held_items)) {
            if(item && item !== "Aucun") html += `<li><span class="rarity">${rarity}:</span> ${item}</li>`;
        }
        html += '</ul>';
        $('#objres').innerHTML = html;
    }
}

/***** AUTO-START *****/
document.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.split('/').pop().toLowerCase();
    
    if (page.includes('pokemon.html')) initPokemon();
    else if (page.includes('pokedex') || page === 'index.html') initIndex(); // Index.html ne charge rien par défaut mais on sait jamais
    else if (page.includes('toutes.html')) {
        // Si tu utilises initMoves, assure-toi de l'inclure ou de l'importer
        if(typeof initMoves !== 'undefined') initMoves(); 
    }
});
