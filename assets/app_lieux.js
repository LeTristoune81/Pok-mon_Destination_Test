// app_lieux.js — gestion des pages Liste_Lieux.html et Fiche_Detaille.html

async function loadJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("Erreur chargement " + url);
  return await res.json();
}

function getParams(){
  return new URLSearchParams(window.location.search);
}

function slugifyLocal(str){
  // même logique que côté génération (approx)
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const REGION_LIEUX_FILE = {
  "Kanto": "lieux_kanto_detail.json"
  // plus tard : Johto, Hoenn, etc.
};

function renderLieuxPage(){
  const listEl = document.getElementById("lieux-list");
  if(!listEl) return; // pas sur cette page

  const params = getParams();
  const region = params.get("r") || "Kanto";
  const titleEl = document.getElementById("lieux-title");
  const backRegion = document.getElementById("back-region");

  if(titleEl) titleEl.textContent = "Lieux de " + region;
  if(backRegion){
    const slugRegion = region.toLowerCase();
    backRegion.href = "johto.html".replace("johto", slugRegion); // ex: kanto.html, johto.html...
  }

  const file = REGION_LIEUX_FILE[region];
  if(!file){
    listEl.textContent = "Aucun lieu défini pour la région " + region + ".";
    return;
  }

  loadJSON("../../data/Lieux" + file)
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
      listEl.textContent = "Erreur lors du chargement des lieux.";
    });
}

function renderLieuPage(){
  const container = document.getElementById("lieu-content");
  if(!container) return; // pas sur cette page

  const params = getParams();
  const region = params.get("r") || "Kanto";
  const slug = params.get("l");
  const titleEl = document.getElementById("lieu-name");
  const backList = document.getElementById("back-list");

  if(backList){
    backList.href = "Liste_Lieux.html?r=" + encodeURIComponent(region);
  }

  const file = REGION_LIEUX_FILE[region];
  if(!file){
    container.textContent = "Aucun lieu défini pour la région " + region + ".";
    return;
  }

  loadJSON("../../data/" + file)
    .then(data => {
      const lieu = data.find(l => l.slug === slug);
      if(!lieu){
        container.textContent = "Lieu introuvable.";
        if(titleEl) titleEl.textContent = "Lieu inconnu";
        return;
      }
      if(titleEl) titleEl.textContent = lieu.name;

      // Petite fonction utilitaire pour créer une section
      function addSection(titre, liste){
        if(!liste || !liste.length) return;
        const section = document.createElement("section");
        const h2 = document.createElement("h2");
        h2.textContent = titre;
        const ul = document.createElement("ul");
        liste.forEach(nom => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.textContent = nom;
          // lien vers la fiche Pokémon : n = nom en minuscules
          a.href = "pokemon.html?r=" + encodeURIComponent(region) +
                   "&n=" + encodeURIComponent(nom.toLowerCase());
          li.appendChild(a);
          ul.appendChild(li);
        });
        section.appendChild(h2);
        section.appendChild(ul);
        container.appendChild(section);
      }

      // Gestion spéciale Sauvage / Jour / Nuit
      const jour = lieu.jour || [];
      const nuit = lieu.nuit || [];
      const sauvage = lieu.sauvage || [];

      if(sauvage.length){
        addSection("Pokémon sauvages", sauvage);
      } else if(jour.length || nuit.length){
        const setJour = new Set(jour);
        const setNuit = new Set(nuit);
        const same =
          jour.length === nuit.length &&
          jour.every(n => setNuit.has(n));
        if(same){
          // mêmes Pokémon jour/nuit -> une seule liste
          const union = Array.from(new Set(jour.concat(nuit)));
          addSection("Pokémon sauvages (jour & nuit)", union);
        } else {
          addSection("Pokémon sauvages — Jour", jour);
          addSection("Pokémon sauvages — Nuit", nuit);
        }
      }

      // Autres catégories
      addSection("Surf", lieu.surf);
      addSection("Pêche (canne)", lieu.canne);
      addSection("Pêche (super canne)", lieu.super_canne);
      addSection("Pêche (méga canne)", lieu.mega_canne);
      addSection("Rencontres en grotte", lieu.cave);
      addSection("Rencontres (Éclate-Roc)", lieu.rocksmash);
      addSection("Poké Radar", lieu.pokeradar);

      // Objets / baies / boutiques (n'apparaissent que si non vides)
      addSection("Objets trouvables", lieu.objets);
      addSection("Baies", lieu.baies);
      addSection("Boutique", lieu.boutique);
      addSection("Boutique d'arène", lieu.boutique_arene);
    })
    .catch(err => {
      console.error(err);
      container.textContent = "Erreur lors du chargement du lieu.";
    });
}

document.addEventListener("DOMContentLoaded", () => {
  renderLieuxPage();
  renderLieuPage();
});
