// pages/professional/index.js
// File separato per evitare conflitti di state con Next.js
import ArtworkGallery from "../artwork/index";
export { getServerSideProps } from "../artwork/index";
export default ArtworkGallery;
