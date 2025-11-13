// app_lieux.js — version avec détails + images + arborescence Tristan

async function loadJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("Erreur chargement " + url);
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
    base: "../../assets/Lieux/Kanto/", // dossier où tu as mis les images
    ext: ".png"                         // extension des fichiers
  }
};

// ==========================
// PAGE LISTE_LIEUX
// ==========================
function renderLieuxPage(){
  const listEl = document.getElementById("lieux-list");
  if(!listEl) return;

  const params = getParams();
  const region = params.get("r") || "Kanto";

  const titleEl = document.getElementById("lieux-title");
  if(titleEl) titleEl.textContent = "Lieux de " + region;

  const backRegion = document.getElementById("back-region");
  if(backRegion){
    backRegion.href = "../" + region.toLowerCase() + ".html";
  }

  const file = REGION_LIEUX_FILE[region];
  if(!file){
    listEl.textContent = "Aucun fichier trouvé pour la région " + region;
    return;
  }

  loadJSON("../../data/Lieux/" + file)
    .then(data => {
      if(!Array.isArray(data) || !data.length){
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
// PAGE FICHE_DETAILLE
// ==========================
function renderLieuPage(){
  const container = document.getElementById("lieu-content");
  if(!container) return;

  const params = getParams();
  const region = params.get("r") || "Kanto";
  const slug = params.get("l");

  const backList = document.getElementById("back-list");
  if(backList){
    backList.href = "Liste_Lieux.html?r=" + encodeURIComponent(region);
  }

  const file = REGION_LIEUX_FILE[region];
  if(!file){
    container.textContent = "Aucun fichier de lieux pour " + region;
    return;
  }

  loadJSON("../../data/Lieux/" + file)
    .then(data => {

      const lieu = data.find(l => l.slug === slug);
      if(!lieu){
        container.textContent = "Lieu introuvable.";
        return;
      }

      const h1 = document.getElementById("lieu-name");
      if(h1) h1.textContent = lieu.name;

      // --------- Image du lieu ---------
      const imgEl = document.getElementById("lieu-image");
      if (imgEl) {
        const cfg = LIEU_IMAGE_CONFIG[region];
        if (cfg) {
          const fileName = lieu.slug + cfg.ext; // ex: route_1_bourg_palette.png
          imgEl.src = cfg.base + fileName;
          imgEl.alt = "Carte de " + lieu.name;

          imgEl.onerror = () => {
            imgEl.style.display = "none";
          };
        } else {
          imgEl.style.display = "none";
        }
      }

      // ------- utilitaire : gère chaînes OU objets -------
      function addSection(title, list){
        if(!list || !list.length) return;

        const section = document.createElement("section");
        section.className = "pd-lieu-section";

        const h2 = document.createElement("h2");
        h2.textContent = title;

        const ul = document.createElement("ul");

        list.forEach(entry => {
          const li = document.createElement("li");

          // entry peut être "Rattata" OU { id, name, lvl_min, lvl_max, ... }
          const nom = (typeof entry === "string") ? entry : entry.name;

          // Lien vers fiche Pokémon
          const link = document.createElement("a");
          link.textContent = nom;
          link.href = "../../pokemon.html?r=" + encodeURIComponent(region) +
                      "&n=" + encodeURIComponent(nom.toLowerCase());
          link.className = "pd-lieu-pkm-link";
          li.appendChild(link);

          // Affichage du niveau si dispo (SANS le %)
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

      // -------- Sauvages / Jour / Nuit --------
      const sauvage = lieu.sauvage || [];
      const jour = lieu.jour || [];
      const nuit = lieu.nuit || [];

      if(sauvage.length){
        addSection("Pokémon sauvages", sauvage);
      } else {
        if(jour.length) addSection("Pokémon sauvages — Jour", jour);
        if(nuit.length) addSection("Pokémon sauvages — Nuit", nuit);
      }

      // -------- Autres catégories --------
      addSection("Surf", lieu.surf);
      addSection("Canne", lieu.canne);
      addSection("Super Canne", lieu.super_canne);
      addSection("Méga Canne", lieu.mega_canne);
      addSection("Grotte", lieu.cave);
      addSection("Éclate-Roc", lieu.rocksmash);
      addSection("Poké Radar", lieu.pokeradar);

      // Ces sections n'apparaissent que si non vides
      addSection("Objets trouvables", lieu.objets);
      addSection("Baies", lieu.baies);
      addSection("Boutique", lieu.boutique);
      addSection("Boutique d’arène", lieu.boutique_arene);
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
});
