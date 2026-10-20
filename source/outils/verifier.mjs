// Vérifications à faire après chaque modification de cartes-interview.html.
// Usage seul : node verifier.mjs   (appelé aussi automatiquement par build.mjs)
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export function verifier(html) {
  const m = html.match(/<script>\n([\s\S]*?)<\/script>/);
  if (!m) throw new Error("Script principal introuvable");
  const js = m[1];
  new vm.Script(js, { filename: "cartes-interview.js" }); // erreur de syntaxe → exception

  const cut = js.indexOf("const LI =");
  const { CATS, Q, FIXED, THEMES, THEME_PROMPT, CONSENT_OPTS } =
    new Function(js.slice(0, cut) + ";return {CATS,Q,FIXED,THEMES,THEME_PROMPT,CONSENT_OPTS}")();
  const NL = 3; // zh, en, fr
  const pb = [];
  const ok = (t) => Array.isArray(t) && t.length === NL && t.every(s => typeof s === "string" && s.trim());
  const ids = new Set();
  for (const q of Q) {
    if (ids.has(q[0])) pb.push(`question en double : ${q[0]}`); ids.add(q[0]);
    if (!CATS[q[1]]) pb.push(`catégorie inconnue : ${q[0]}`);
    if (!ok(q.slice(2, 2 + NL))) pb.push(`traduction manquante : ${q[0]}`);
    if (q[2 + NL] && !ok(q[2 + NL])) pb.push(`note incomplète : ${q[0]}`);
  }
  for (const [k, t] of Object.entries(FIXED)) if (!ok(t)) pb.push(`carte fixe incomplète : ${k}`);
  if (!ok(THEME_PROMPT)) pb.push("THEME_PROMPT incomplet");
  for (const o of CONSENT_OPTS) if (!ok(o.t)) pb.push(`bouton de consentement incomplet : ${o.id}`);
  let tq = 0;
  for (const th of THEMES) {
    if (!ok(th.t)) pb.push(`titre de thème incomplet : ${th.id}`);
    for (const o of th.opts) {
      if (!ok(o.t)) pb.push(`choix incomplet : ${th.id}/${o.id}`);
      o.qs.forEach((q, i) => { tq++; if (!ok(q)) pb.push(`question à thème incomplète : ${th.id}/${o.id}/${i}`); });
    }
  }
  if (pb.length) throw new Error("Problèmes dans les textes :\n  " + pb.join("\n  "));
  console.log(`OK : JS valide, ${Q.length} questions, ${THEMES.length} thèmes, ${tq} questions à thème, ${Object.keys(FIXED).length} cartes fixes, toutes en ${NL} langues`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const ici = path.dirname(fileURLToPath(import.meta.url));
  verifier(fs.readFileSync(path.join(ici, "..", "cartes-interview.html"), "utf8"));
}
