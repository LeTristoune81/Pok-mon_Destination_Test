// app_lieux.js — version avec détails + images + boutiques avancées (arena_shop + shops + zones type Parc Safari)

const ITEM_ICONS = {
  "Objets Trouvables": "../../assets/icone/objets_trouvable.png",
  "Baies": "../../assets/icone/baies.png",
  "Boutique Spéciale": "../../assets/icone/boutique.png",
  "Boutique d’Arène": "../../assets/icone/boutique_arene.png"
};

// Optionnel : icônes génériques si tu veux les utiliser ailleurs
const ICONS = {
  arena: "../../assets/icone/boutique_arene.png",
  defaultShop: "../../assets/icone/boutique.png"
};

async function loadJSON(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur chargement " + url);
  return await res.json();
}

function getParams(){
  return new URLSearchParams(window.location.search);
}

// Fichiers de lieux par région
const REGION_LIEUX_FILE = {
  "Kanto": "lieux_kanto_detail.json"
};

// Config des images de lieux par région
const LIEU_IMAGE_CONFIG = {
  "Kanto": {
    base: "../../assets/Lieux/kanto/",
    ext: ".png"
  }
};

// ==========================
// PAGE LISTE_LIEUX
// ==========================
function renderLieuxPage(){
  const listEl = document.getElementById("lieux-list");
  if (!listEl) return;

  const params = getParams();
  const region = params.get("r") || "Kanto";

  const titleEl = document.getElementById("lieux-title");
  if (titleEl) titleEl.textContent = "Lieux de " + region;

  const backRegion = document.getElementById("back-region");
  if (backRegion){
    backRegion.href = "../" + region.toLowerCase() + ".html";
  }

  const file = REGION_LIEUX_FILE[region];
  if (!file){
    listEl.textContent = "Aucun fichier trouvé pour la région " + region;
    return;
  }

  loadJSON("../../data/Lieux/" + file)
    .then(data => {
      if (!Array.isArray(data) || !data.length){
        listEl.textContent = "Aucun lieu trouvé.";
        return;
      }

      const ul = document.createElement("ul");

      data.forEach(lieu => {
        const li = document.createElement("li");
        const a = document.createElement("a");

        a.textContent = lieu.name;
        a.href = "Fiche_Detaille.html?r=" + encodeURIComponent(region) +
                 "&l=" + encodeURIComponent(lieu.slug);

        li.appendChild(a);
        ul.appendChild(li);
      });

      listEl.appendChild(ul);
    })
    .catch(err => {
      console.error(err);
      listEl.textContent = "Erreur chargement JSON";
    });
}

// ==========================
// UTILITAIRES D’AFFICHAGE
// ==========================

// Section Pokémon (avec lien + niveaux)
function addPokemonSection(container, region, title, list){
  if (!list || !list.length) return;

  const section = document.createElement("section");
  section.className = "pd-lieu-section";

  const h2 = document.createElement("h2");
  h2.textContent = title;

  const ul = document.createElement("ul");

  list.forEach(entry => {
    const li = document.createElement("li");

    const nom = (typeof entry === "string") ? entry : entry.name;

    const link = document.createElement("a");
    link.textContent = nom;
    link.href = "../../pokemon.html?r=" + encodeURIComponent(region) +
                "&n=" + encodeURIComponent(nom.toLowerCase());
    link.className = "pd-lieu-pkm-link";
    li.appendChild(link);

    if (typeof entry === "object" &&
        entry.lvl_min !== undefined &&
        entry.lvl_max !== undefined) {

      const meta = document.createElement("span");
      meta.className = "pd-lieu-meta";
      meta.textContent =
        " (niv. " + entry.lvl_min + " à " + entry.lvl_max + ")";

      li.appendChild(meta);
    }

    ul.appendChild(li);
  });

  section.appendChild(h2);
  section.appendChild(ul);
  container.appendChild(section);
}

