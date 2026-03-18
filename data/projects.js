// data/projects.js
export const PROFESSIONAL_IDS = ["p6"];
export const ARTWORK_IDS = ["p1", "p2", "p3", "p4", "p5"].filter(
  (id) => !PROFESSIONAL_IDS.includes(id)
);
export const BY_MODE = {
  artwork: [
    "p1", // Xylella
    "p3", // Gemelli Cosmici
    "p5", // Incastri di cemento
    "p7", // Totem
    "p2", // Le radici ca tieni 
    "p4", // Benzina senza piombo
  ],
  professional: [
    "p6", // SONO MANIFESTO - Paola Bianchi
    "p14", //Artisti in Piazza
    "p10", // SONO MANIFESTO - Ivan Fantini
    "p9", // Performance di Giovanni Comelli
    "p8", // Performance di Sofia Belletti
    "p12", // CULT1
    "p13", // CULT2
    "p11", // Benevierre Store
  ],
};

