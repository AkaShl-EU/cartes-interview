// Fabrique la version iPad hors ligne à partir de source/cartes-interview.html.
// La version générée est écrite à la RACINE du dépôt (publiée telle quelle par GitHub Pages).
// Usage : cd source/outils && npm install && node build.mjs
// - polices réduites aux caractères utilisés dans l'app (à relancer après chaque modification des textes)
// - JSZip en local, manifeste, icônes, service worker
// - numéro de version incrémenté seulement si quelque chose a changé
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";
import { Resvg } from "@resvg/resvg-js";
import { verifier } from "./verifier.mjs";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.join(ICI, "..");                 // source/
const SRC = path.join(RACINE, "cartes-interview.html");
const SITE = path.join(RACINE, "..");                // racine du dépôt = site publié
// Seuls ces fichiers/dossiers sont générés (effacés puis recréés) à la racine.
// Tout le reste (source/, CLAUDE.md, .gitignore, .git…) n'est jamais touché ni mis en cache.
const GENERES = ["index.html", "sw.js", "manifest.webmanifest", "jszip.min.js", ".nojekyll", "polices", "icones"];
const SOURCES = path.join(ICI, "sources");
const VERSION_FILE = path.join(ICI, "version.json");

const html = fs.readFileSync(SRC, "utf8");
verifier(html); // s'arrête si le JS ou les traductions sont cassés

// ---------- 1. Polices ----------
const CJK = /[⺀-鿿豈-﫿＀-￯　-〿]/u;
const tous = new Set([...html]);
// Latin : tout ce qui est dans l'app + ce que l'on peut taper dans les champs (prénom, repère)
let latin = "";
for (let c = 0x20; c <= 0x7e; c++) latin += String.fromCodePoint(c);
for (let c = 0xa0; c <= 0x17f; c++) latin += String.fromCodePoint(c);
latin += "‘’‚“”„–—…•€«»‹›";
for (const ch of tous) if (!CJK.test(ch) && ch.codePointAt(0) < 0x2000) latin += ch;
// Chinois : tous les caractères de l'app (le latin et la ponctuation inclus, car les cartes .han les affichent avec Noto)
const han = [...tous].filter(ch => ch.codePointAt(0) >= 0x20 && ch.codePointAt(0) < 0x1f000).join("") + latin;

// NotoSansSC-VF.ttf (17 Mo) n'est pas dans git : voir CLAUDE.md pour le récupérer.
if (!fs.existsSync(path.join(SOURCES, "NotoSansSC-VF.ttf")))
  throw new Error("Police manquante : source/outils/sources/NotoSansSC-VF.ttf (17 Mo, pas dans git). Voir CLAUDE.md, « Première installation ».");
const noto = fs.readFileSync(path.join(SOURCES, "NotoSansSC-VF.ttf"));
const bric = fs.readFileSync(path.join(SOURCES, "BricolageGrotesque-VF.ttf"));
const polices = [
  { fichier: "noto-sc-500.woff2", famille: "Noto Sans SC", poids: 500, src: noto, texte: han, axes: { wght: 500 } },
  { fichier: "noto-sc-900.woff2", famille: "Noto Sans SC", poids: 900, src: noto, texte: han, axes: { wght: 900 } },
  // Bricolage : on garde l'axe opsz (taille optique) comme Google Fonts, on fige la graisse
  { fichier: "bricolage-400.woff2", famille: "Bricolage Grotesque", poids: 400, src: bric, texte: latin, axes: { wght: 400, wdth: 100 } },
  { fichier: "bricolage-600.woff2", famille: "Bricolage Grotesque", poids: 600, src: bric, texte: latin, axes: { wght: 600, wdth: 100 } },
  { fichier: "bricolage-800.woff2", famille: "Bricolage Grotesque", poids: 800, src: bric, texte: latin, axes: { wght: 800, wdth: 100 } },
];

// on efface uniquement les fichiers générés de la version précédente
for (const e of GENERES) fs.rmSync(path.join(SITE, e), { recursive: true, force: true, maxRetries: 3 });
fs.mkdirSync(path.join(SITE, "polices"), { recursive: true });
fs.mkdirSync(path.join(SITE, "icones"), { recursive: true });

let css = "/* Polices sous licence SIL Open Font License (voir OFL-*.txt) */\n";
for (const p of polices) {
  const out = await subsetFont(p.src, p.texte, { targetFormat: "woff2", variationAxes: p.axes });
  fs.writeFileSync(path.join(SITE, "polices", p.fichier), out);
  css += `@font-face{font-family:"${p.famille}";font-style:normal;font-weight:${p.poids};font-display:block;src:url(${p.fichier}) format("woff2")}\n`;
  console.log(`  ${p.fichier.padEnd(22)} ${(out.length / 1024).toFixed(0).padStart(5)} Ko`);
}
fs.writeFileSync(path.join(SITE, "polices", "polices.css"), css);
fs.copyFileSync(path.join(SOURCES, "OFL-NotoSansSC.txt"), path.join(SITE, "polices", "OFL-NotoSansSC.txt"));
fs.copyFileSync(path.join(SOURCES, "OFL-Bricolage.txt"), path.join(SITE, "polices", "OFL-Bricolage.txt"));
fs.copyFileSync(path.join(SOURCES, "jszip.min.js"), path.join(SITE, "jszip.min.js"));

