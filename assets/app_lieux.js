/* ---------- app_lieux.js (CORRIGÉ & OPTIMISÉ) ---------- */

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
    arene: "/assets/icone/boutique_arene.png"
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

/***** LOGIQUE *****/

function linkPokemon(name, region) {
  // Lien absolu pour éviter les problèmes de dossier courant
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

function renderArenaShop(items) {
  if (!items || !items.length) return '';
  const content = items.map(i => `<li><strong>${i.name}</strong> : ${i.price} P$</li>`).join('');
  return `<ul>${content}</ul>`;
}

function renderShopList(shops) {
  if (!shops || !shops.length) return '';
  return shops.map(shop => {
    const itemsHTML = (shop.items || []).map(item => `
      <div class="shop-line">
        <strong>${item.name}</strong> 
        <span style="opacity:0.7">— ${item.price} P$</span>
      </div>
    `).join('');
    return `
      <div class="pd-shop-details" style="margin-top:15px;">
        <div class="shop-name" style="margin-bottom:6px; color:#ffd700; font-weight:bold;">${shop.name || 'Boutique'}</div>
        <div class="pd-boutique-grid">${itemsHTML}</div>
      </div>`;
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
  
  // Lien retour absolu vers la page de région
  const backLink = document.getElementById('back-region');
  if(backLink) backLink.href = withBase(`/Pages/${norm(regionName)}.html`);

  if (!fileName) return container.innerHTML = `<div style="color:red">Configuration manquante pour ${regionName}</div>`;

  const data = await loadJSON(`/data/Lieux/${fileName}`);
  if (!data) return container.innerHTML = `<div style="color:red">Erreur chargement données</div>`;

  const links = data.map(lieu => {
    const slug = lieu.slug || norm(lieu.name).replace(/\s+/g, '_');
    // CORRECTION DU LIEN : Utilisation d'un chemin absolu pour éviter l'erreur "Pages/Lieux/Pages/Lieux"
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

  // Lien retour absolu vers la liste
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
  
  // Génération des sections
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
    if(lieu[sec.key] && lieu[sec.key].length > 0) {
      html += renderSection(sec.title, null, renderPokemonList(lieu[sec.key], regionName));
    }
  });

  if(lieu.objets && lieu.objets.length) html += renderSection("Objets", "objets", renderSimpleList(lieu.objets));
  if(lieu.baies && lieu.baies.length) html += renderSection("Baies", "baies", renderSimpleList(lieu.baies));

  // Boutiques
  if(lieu.boutique_arene && lieu.boutique_arene.length) html += renderSection("Boutique d'Arène", "arene", renderArenaShop(lieu.boutique_arene));
  if(lieu.boutique && lieu.boutique.length) html += renderSection("Boutique", "boutique", renderArenaShop(lieu.boutique));
  if(lieu.shops && lieu.shops.length) html += renderSection("Commerces", "boutique", renderShopList(lieu.shops));
  if(lieu.arena_shop && lieu.arena_shop.length) html += renderSection("Boutique d'Arène", "arene", renderShopList([{name:"Guichet", items:lieu.arena_shop}]));

  container.innerHTML = html;
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
