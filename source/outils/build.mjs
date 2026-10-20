// Fabrique la version iPad hors ligne à partir de source/cartes-interview.html.
// La version générée est écrite à la RACINE du dépôt (publiée telle quelle par GitHub Pages).
// Usage : cd source/outils && npm install && node build.mjs
// - polices réduites aux caractères utilisés dans l'app (à relancer après chaque modification des textes)
//   à partir de la réserve chinoise sources/noto-sc-*-reserve.woff2 (voir reservoir.mjs)
// - JSZip en local, manifeste, icônes, service worker
// - numéro de version incrémenté seulement si quelque chose a changé
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";
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

// Chinois : on part de la « réserve » rangée dans git (6 763 caractères courants + ceux de l'app, graisses 500 et 900),
// pas de la police complète de 17 Mo. Ainsi le build marche partout (PC, Claude Code dans le cloud) et donne le même résultat.
const reserve = new Set(fs.readFileSync(path.join(SOURCES, "noto-sc-reserve.txt"), "utf8"));
const absents = [...new Set(han)].filter(c => c.codePointAt(0) >= 0x20 && !reserve.has(c)); // retours à la ligne, tabulations : pas de dessin
if (absents.length) throw new Error(`Caractère(s) absent(s) de la réserve de police chinoise : ${absents.join(" ")}
  → sur le PC qui a source/outils/sources/NotoSansSC-VF.ttf : node reservoir.mjs, puis node build.mjs (voir CLAUDE.md).
  → sinon : remplacer ce caractère par un autre plus courant.`);
const noto500 = fs.readFileSync(path.join(SOURCES, "noto-sc-500-reserve.woff2"));
const noto900 = fs.readFileSync(path.join(SOURCES, "noto-sc-900-reserve.woff2"));
const bric = fs.readFileSync(path.join(SOURCES, "BricolageGrotesque-VF.ttf"));
const polices = [
  { fichier: "noto-sc-500.woff2", famille: "Noto Sans SC", poids: 500, src: noto500, texte: han },
  { fichier: "noto-sc-900.woff2", famille: "Noto Sans SC", poids: 900, src: noto900, texte: han },
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
  const out = await subsetFont(p.src, p.texte, p.axes ? { targetFormat: "woff2", variationAxes: p.axes } : { targetFormat: "woff2" });
  fs.writeFileSync(path.join(SITE, "polices", p.fichier), out);
  css += `@font-face{font-family:"${p.famille}";font-style:normal;font-weight:${p.poids};font-display:block;src:url(${p.fichier}) format("woff2")}\n`;
  console.log(`  ${p.fichier.padEnd(22)} ${(out.length / 1024).toFixed(0).padStart(5)} Ko`);
}
fs.writeFileSync(path.join(SITE, "polices", "polices.css"), css);
fs.copyFileSync(path.join(SOURCES, "OFL-NotoSansSC.txt"), path.join(SITE, "polices", "OFL-NotoSansSC.txt"));
fs.copyFileSync(path.join(SOURCES, "OFL-Bricolage.txt"), path.join(SITE, "polices", "OFL-Bricolage.txt"));
fs.copyFileSync(path.join(SOURCES, "jszip.min.js"), path.join(SITE, "jszip.min.js"));

// ---------- 2. Icônes ----------
// Dessinées une fois par icones.mjs et rangées dans git : on les copie telles quelles.
for (const nom of fs.readdirSync(path.join(SOURCES, "icones")))
  fs.copyFileSync(path.join(SOURCES, "icones", nom), path.join(SITE, "icones", nom));

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
