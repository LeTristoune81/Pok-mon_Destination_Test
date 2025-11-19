/* ---------- app_lieux.js (CORRIGÉ & FINAL) ---------- */

/***** CONFIGURATION *****/
const CONFIG = {
  baseTitle: "Lieux - Pokémon Destination",
  defaultRegion: "Kanto",
  regionFiles: {
    "Kanto": "lieux_kanto_detail.json",
    "Johto": "lieux_johto_detail.json",
    "Hoenn": "lieux_hoenn_detail.json"
  },
  images: {
    "Kanto": { path: "/assets/Lieux/kanto/", ext: ".png" }
  },
  icons: {
    objets: "/assets/icone/objets_trouvable.png",
    baies: "/assets/icone/baies.png",
    boutique: "/assets/icone/boutique.png",
    arene: "/assets/icone/Boutique_arene.png" // Attention à la majuscule du fichier uploadé
  }
};

/***** UTILS *****/
const $ = (q, el = document) => el.querySelector(q);
const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Auto-détection du chemin de base
const BASE_URL = (() => {
  const m = location.pathname.match(/^(.*\/Pok-mon[^/]*)(?:\/|$)/i);
  return m ? m[1] : '';
})();

const withBase = (p) => {
  if (!p || /^https?:\/\//i.test(p)) return p;
  return (p.startsWith('/') ? BASE_URL : '') + p;
};

async function loadJSON(url) {
  try {
    const r = await fetch(withBase(url));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.error("Erreur JSON:", url, e);
    return null;
  }
}

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

/***** LOGIQUE D'AFFICHAGE *****/

function linkPokemon(name, region) {
  const url = `/pokemon.html?r=${encodeURIComponent(region)}&n=${encodeURIComponent(name)}`;
  return `<a href="${withBase(url)}" class="pd-lieu-pkm-link">${name}</a>`;
}

function renderSection(title, iconKey, contentHTML) {
  if (!contentHTML) return '';
  const iconSrc = CONFIG.icons[iconKey] ? withBase(CONFIG.icons[iconKey]) : '';
  const iconHTML = iconSrc ? `<img src="${iconSrc}" class="pd-section-icon" alt=""> ` : '';
  return `
    <section class="pd-lieu-section">
      <h2>${iconHTML}${title}</h2>
      ${contentHTML}
    </section>`;
}

// Affichage intelligent des items (avec ou sans prix)
function renderItemGrid(items) {
  if (!items || !items.length) return '';
  
  const content = items.map(i => {
    // Si c'est juste une chaîne de caractères (ex: "Potion")
    if (typeof i === 'string') {
      return `
        <div class="shop-line">
          <span class="shop-name-text">${i}</span>
        </div>`;
    } 
    // Si c'est un objet avec prix (ex: {name: "Potion", price: 200})
    else {
      return `
        <div class="shop-line">
          <span class="shop-name-text">${i.name}</span>
          <span class="shop-price-text">${i.price} P$</span>
        </div>`;
    }
  }).join('');

  return `<div class="pd-boutique-grid">${content}</div>`;
}

function renderPokemonList(list, region) {
  if (!list || !list.length) return '';
  const items = list.map(p => {
    const niveau = p.lvl_min === p.lvl_max ? `N.${p.lvl_min}` : `N.${p.lvl_min}-${p.lvl_max}`;
    return `
      <li>
        <span style="display:inline-block; width:40px; font-weight:bold; color:#68b4ff;">${p.rate}%</span>
        ${linkPokemon(p.name, region)}
        <span class="pd-lieu-meta">(${niveau})</span>
      </li>`;
  });
  return `<ul>${items.join('')}</ul>`;
}

function renderSimpleList(list) {
  if (!list || !list.length) return '';
  return `<ul class="pd-tags-wrap">${list.map(i => `<li class="pd-tag">${i}</li>`).join('')}</ul>`;
}

// Affiche les boutiques complexes (catégorisées) avec système "Accordéon"
function renderShopList(shops) {
  if (!shops || !shops.length) return '';
  
  return shops.map(shop => {
    let innerHTML = '';
    
    if (shop.daily) {
       Object.keys(shop.daily).forEach(day => {
           innerHTML += `<div style="margin-top:15px; margin-bottom:5px; font-weight:bold; color:#aaa; border-bottom:1px solid #444;">${day}</div>`;
           innerHTML += renderItemGrid(shop.daily[day]);
       });
    } else {
       innerHTML = renderItemGrid(shop.items);
    }

    // MODIFICATION ICI : J'ai retiré l'attribut 'open' dans la balise <details>
    return `
      <details class="pd-shop-details">
        <summary class="shop-name">
            ${shop.name || 'Boutique'}
            ${shop.description ? `<span style="display:block; font-size:0.85rem; font-weight:normal; color:#9ca3af; margin-top:2px;">${shop.description}</span>` : ''}
        </summary>
        ${innerHTML}
      </details>`;
  }).join('');
}

// --- PAGE 1 : LISTE DES LIEUX ---
async function renderLieuxPage() {
  const container = document.getElementById('lieux-list');
  if (!container) return;

  const regionName = getUrlParam('r') || CONFIG.defaultRegion;
  const fileName = CONFIG.regionFiles[regionName];
  
  const titleEl = document.getElementById('lieux-title');
  if(titleEl) titleEl.textContent = `Lieux de ${regionName}`;
  
  const backLink = document.getElementById('back-region');
  if(backLink) backLink.href = withBase(`/Pages/${norm(regionName)}.html`);

  if (!fileName) return container.innerHTML = `<div style="color:red">Fichier manquant pour ${regionName}</div>`;

  const data = await loadJSON(`/data/Lieux/${fileName}`);
  if (!data) return container.innerHTML = `<div style="color:red">Erreur chargement données</div>`;

  const links = data.map(lieu => {
    const slug = lieu.slug || norm(lieu.name).replace(/\s+/g, '_');
    const url = `/Pages/Lieux/Fiche_Detaille.html?r=${encodeURIComponent(regionName)}&l=${encodeURIComponent(slug)}`;
    return `<li><a href="${withBase(url)}">${lieu.name}</a></li>`;
  });

  container.innerHTML = `<ul>${links.join('')}</ul>`;
}

// --- PAGE 2 : DÉTAIL DU LIEU ---
async function renderLieuPage() {
  const container = document.getElementById('lieu-content');
  if (!container) return;

  const regionName = getUrlParam('r') || CONFIG.defaultRegion;
  const lieuSlug = getUrlParam('l');
  const fileName = CONFIG.regionFiles[regionName];

  const backLink = document.getElementById('back-list');
  if(backLink) backLink.href = withBase(`/Pages/Lieux/Liste_Lieux.html?r=${encodeURIComponent(regionName)}`);

  if (!fileName || !lieuSlug) return;

  const data = await loadJSON(`/data/Lieux/${fileName}`);
  const lieu = data ? data.find(x => x.slug === lieuSlug || norm(x.name).replace(/\s+/g, '_') === lieuSlug) : null;

  if (!lieu) {
    container.innerHTML = "<h2>Lieu introuvable</h2>";
    return;
  }

  document.getElementById('lieu-name').textContent = lieu.name;
  document.title = `${lieu.name} - ${CONFIG.baseTitle}`;

  const imgConfig = CONFIG.images[regionName];
  const imgEl = document.getElementById('lieu-image');
  if (imgConfig && imgEl) {
    const imgSrc = withBase(`${imgConfig.path}${lieu.slug}${imgConfig.ext}`);
    imgEl.src = imgSrc;
    imgEl.onerror = () => { imgEl.style.display = 'none'; };
    imgEl.addEventListener('click', () => openLightbox(imgSrc));
  }

  let html = '';
  
  // Zones spéciales (ex: Parc Safari avec sous-zones)
  if (lieu.zones) {
      lieu.zones.forEach(zone => {
          html += `<h3 style="margin-top:30px; color:#68b4ff; border-bottom:2px solid #68b4ff;">${zone.name}</h3>`;
          // On réutilise la logique pour chaque zone comme si c'était un lieu
          html += generateLieuContent(zone, regionName);
      });
  } else {
      html += generateLieuContent(lieu, regionName);
  }

  container.innerHTML = html;
}

function generateLieuContent(data, region) {
    let html = '';
    const pkmSections = [
      { key: 'sauvage', title: 'Pokémon Sauvages' },
      { key: 'jour', title: 'De Jour' },
      { key: 'nuit', title: 'De Nuit' },
      { key: 'matin', title: 'Matin' },
      { key: 'eau', title: 'Sur l\'eau' },
      { key: 'canne', title: 'Pêche (Canne)' },
      { key: 'super_canne', title: 'Pêche (Super Canne)' },
      { key: 'mega_canne', title: 'Pêche (Méga Canne)' },
      { key: 'cave', title: 'Grotte' },
      { key: 'rocksmash', title: 'Éclate-Roc' },
      { key: 'pokeradar', title: 'Poké Radar' }
    ];
  
    pkmSections.forEach(sec => {
      if(data[sec.key] && data[sec.key].length > 0) {
        html += renderSection(sec.title, null, renderPokemonList(data[sec.key], region));
      }
    });
  
    if(data.objets && data.objets.length) html += renderSection("Objets", "objets", renderSimpleList(data.objets));
    if(data.baies && data.baies.length) html += renderSection("Baies", "baies", renderSimpleList(data.baies));
  
    // Boutiques Simples (Arène / Boutique Standard) -> Utilise renderItemGrid (Grille sans prix si pas dispo)
    if(data.boutique_arene && data.boutique_arene.length) html += renderSection("Boutique d'Arène", "arene", renderItemGrid(data.boutique_arene));
    if(data.boutique && data.boutique.length && Array.isArray(data.boutique) && typeof data.boutique[0] === 'string') {
        html += renderSection("Boutique", "boutique", renderItemGrid(data.boutique));
    }
    
    // Boutiques Complexes (ex: Safrania avec catégories)
    if(data.boutique && data.boutique.length && typeof data.boutique[0] === 'object') {
        html += renderSection("Commerces", "boutique", renderShopList(data.boutique));
    }
    if(data.shops && data.shops.length) html += renderSection("Commerces", "boutique", renderShopList(data.shops));
    if(data.arena_shop && data.arena_shop.length) html += renderSection("Boutique d'Arène", "arene", renderItemGrid(data.arena_shop));

    return html;
}

function openLightbox(src) {
  const box = document.getElementById('lieu-lightbox');
  const img = document.getElementById('lieu-lightbox-img');
  if(box && img) {
    img.src = src;
    box.classList.add('is-visible');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;
  const box = document.getElementById('lieu-lightbox');
  if (box) {
    box.addEventListener('click', (e) => {
      if (e.target === box || e.target.id === 'lieu-lightbox-img') box.classList.remove('is-visible');
    });
  }

  if (path.includes('Liste_Lieux.html')) renderLieuxPage();
  else if (path.includes('Fiche_Detaille.html')) renderLieuPage();
});
