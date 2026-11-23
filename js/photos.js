/* =========================================================
   GALERIE PHOTO DU RMJ
   ---------------------------------------------------------
   Pour ajouter une photo :
   1. Copiez l'image dans le dossier  assets/photos/
   2. Ajoutez une ligne dans la liste ci-dessous, sur le modèle :

      { src: "assets/photos/nom-du-fichier.jpg",
        titre: "Titre de la photo",
        categorie: "Convocation",
        date: "Octobre 2026" },

   Catégories possibles (vous pouvez en créer d'autres) :
   "Convocation", "Conférences Influence", "Génération Influence Afrique",
   "Masterclass", "Pacte Africa", "Webinaires", "Vie du mouvement"

   Carrousel « Les temps forts » (haut de la page Galerie) :
   ajoutez  une: true  à une photo pour la mettre à la une, par ex.
      { src: "...", titre: "...", categorie: "Convocation", date: "...", une: true },
   Si aucune photo n'est marquée, les 7 premières de la liste défilent.

   Tant que la liste est vide, la galerie affiche des cadres
   « Photo à venir ».
   ========================================================= */

const PHOTOS = [
  { src: "assets/photos/rmj-0141.jpg", titre: "La grande famille du RMJ réunie", categorie: "Convocation", date: "", une: true },
  { src: "assets/photos/rmj-0315.jpg", titre: "Les participants de la Masterclass", categorie: "Masterclass", date: "", une: true },
  { src: "assets/photos/rmj-0325.jpg", titre: "Un temps de prière sur scène – ReNor 2026, Bafoussam", categorie: "Vie du mouvement", date: "2026", une: true },
  { src: "assets/photos/rmj-0319.jpg", titre: "Une salle comble pour MORE, 1re édition", categorie: "Vie du mouvement", date: "", une: true },
  { src: "assets/photos/rmj-0274.jpg", titre: "Yvan Vegang aux couleurs du Cameroun", categorie: "Le fondateur", date: "", une: true },
  { src: "assets/photos/rmj-0317.jpg", titre: "La jeunesse prend la parole", categorie: "Vie du mouvement", date: "", une: true },
  { src: "assets/photos/rmj-0326.jpg", titre: "La foule de ReNor 2026 à Bafoussam", categorie: "Vie du mouvement", date: "2026", une: true },
  { src: "assets/photos/rmj-0056.jpg", titre: "L'équipe de la Convocation", categorie: "Convocation", date: "" },
  { src: "assets/photos/rmj-0166.jpg", titre: "Présentation pendant la Convocation", categorie: "Convocation", date: "" },
  { src: "assets/photos/rmj-0192.jpg", titre: "À l'écoute pendant la Convocation", categorie: "Convocation", date: "" },
  { src: "assets/photos/rmj-0174.jpg", titre: "Prise de notes pendant la Convocation", categorie: "Convocation", date: "" },
  { src: "assets/photos/rmj-0039.jpg", titre: "À l'accueil de la Convocation", categorie: "Convocation", date: "" },
  { src: "assets/photos/rmj-0197.jpg", titre: "Préparation de la Convocation", categorie: "Convocation", date: "" },
  { src: "assets/photos/rmj-0312.jpg", titre: "Rencontre à la Masterclass", categorie: "Masterclass", date: "" },
  { src: "assets/photos/rmj-0313.jpg", titre: "Souvenir de la Masterclass", categorie: "Masterclass", date: "" },
  { src: "assets/photos/rmj-0314.jpg", titre: "Sourires à la Masterclass", categorie: "Masterclass", date: "" },
  { src: "assets/photos/rmj-0321.jpg", titre: "Une participante prend la parole", categorie: "Masterclass", date: "" },
  { src: "assets/photos/rmj-0322.jpg", titre: "Concentration pendant la Masterclass", categorie: "Masterclass", date: "" },
  { src: "assets/photos/rmj-0323.jpg", titre: "Les participants prennent des notes", categorie: "Masterclass", date: "" },
  { src: "assets/photos/rmj-0324.jpg", titre: "Dans la salle de la Masterclass", categorie: "Masterclass", date: "" },
  { src: "assets/photos/rmj-0311.jpg", titre: "L'Afrique, qui parmi nous se lèvera pour la bâtir ?", categorie: "Masterclass", date: "" },
  { src: "assets/photos/rmj-0316.jpg", titre: "Remise de distinction à MORE", categorie: "Vie du mouvement", date: "" },
  { src: "assets/photos/rmj-0318.jpg", titre: "Le public de MORE, 1re édition", categorie: "Vie du mouvement", date: "" },
  { src: "assets/photos/rmj-0275.jpg", titre: "Portrait d'Yvan Vegang", categorie: "Le fondateur", date: "" },
  { src: "assets/photos/rmj-0276.jpg", titre: "Yvan Vegang, fondateur du RMJ", categorie: "Le fondateur", date: "" },
  { src: "assets/photos/rmj-0320.jpg", titre: "« L'influence est importante, mais le pouvoir est encore plus précieux »", categorie: "Conférences Influence", date: "2025" },
  { src: "assets/photos/rmj-0328.jpg", titre: "Cameroun, le pionnier de la renaissance", categorie: "Pensées du fondateur", date: "" },
  { src: "assets/photos/rmj-0309.jpg", titre: "Penser Grand #010", categorie: "Pensées du fondateur", date: "" },
  { src: "assets/photos/rmj-0310.jpg", titre: "Penser Grand #009", categorie: "Pensées du fondateur", date: "" },
];
