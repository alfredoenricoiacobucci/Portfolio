// pages/professional/index.js
// File separato per evitare conflitti di state con Next.js
import ArtworkGallery from "../artwork/index";
export { getStaticProps } from "../artwork/index";
export default ArtworkGallery;
