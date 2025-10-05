// data/projects.js
export const PROFESSIONAL_IDS = ["p6"];
export const ARTWORK_IDS = ["p1", "p2", "p3", "p4", "p5"].filter(
  (id) => !PROFESSIONAL_IDS.includes(id)
);
export const BY_MODE = {
  artwork: ARTWORK_IDS,
  professional: PROFESSIONAL_IDS,
};
