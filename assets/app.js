/* ---------- app.js (VERSION RÉPARATION & DIAGNOSTIC) ---------- */

/***** 1. CALCUL DU CHEMIN RACINE (ROOT) *****/
// Permet de savoir où on est pour remonter à la racine du site
const getRoot = () => {
    const path = window.location.pathname.toLowerCase();
    // Si on est dans un sous-sous-dossier (ex: Pages/Lieux/...)
    if (path.includes('/pages/lieux/') || path.includes('/pages/attaques/')) return '../../';
    // Si on est dans un sous-dossier (ex: Pokedex/...)
    if (path.includes('/pokedex/') || path.includes('/pages/')) return '../';
    // Sinon on est à la racine
    return './';
};

const ROOT = getRoot();
console.log(`[DIAGNOSTIC] Racine détectée : "${ROOT}" (depuis ${window.location.pathname})`);

/***** 2. CONFIGURATION *****/
const CONFIG = {
    baseTitle: "Pokémon Destination",
    // On cherche dans pkm ET pkm2
    spritePaths: [`${ROOT}assets/pkm/`, `${ROOT}assets/pkm2/`], 
    defaultRegion: 'Kanto'
};

/***** 3. UTILITAIRES *****/
const $ = (q, el = document) => el.querySelector(q);
// Normalise le texte (enlève accents, espaces, met en minuscule)
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/***** 4. CHARGEMENT DES DONNÉES (JSON) *****/
async function loadJSON(filename) {
    // Astuce : on enlève les tirets et espaces pour le nom du fichier
    // Ex: "Îles Sévii" devient "ilessevii" pour trouver "pokedex_ilessevii.json"
    const cleanName = norm(filename).replace(/[\s_-]/g, '');
    const url = `${ROOT}data/${cleanName}.json`;
    
    console.log(`[DIAGNOSTIC] Tentative chargement JSON : ${url}`);

    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`);
        return await r.json();
    } catch (e) {
        console.error(`[ERREUR CRITIQUE] Impossible de charger ${url}`, e);
        // On essaie une variante avec tiret bas au cas où (ex: pokedex_kanto.json marche, mais pokedex_ile_carmonte.json ?)
        if (!url.includes('_')) {
             const retryUrl = `${ROOT}data/${filename}.json`;
             console.log(`[DIAGNOSTIC] Nouvelle tentative avec : ${retryUrl}`);
             try {
                 const r2 = await fetch(retryUrl);
                 if(r2.ok) return await r2.json();
             } catch(e2) {}
        }
        return null;
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

/***** 5. GESTION DES IMAGES (Le point sensible) *****/
function getImageCandidates(pkmName, regionKey, specificImage) {
    // 1. Si une image est forcée dans le JSON, on la prend
    if (specificImage) return [`${ROOT}${specificImage.replace(/^\.?\//, '')}`];
    
    const n = norm(pkmName);
    const cleanName = n.replace(/[^a-z0-9]/g, ''); // ex: "mrmime"
    
    // 2. On génère toutes les variantes possibles de noms de fichiers
    const files = [
        `${pkmName}.png`,                  // Nom exact (ex: Bulbizarre.png)
        `${pkmName.toLowerCase()}.png`,    // Minuscule (ex: bulbizarre.png)
        `${cleanName}.png`,                // Sans espace/accent (ex: mrmime.png)
        `${n.replace(/\s+/g, '-')}.png`,   // Avec tirets (ex: mr-mime.png)
        `${n.replace(/\s+/g, '_')}.png`    // Avec underscores (ex: mr_mime.png)
    ];
    
    const paths = [];
    CONFIG.spritePaths.forEach(base => {
        files.forEach(f => {
            paths.push(`${base}${f}`); // Cherche dans assets/pkm/
            // Si on a une région, on cherche aussi dedans (ex: assets/pkm/alola/)
            if(regionKey) {
                 paths.push(`${base}${regionKey}/${f}`);
                 paths.push(`${base}${norm(regionKey)}/${f}`);
            }
        });
    });

    return [...new Set(paths)]; // Enlève les doublons
}

// Si l'image ne charge pas, on tente la suivante
function handleImageError(img) {
    const srcs = JSON.parse(decodeURIComponent(img.dataset.srcs || '[]'));
    let idx = parseInt(img.dataset.idx || '0', 10) + 1;
    
    if (idx < srcs.length) {
        // console.log(`[IMAGE] Échec, essai suivant : ${srcs[idx]}`);
        img.dataset.idx = idx;
        img.src = srcs[idx];
    } else {
        // console.warn(`[IMAGE] Aucune image trouvée pour ${img.alt}`);
        img.style.opacity = 0.3; 
        img.alt = "Image introuvable";
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
    // Regex améliorée pour éviter de casser les phrases
    return text.replace(/\b([A-ZÀ-Ö][a-zà-öéèêëîïôûü]+)\b/g, (match) => {
        // Liste des mots à ignorer (articles, prépositions)
        const ignore = ['Le', 'La', 'Au', 'Avec', 'En', 'Par', 'Une', 'Les', 'Pour', 'Sans', 'De', 'Du', 'Des', 'Pierre', 'Niveau', 'Bonheur', 'Jour', 'Nuit'];
        if (ignore.includes(match)) return match;
        return `<a href="${ROOT}pokemon.html?r=${encodeURIComponent(region)}&n=${match}" class="evo-link">${match}</a>`;
    });
}

/***** 7. INITIALISATION DES PAGES *****/

// --- PAGE POKÉDEX (LISTE) ---
async function initIndex() {
    const grid = $('.grid');
    if (!grid) return;

    const urlParam = new URL(location.href).searchParams.get('r');
    const filename = location.pathname.split('/').pop();
    const regionMatch = filename.match(/Pokedex_([^\.]+)/i);
    
    let regionName = urlParam || (regionMatch ? regionMatch[1] : CONFIG.defaultRegion);
    regionName = decodeURIComponent(regionName).replace(/_/g, ' '); 

    // Nom du fichier JSON (ex: "pokedex_kanto")
    const jsonName = `pokedex_${norm(regionName).replace(/[\s_-]/g, '')}`; 
    const data = await loadJSON(jsonName);

    if (!data) {
        grid.innerHTML = `<div class="card" style="border-left:5px solid red; padding:20px;">
            <h3>⚠️ Problème de données</h3>
            <p>Impossible de trouver le fichier pour la région : <strong>${regionName}</strong></p>
            <p>Le script a cherché : <code>data/${jsonName}.json</code></p>
            <p><small>Conseil : Vérifiez que le fichier JSON existe bien dans le dossier "data" et qu'il ne contient pas d'erreurs.</small></p>
        </div>`;
        return;
    }

    $('#status').textContent = `${data.length} Pokémon`;

    const render = (list) => {
        grid.innerHTML = list.map(p => {
            const rk = norm(regionName).replace(/\s/g, '_');
            const candidates = getImageCandidates(p.name, rk, p.image);
            const linkUrl = `${ROOT}pokemon.html?r=${encodeURIComponent(regionName)}&n=${encodeURIComponent(p.name)}`;
            
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

// --- PAGE FICHE DÉTAIL ---
async function initPokemon() {
    const url = new URL(location.href);
    const regionName = url.searchParams.get('r') || CONFIG.defaultRegion;
    const pkmName = url.searchParams.get('n');

    if (!pkmName) {
        $('.container').innerHTML = `<div class="card"><h1>Erreur</h1><p>Aucun Pokémon spécifié dans l'URL.</p></div>`;
        return;
    }

    const jsonName = `pokedex_${norm(regionName).replace(/[\s_-]/g, '')}`;
    const data = await loadJSON(jsonName);
    
    const p = data ? data.find(x => norm(x.name) === norm(pkmName)) : null;

    if (!p) {
        $('.container').innerHTML = `<div class="card">
            <h1>Pokémon introuvable</h1>
            <p>Impossible de trouver <b>${pkmName}</b> dans le fichier <code>${jsonName}.json</code>.</p>
        </div>`;
        return;
    }

    document.title = `${p.name} - ${CONFIG.baseTitle}`;
    
    // Remplissage Textes
    const setText = (id, txt) => { const el = $(id); if(el) el.textContent = txt; };
    const setHTML = (id, htm) => { const el = $(id); if(el) el.innerHTML = htm; };

    setText('#pokename', p.name);
    setHTML('#types', renderBadges(p.types));
    setHTML('#pokedex', p.pokedex || "Aucune description disponible.");
    setHTML('#evo', formatEvoText(p.evolution, regionName));

    // Remplissage Image
    const img = $('#sprite');
    if(img) {
        const rk = norm(regionName).replace(/\s/g, '_');
        const candidates = getImageCandidates(p.name, rk, p.image);
        
        img.dataset.srcs = encodeURIComponent(JSON.stringify(candidates));
        img.onerror = function() { handleImageError(this); };
        img.src = candidates[0];
    }

    // Talents & Méta
    setHTML('#habil', (p.abilities || []).map(linkMove).join(', ') || '-');
    setHTML('#habhid', p.hidden_ability ? linkMove(p.hidden_ability) : '-');

    // Objets & Ressources
    if($('#objres')) {
        let html = '';
        if (p.held_items && Object.keys(p.held_items).length > 0) {
            html += '<div style="margin-bottom:10px;"><span class="meta-label">Objets tenus</span><ul style="font-size:0.9rem; margin-left:15px; list-style:disc;">';
            // Affiche seulement si ce n'est pas "Aucun"
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

    // Listes d'attaques
    const makeList = (arr) => {
        if(!arr || !arr.length) return '<li><span style="opacity:0.5; font-size:0.85rem;">Aucune</span></li>';
        return arr.map(m => `<li>${linkMove(m)}</li>`).join('');
    };

    // Niveaux
    if($('#lvl')) {
        const moves = (p.level_up || []).sort((a,b) => a.level - b.level);
        setHTML('#lvl', moves.length 
            ? moves.map(m => `<li><span class="lvl-num">${String(m.level).padStart(2, '0')}</span> ${linkMove(m.move)}</li>`).join('')
            : '<li>Aucune</li>');
    }
    
    // Autres (remplit les DIV avec des UL)
    const fillList = (id, data) => {
        const el = $(id);
        if(el) el.innerHTML = `<ul>${makeList(data)}</ul>`;
    };

    fillList('#eggs', p.egg_moves);
    fillList('#cs', p.cs);
    fillList('#ct', p.ct);
    fillList('#dt', p.dt);
}

/***** 8. DÉMARRAGE *****/
document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname.toLowerCase();
    
    if (path.includes('pokemon.html')) initPokemon();
    else if (path.includes('pokedex_')) initIndex(); 
    else if (path.includes('toutes.html') && typeof initMoves !== 'undefined') initMoves();
});
