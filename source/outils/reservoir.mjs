// Fabrique la « réserve » de police chinoise rangée dans git (sources/noto-sc-*-reserve.woff2).
// À lancer RAREMENT, seulement quand build.mjs signale un caractère absent de la réserve.
// Demande la police complète sources/NotoSansSC-VF.ttf (17 Mo, pas dans git, voir CLAUDE.md).
// Usage : cd source/outils && node reservoir.mjs
//
// Contenu de la réserve : les 6 763 caractères chinois courants (GB2312) + tous les caractères de l'app
// + latin, ponctuation chinoise et formes pleine chasse. Graisse figée à 500 et à 900.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SOURCES = path.join(ICI, "sources");
const VF = path.join(SOURCES, "NotoSansSC-VF.ttf");
if (!fs.existsSync(VF)) throw new Error("Police complète manquante : source/outils/sources/NotoSansSC-VF.ttf (voir CLAUDE.md).");

const jeu = new Set();
// GB2312 : octets A1–F7 / A1–FE
const gbk = new TextDecoder("gbk", { fatal: true });
for (let a = 0xa1; a <= 0xf7; a++) for (let b = 0xa1; b <= 0xfe; b++) {
  try { const c = gbk.decode(Uint8Array.of(a, b)); if (c.length && c !== "�") jeu.add(c); } catch {}
}
const plage = (de, a) => { for (let c = de; c <= a; c++) jeu.add(String.fromCodePoint(c)); };
plage(0x20, 0x7e); plage(0xa0, 0x17f); plage(0x2010, 0x2027); plage(0x2030, 0x203a);
plage(0x3000, 0x303f); plage(0xff00, 0xffef);
for (const c of "€№™") jeu.add(c);
// + tout ce que l'app utilise déjà (même règle que build.mjs)
const html = fs.readFileSync(path.join(ICI, "..", "cartes-interview.html"), "utf8");
for (const c of html) { const n = c.codePointAt(0); if (n >= 0x20 && n < 0x1f000) jeu.add(c); }

const texte = [...jeu].sort().join("");
const vf = fs.readFileSync(VF);
for (const poids of [500, 900]) {
  const out = await subsetFont(vf, texte, { targetFormat: "woff2", variationAxes: { wght: poids } });
  fs.writeFileSync(path.join(SOURCES, `noto-sc-${poids}-reserve.woff2`), out);
  console.log(`  noto-sc-${poids}-reserve.woff2  ${(out.length / 1024).toFixed(0)} Ko`);
}
fs.writeFileSync(path.join(SOURCES, "noto-sc-reserve.txt"), texte);
console.log(`Réserve prête : ${jeu.size} caractères. Relancer ensuite node build.mjs.`);
