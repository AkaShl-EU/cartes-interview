// Dessine les icônes de l'app (sources/icones/*.png), rangées dans git.
// À lancer seulement si on change le dessin de l'icône : build.mjs se contente de les copier.
// (resvg n'encode pas les PNG octet pour octet pareil sur Windows et Linux : en les figeant dans git,
//  le build donne exactement le même résultat partout, PC comme Claude Code dans le cloud.)
// Usage : cd source/outils && node icones.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";
import { Resvg } from "@resvg/resvg-js";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const DEST = path.join(ICI, "sources", "icones");
fs.mkdirSync(DEST, { recursive: true });

const bric = fs.readFileSync(path.join(ICI, "sources", "BricolageGrotesque-VF.ttf"));
const bricIcone = await subsetFont(bric, "?", { targetFormat: "truetype", variationAxes: { wght: 800, wdth: 100, opsz: 96 } });
const iconeSvg = (marge, taille) => {
  // marge > 0 : version « maskable » (Android) avec zone de sécurité
  const s = 1 - marge * 2, t = (v) => (512 * marge + v * s).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2340D9"/>
  <g transform="translate(${t(0)} ${t(0)}) scale(${s})">
    <rect x="118" y="108" width="276" height="316" rx="40" fill="#FFC93C" transform="rotate(-9 256 266)"/>
    <rect x="118" y="100" width="276" height="316" rx="40" fill="#FFFFFF" transform="rotate(6 256 258)"/>
    <text x="256" y="350" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="250" fill="#2340D9" transform="rotate(6 256 258)">?</text>
  </g>
</svg>`;
};
const rendu = (svg) => new Resvg(svg, {
  font: { loadSystemFonts: false, fontBuffers: [bricIcone], defaultFontFamily: "Bricolage Grotesque" },
}).render().asPng();
const icones = [
  ["icone-192.png", 192, 0], ["icone-512.png", 512, 0], ["apple-touch-icon.png", 180, 0], ["icone-512-maskable.png", 512, 0.1],
];
for (const [nom, taille, marge] of icones) fs.writeFileSync(path.join(DEST, nom), rendu(iconeSvg(marge, taille)));
console.log("Icônes dessinées dans source/outils/sources/icones/. Relancer ensuite node build.mjs.");
