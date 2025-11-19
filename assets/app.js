/* ---------- app.js (CORRECTION IMAGES & LIENS) ---------- */

/***** CONFIGURATION *****/
const CONFIG = {
    baseTitle: "Pokémon Destination",
    // NOTE : On utilise des chemins relatifs (pas de "/" au début) pour que ça marche en local
    spritePaths: ['assets/pkm/', 'assets/pkm2/'],
    defaultRegion: 'Johto'
};

/***** UTILS *****/
const $ = (q, el = document) => el.querySelector(q);
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Détection intelligente du chemin de base
const BASE_URL = (() => {
    // Si on est sur GitHub Pages ou dans un sous-dossier
    const m = location.pathname.match(/^(.*\/Pok-mon[^/]*)(?:\/|$)/i);
    return m ? m[1] + '/' : '';
})();

// Fonction pour nettoyer et préfixer les URLs
const withBase = (p) => {
    if (!p || /^https?:\/\//i.test(p)) return p;
    
    // Si le chemin commence par /, on l'enlève pour concaténer proprement
    const cleanP = p.startsWith('/') ? p.slice(1) : p;
    
    // Si BASE_URL est vide, on renvoie le chemin tel quel (relatif)
    // Sinon on préfixe
    return BASE_URL ? BASE_URL + cleanP : cleanP;
};

// Chargement JSON
async function loadJSON(url) {
    // On s'assure que l'URL est correcte par rapport à la racine
    const target = withBase(url);
    try {
        const r = await fetch(target);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return await r.json();
    } catch (e) {
        console.error("Erreur JSON:", target, e);
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

/***** IMAGES & SPRITES (C'est ici que ça coinçait !) *****/
function getImageCandidates(pkmName, regionKey, specificImage) {
    // Si une image spécifique est définie dans le JSON
    if (specificImage) return [withBase(specificImage)];
    
    const cleanName = norm(pkmName).replace(/[^a-z0-9]/g, ''); // ex: "mrmime"
    const files = [
        cleanName + '.png',                 // ex: mrmime.png
        cleanName.replace(/_/g, '-') + '.png', // ex: mr-mime.png
        pkmName.toLowerCase() + '.png'      // ex: M. Mime.png (avec espaces/accents)
    ];
    
    const paths = [];
    
    // On génère les chemins pour assets/pkm/ et assets/pkm2/
    CONFIG.spritePaths.forEach(folder => {
        files.forEach(f => {
            // On construit le chemin : assets/pkm/nom.png
            // Note : on utilise withBase pour ajouter le préfixe du repo si besoin
            paths.push(withBase(folder + f));
            
            // On tente aussi dans le sous-dossier de région si fourni (ex: assets/pkm/alola/nom.png)
            if (regionKey) {
                paths.push(withBase(folder + regionKey + '/' + f));
            }
        });
    });

    return [...new Set(paths)];
}

// Gestionnaire d'erreur d'image (Fallback)
function handleImageError(img) {
    const srcs = JSON.parse(decodeURIComponent(img.dataset.srcs || '[]'));
    let idx = parseInt(img.dataset.idx || '0', 10) + 1;
    
    if (idx < srcs.length) {
        // On essaie le candidat suivant
        img.dataset.idx = idx;
        img.src = srcs[idx];
    } else {
        // Plus d'image dispo
        img.style.opacity = 0.3; 
        img.alt = "Image introuvable";
        // Optionnel : mettre une image "Point d'interrogation" par défaut
        // img.src = withBase('assets/icone/unknown.png');
    }
}

/***** RENDU HTML *****/
function renderBadges(types) {
    return (types || []).map(t => `<span class="badge type-${norm(t)}">${t}</span>`).join(' ');
}

function linkMove(m) {
    const id = norm(m).replace(/\s+/g, '_');
    // Lien vers la page des attaques (chemin corrigé)
    return `<a href="${withBase('Pages/Attaques/toutes.html')}#${encodeURIComponent(id)}" class="move-link">${m}</a>`;
}

function formatEvoText(text, region) {
    if (!text) return 'Pas d\'évolution connue';
    return text.replace(/([A-ZÀ-Ö][a-zà-ö]+)/g, (match) => {
        if(['Le', 'La', 'Au', 'Avec', 'En', 'Par', 'Une', 'Les', 'Pour', 'Sans'].includes(match)) return match;
        const url = withBase(`pokemon.html?r=${encodeURIComponent(region)}&n=${match}`);
        return `<a href="${url}" class="evo-link">${match}</a>`;
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
    // Nettoyage du nom de région (ex: Ile_Carmonte -> Ile Carmonte)
    region = decodeURIComponent(region).replace(/_/g, ' '); 

    // Chargement du JSON de la région
    // Note : on cherche dans data/pokedex_region.json
    const jsonFile = `data/pokedex_${norm(region).replace(/\s/g, '_')}.json`;
    const data = await loadJSON(jsonFile);

    if (!data) {
        grid.innerHTML = `<div class="error">Données introuvables pour la région : ${region}<br><small>Vérifiez que le fichier <b>${jsonFile}</b> existe.</small></div>`;
        return;
    }

    $('#status').textContent = `${data.length} Pokémon`;

    const render = (list) => {
        grid.innerHTML = list.map(p => {
            const rk = norm(region).replace(/\s/g, '_');
            const candidates = getImageCandidates(p.name, rk, p.image);
            
            // Lien vers la fiche détail
            const linkUrl = withBase(`pokemon.html?r=${encodeURIComponent(region)}&n=${encodeURIComponent(p.name)}`);
            
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

    if (!name) {
        $('.container').innerHTML = `<div class="card"><h1>Erreur</h1><p>Aucun Pokémon spécifié.</p></div>`;
        return;
    }

    const jsonFile = `data/pokedex_${norm(region).replace(/\s/g, '_')}.json`;
    const data = await loadJSON(jsonFile);
    
    // Recherche du Pokémon (insensible à la casse/accents)
    const p = data ? data.find(x => norm(x.name) === norm(name)) : null;

    if (!p) {
        $('.container').innerHTML = `<div class="card"><h1>Pokémon introuvable</h1><p>Impossible de trouver <b>${name}</b> dans ${region}.</p></div>`;
        return;
    }

    // 1. Remplissage Infos
    document.title = `${p.name} - ${CONFIG.baseTitle}`;
    $('#pokename').textContent = p.name;
    $('#types').innerHTML = renderBadges(p.types);
    
    if($('#pokedex')) $('#pokedex').textContent = p.pokedex || "Aucune description disponible.";
    if($('#evo')) $('#evo').innerHTML = formatEvoText(p.evolution, region);

    // 2