// ---------- 2. Icônes ----------
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
for (const [nom, taille, marge] of icones) fs.writeFileSync(path.join(SITE, "icones", nom), rendu(iconeSvg(marge, taille)));

// ---------- 3. Manifeste ----------
fs.writeFileSync(path.join(SITE, "manifest.webmanifest"), JSON.stringify({
  name: "Cartes d'interview",
  short_name: "Cartes",
  lang: "fr",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#F3F5FA",
  theme_color: "#2340D9",
  icons: [
    { src: "icones/icone-192.png", sizes: "192x192", type: "image/png" },
    { src: "icones/icone-512.png", sizes: "512x512", type: "image/png" },
    { src: "icones/icone-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2));

// ---------- 4. index.html ----------
const remplacer = (texte, nom, par) => {
  const re = new RegExp(`<!--${nom}-->[\\s\\S]*?<!--/${nom}-->`);
  if (!re.test(texte)) throw new Error(`Marqueur <!--${nom}--> introuvable dans cartes-interview.html`);
  return texte.replace(re, par);
};
let page = html;
page = remplacer(page, "polices", `<link rel="stylesheet" href="polices/polices.css">`);
page = remplacer(page, "jszip", `<script src="jszip.min.js"></script>`);
if (!page.includes("<!--pwa-->")) throw new Error("Marqueur <!--pwa--> introuvable dans cartes-interview.html");
page = page.replace("<!--pwa-->", `<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icones/apple-touch-icon.png">
<link rel="icon" href="icones/icone-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Cartes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#2340D9">
<script>window.PWA={v:"__VERSION__",d:"__DATE__"}</script>`);
if (/fonts\.googleapis|fonts\.gstatic|cdnjs\.cloudflare/.test(page)) throw new Error("Il reste une adresse internet externe dans index.html");
fs.writeFileSync(path.join(SITE, ".nojekyll"), "");

// ---------- 5. Version + service worker ----------
const lister = (dir, base = "") => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? lister(path.join(dir, e.name), base + e.name + "/") : [base + e.name]);
const fichiers = GENERES.filter(e => !e.startsWith(".") && fs.existsSync(path.join(SITE, e)))
  .flatMap(e => fs.statSync(path.join(SITE, e)).isDirectory() ? lister(path.join(SITE, e), e + "/") : [e])
  .filter(f => !f.endsWith(".txt")).sort();
const h = crypto.createHash("sha256").update(page);
for (const f of fichiers) h.update(f).update(fs.readFileSync(path.join(SITE, f)));
const empreinte = h.digest("hex").slice(0, 12);

let ver = { n: 0, empreinte: "", date: "" };
try { ver = JSON.parse(fs.readFileSync(VERSION_FILE, "utf8")); } catch {}
if (ver.empreinte !== empreinte) {
  ver = { n: ver.n + 1, empreinte, date: new Date().toISOString().slice(0, 10) };
  fs.writeFileSync(VERSION_FILE, JSON.stringify(ver, null, 2) + "\n");
}
const v = "v" + ver.n;
page = page.replace("__VERSION__", v).replace("__DATE__", ver.date);
fs.writeFileSync(path.join(SITE, "index.html"), page);

const aCacher = ["./", ...fichiers];
fs.writeFileSync(path.join(SITE, "sw.js"), `// Généré par outils/build.mjs — ne pas modifier à la main.
// Garde toute l'app dans l'iPad pour qu'elle marche sans internet.
const VERSION = ${JSON.stringify(v + "-" + empreinte)};
const CACHE = "cartes-" + VERSION;
const FICHIERS = ${JSON.stringify(aCacher, null, 1)};

self.addEventListener("install", e => {
  // cache:"reload" : on ignore le cache HTTP pour être sûr d'avoir les nouveaux fichiers
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: "reload" })))));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("cartes-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// La nouvelle version attend que l'utilisateur touche « mettre à jour » (jamais pendant une interview)
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true })
      .then(r => r || (e.request.mode === "navigate" ? c.match("./") : null))
      .then(r => r || fetch(e.request)))
  );
});
`);

const total = fichiers.reduce((s, f) => s + fs.statSync(path.join(SITE, f)).size, 0);
console.log(`Version iPad prête : ${v} (${ver.date}), ${fichiers.length} fichiers, ${(total / 1024).toFixed(0)} Ko → racine du dépôt`);