// Section simple (objets, baies, etc.) version “tags”
function addSimpleSection(container, title, list){
  if (!list || !list.length) return;

  const section = document.createElement("section");
  section.className = "pd-lieu-section";

  const h2 = document.createElement("h2");
  h2.textContent = title;
  section.appendChild(h2);

  const wrap = document.createElement("div");
  wrap.className = "pd-tags-wrap";

  list.forEach(entry => {
    const nom = (typeof entry === "string") ? entry : entry.name;

    const tag = document.createElement("span");
    tag.className = "pd-tag pd-tag-dot";

    tag.appendChild(document.createTextNode(nom));
    wrap.appendChild(tag);
  });

  section.appendChild(wrap);
  container.appendChild(section);
}

// === Nouvelle fonction : boutiques simples OU avancées en 2 colonnes ===
function addBoutiqueSection(container, boutiqueList){
  if (!boutiqueList || !boutiqueList.length) return;

  const first = boutiqueList[0];

  // Cas ancien : tableau de chaînes -> on garde le comportement existant
  if (typeof first === "string" || typeof first === "number"){
    addSimpleSection(container, "Boutique Spéciale", boutiqueList);
    return;
  }

  // Cas avancé : tableau d'objets { name, category, items, daily }
  const section = document.createElement("section");
  section.className = "pd-lieu-section";

  const h2 = document.createElement("h2");
  h2.textContent = "Boutique Spéciale";
  section.appendChild(h2);

  // ---- GRILLE 2 COLONNES ----
  const grid = document.createElement("div");
  grid.className = "pd-boutique-grid";

  const colLeft  = document.createElement("div");
  colLeft.className = "pd-boutique-col";

  const colRight = document.createElement("div");
  colRight.className = "pd-boutique-col";

  boutiqueList.forEach((shop, index) => {
    if (!shop || typeof shop !== "object") return;

    const details = document.createElement("details");
    details.className = "pd-shop-details";

    const summary = document.createElement("summary");
    summary.className = "pd-shop-summary";
    summary.textContent = shop.name || "Boutique";
    details.appendChild(summary);

    const inner = document.createElement("div");
    inner.className = "pd-shop-content";

    // Rézo Cadoizo : daily par jour
    if (shop.daily && typeof shop.daily === "object"){
      Object.entries(shop.daily).forEach(([day, items]) => {
        if (!Array.isArray(items) || !items.length) return;

        const dayTitle = document.createElement("div");
        dayTitle.className = "pd-shop-day";
        dayTitle.textContent = day;
        inner.appendChild(dayTitle);

        const wrap = document.createElement("div");
        wrap.className = "pd-tags-wrap";

        items.forEach(obj => {
          const tag = document.createElement("span");
          tag.className = "pd-tag pd-tag-dot";
          tag.textContent = obj;
          wrap.appendChild(tag);
        });

        inner.appendChild(wrap);
      });
    }
    // Boutiques classiques : items[]
    else if (Array.isArray(shop.items) && shop.items.length){
      const wrap = document.createElement("div");
      wrap.className = "pd-tags-wrap";

      shop.items.forEach(obj => {
        const tag = document.createElement("span");
        tag.className = "pd-tag pd-tag-dot";
        tag.textContent = obj;
        wrap.appendChild(tag);
      });

      inner.appendChild(wrap);
    }

    details.appendChild(inner);

    // Répartition gauche / droite
    if (index % 2 === 0){
      colLeft.appendChild(details);
    } else {
      colRight.appendChild(details);
    }
  });

  grid.appendChild(colLeft);
  grid.appendChild(colRight);
  section.appendChild(grid);
  container.appendChild(section);
}

// --- Nouveaux helpers pour les boutiques (shops / arena_shop) ---

function addSectionWithIcon(parent, title, iconPath){
  const section = document.createElement("section");
  section.className = "pd-lieu-section";

  const h2 = document.createElement("h2");

  if (iconPath){
    const img = document.createElement("img");
    img.src = iconPath;
    img.alt = "";
    img.className = "pd-section-icon";
    h2.appendChild(img);
    h2.appendChild(document.createTextNode(" " + title));
  } else {
    h2.textContent = title;
  }

  section.appendChild(h2);
  parent.appendChild(section);
  return section;
}

