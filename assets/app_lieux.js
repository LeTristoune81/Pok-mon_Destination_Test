// app_lieux.js — version corrigée pour ton arborescence

async function loadJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("Erreur chargement " + url);
  return await res.json();
}

function getParams(){
  return new URLSearchParams(window.location.search);
}

// Dossier où TU as mis les fichiers :
const REGION_LIEUX_FILE = {
  "Kanto": "lieux_kanto_simple.json"
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

  // 🔥 VRAI CHEMIN CORRECT :
  loadJSON("../../data/Lieux/" + file)
    .then(data => {
      if(!data.length){
        listEl.textContent = "Aucun lieu trouvé.";
        return;
      }

      const ul = document.createElement("ul");

      data.forEach(lieu => {
        const li = document.createElement("li");
        const a = document.createElement("a");

        a.textContent = lieu.name;
        a.href = "Fiche_Detaille.html?r=" + region + "&l=" + lieu.slug;

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
    backList.href = "Liste_Lieux.html?r=" + region;
  }

  const file = REGION_LIEUX_FILE[region];

  loadJSON("../../data/Lieux/" + file)
    .then(data => {

      const lieu = data.find(l => l.slug === slug);
      if(!lieu){
        container.textContent = "Lieu introuvable.";
        return;
      }

      document.getElementById("lieu-name").textContent = lieu.name;

      function addSection(title, list){
        if(!list || !list.length) return;

        const section = document.createElement("section");
        const h2 = document.createElement("h2");
        const ul = document.createElement("ul");

        h2.textContent = title;

        list.forEach(n => {
          const li = document.createElement("li");
          const a = document.createElement("a");

          a.textContent = n;
          a.href = "../../pokemon.html?r=" + region + "&n=" + encodeURIComponent(n.toLowerCase());

          li.appendChild(a);
          ul.appendChild(li);
        });

        section.appendChild(h2);
        section.appendChild(ul);
        container.appendChild(section);
      }

      // Sauvages / Jour / Nuit
      if(lieu.sauvage.length){
        addSection("Pokémon sauvages", lieu.sauvage);
      } else {
        addSection("Pokémon sauvages — Jour", lieu.jour);
        addSection("Pokémon sauvages — Nuit", lieu.nuit);
      }

      addSection("Surf", lieu.surf);
      addSection("Canne", lieu.canne);
      addSection("Super Canne", lieu.super_canne);
      addSection("Méga Canne", lieu.mega_canne);
      addSection("Grotte", lieu.cave);
      addSection("Éclate-Roc", lieu.rocksmash);
      addSection("Poké Radar", lieu.pokeradar);

      addSection("Objets trouvables", lieu.objets);
      addSection("Baies", lieu.baies);
      addSection("Boutique", lieu.boutique);
      addSection("Boutique d’arène", lieu.boutique_arene);
    });
}


// ==========================
// AUTO-INIT
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  renderLieuxPage();
  renderLieuPage();
});