function addItemSection(parent, title, items){
  if (!items || !items.length) return;

  const section = addSectionWithIcon(parent, title, null);

  const wrap = document.createElement("div");
  wrap.className = "pd-tags-wrap";

  items.forEach(obj => {
    const tag = document.createElement("span");
    tag.className = "pd-tag pd-tag-dot";
    tag.textContent = obj;
    wrap.appendChild(tag);
  });

  section.appendChild(wrap);
}

// Boutique d'arène (arena_shop)
function renderArenaShop(parent, arenaData){
  if (!arenaData || !arenaData.items || !arenaData.items.length) return;

  const title = arenaData.name || "Boutique d'arène";

  addItemSection(
    parent,
    title,
    arenaData.items
  );
}

// Boutiques diverses + Rézo Cadoizo (shops[])
function renderShops(parent, shops){
  if (!Array.isArray(shops) || !shops.length) return;

  const section = addSectionWithIcon(
    parent,
    "Boutiques",
    ICONS.defaultShop
  );

  shops.forEach(shop => {
    if (!shop) return;

    if (shop.daily){
      const title = document.createElement("div");
      title.className = "shop-name";
      title.textContent = shop.name;
      section.appendChild(title);

      Object.entries(shop.daily).forEach(([day, items]) => {
        if (!items || !items.length) return;
        const line = document.createElement("div");
        line.className = "shop-line";
        line.innerHTML = `<strong>${day} :</strong> ${items.join(", ")}`;
        section.appendChild(line);
      });

      return;
    }

    if (!shop.items || !shop.items.length) return;

    const line = document.createElement("div");
    line.className = "shop-line";
    line.innerHTML = `<strong>${shop.name} :</strong> ${shop.items.join(", ")}`;
    section.appendChild(line);
  });
}

// ==========================
// PAGE FICHE_DETAILLE
// ==========================
function renderLieuPage(){
  const container = document.getElementById("lieu-content");
  if (!container) return;

  const params = getParams();
  const region = params.get("r") || "Kanto";
  const slug = params.get("l");

  const backList = document.getElementById("back-list");
  if (backList){
    backList.href = "Liste_Lieux.html?r=" + encodeURIComponent(region);
  }

  const file = REGION_LIEUX_FILE[region];
  if (!file){
    container.textContent = "Aucun fichier de lieux pour " + region;
    return;
  }

  loadJSON("../../data/Lieux/" + file)
    .then(data => {
      const lieu = data.find(l => l.slug === slug);
      if (!lieu){
        container.textContent = "Lieu introuvable.";
        return;
      }

      const h1 = document.getElementById("lieu-name");
      if (h1) h1.textContent = lieu.name;

      // --------- Image du lieu ---------
      const imgEl = document.getElementById("lieu-image");
      if (imgEl){
        const cfg = LIEU_IMAGE_CONFIG[region];
        if (cfg){
          const fileName = lieu.slug + cfg.ext;
          imgEl.src = cfg.base + fileName;
          imgEl.alt = "Carte de " + lieu.name;

          imgEl.onerror = () => {
            imgEl.style.display = "none";
          };

          imgEl.onclick = () => {
            const box = document.getElementById("lieu-lightbox");
            const boxImg = document.getElementById("lieu-lightbox-img");
            if (box && boxImg){
              boxImg.src = imgEl.src;
              boxImg.alt = imgEl.alt;
              box.classList.add("is-visible");
            }
          };
        } else {
          imgEl.style.display = "none";
        }
      }

      // ======== CAS SPÉCIAL : LIEU AVEC ZONES (Parc Safari) ========
if (Array.isArray(lieu.zones) && lieu.zones.length) {
  lieu.zones.forEach(zone => {
    // zone.name, zone.jour, zone.nuit, zone.surf...

          const zoneSection = document.createElement("section");
          zoneSection.className = "pd-lieu-section";

          const h2 = document.createElement("h2");
          h2.textContent = zone.name || "Zone";
          zoneSection.appendChild(h2);

          // Sauvage / Jour / Nuit
          const sauvageZ = zone.sauvage || [];
          const jourZ = zone.jour || [];
          const nuitZ = zone.nuit || [];

          if (sauvageZ.length){
            addPokemonSection(zoneSection, region, "Pokémon Sauvages", sauvageZ);
          } else {
            if (jourZ.length) addPokemonSection(zoneSection, region, "Pokémon Sauvages — Jour", jourZ);
            if (nuitZ.length) addPokemonSection(zoneSection, region, "Pokémon Sauvages — Nuit", nuitZ);
          }

          // Autres catégories Pokémon
          addPokemonSection(zoneSection, region, "Surf",        zone.surf);
          addPokemonSection(zoneSection, region, "Canne",       zone.canne);
          addPokemonSection(zoneSection, region, "Super Canne", zone.super_canne);
          addPokemonSection(zoneSection, region, "Méga Canne",  zone.mega_canne);
          addPokemonSection(zoneSection, region, "Grotte",      zone.cave);
          addPokemonSection(zoneSection, region, "Éclate-Roc",  zone.rocksmash);
          addPokemonSection(zoneSection, region, "Poké Radar",  zone.pokeradar);

          // Objets / Baies
          addSimpleSection(zoneSection, "Objets Trouvables", zone.objets);
          addSimpleSection(zoneSection, "Baies",             zone.baies);

          // Boutiques éventuelles par zone
          addBoutiqueSection(zoneSection, zone.boutique);
          addSimpleSection(zoneSection, "Boutique d’Arène", zone.boutique_arene);

          container.appendChild(zoneSection);
        });

        // On a tout géré via les zones, on ne continue pas le rendu classique
        return;
      }

      // -------- CAS CLASSIQUE (sans zones) --------

      const sauvage = lieu.sauvage || [];
      const jour = lieu.jour || [];
      const nuit = lieu.nuit || [];

      if (sauvage.length){
        addPokemonSection(container, region, "Pokémon Sauvages", sauvage);
      } else {
        if (jour.length) addPokemonSection(container, region, "Pokémon Sauvages — Jour", jour);
        if (nuit.length) addPokemonSection(container, region, "Pokémon Sauvages — Nuit", nuit);
      }

      // Autres catégories Pokémon
      addPokemonSection(container, region, "Surf",        lieu.surf);
      addPokemonSection(container, region, "Canne",       lieu.canne);
      addPokemonSection(container, region, "Super Canne", lieu.super_canne);
      addPokemonSection(container, region, "Méga Canne",  lieu.mega_canne);
      addPokemonSection(container, region, "Grotte",      lieu.cave);
      addPokemonSection(container, region, "Éclate-Roc",  lieu.rocksmash);
      addPokemonSection(container, region, "Poké Radar",  lieu.pokeradar);

      // Objets / Baies
      addSimpleSection(container, "Objets Trouvables", lieu.objets);
      addSimpleSection(container, "Baies",             lieu.baies);

      // Boutiques : simple / avancé
      addBoutiqueSection(container, lieu.boutique);

      // Boutique d’Arène (liste simple)
      addSimpleSection(container, "Boutique d’Arène",  lieu.boutique_arene);

      // Nouveau système : arena_shop + shops[]
      renderArenaShop(container, lieu.arena_shop);
      renderShops(container, lieu.shops);
    })
    .catch(err => {
      console.error(err);
      container.textContent = "Erreur lors du chargement du lieu.";
    });
}

// ==========================
// AUTO-INIT
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  renderLieuxPage();
  renderLieuPage();

  const box = document.getElementById("lieu-lightbox");

  if (box){
    box.addEventListener("click", (e) => {
      if (e.target === box){
        box.classList.remove("is-visible");
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && box){
      box.classList.remove("is-visible");
    }
  });
});
