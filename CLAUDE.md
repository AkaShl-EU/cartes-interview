# Cartes d'interview — guide pour modifier et reconstruire l'app

Web-app pour tablette (iPad) qui affiche des cartes de questions pendant des interviews de rue,
en chinois, anglais et français. La personne interviewée lit la carte et répond dans sa langue ;
la traduction se fait au montage.

Réponds en français, de façon directe et concrète.

Si le dépôt privé `AkaShl-EU/inerviews-rue-contexte` est aussi ouvert dans la session, lis d'abord son `CLAUDE.md` :
il contient le contexte du projet (règles, prochaines étapes). Ne recopie jamais son contenu ici : ce dépôt-ci est public.

## Organisation du dépôt

```
/                          ← VERSION GÉNÉRÉE, publiée telle quelle par GitHub Pages (branche main, racine)
├── index.html             généré — ne pas modifier à la main
├── sw.js                  généré — service worker (toute l'app en cache, marche hors ligne)
├── manifest.webmanifest   généré
├── jszip.min.js           copié depuis source/outils/sources/
├── polices/               généré — polices réduites aux caractères utilisés + licences OFL
├── icones/                généré
├── .nojekyll              généré
├── CLAUDE.md              ce fichier
├── .gitignore
└── source/                ← SOURCES : c'est ici qu'on travaille
    ├── cartes-interview.html   LA source unique de l'app (HTML + CSS + JS dans un seul fichier)
    └── outils/
        ├── build.mjs           fabrique la version générée à la racine
        ├── verifier.mjs        vérifie le JS et les traductions (appelé par build.mjs)
        ├── serve.mjs           petit serveur local pour tester
        ├── reservoir.mjs       (rare) refait la réserve de police chinoise, demande la police complète
        ├── icones.mjs          (rare) redessine les icônes
        ├── version.json        numéro de version (géré par build.mjs)
        ├── package.json / package-lock.json
        └── sources/
            ├── noto-sc-500-reserve.woff2 / noto-sc-900-reserve.woff2 / noto-sc-reserve.txt
            │                   réserve de police chinoise (~2 Mo) : 6 763 caractères courants + ceux de l'app
            ├── BricolageGrotesque-VF.ttf, jszip.min.js, licences OFL
            └── icones/         icônes PNG figées (copiées telles quelles par le build)
```

Adresse publiée : https://akashl-eu.github.io/cartes-interview/

**Règle d'or : on ne modifie que `source/cartes-interview.html`** (et les outils si besoin), puis on reconstruit.
Les fichiers de la racine sont écrasés à chaque build.

## Première installation

Node.js 18 ou plus récent, puis `cd source/outils && npm install`. C'est tout :
**tout ce qu'il faut pour reconstruire est dans le dépôt**, ça marche aussi bien sur le PC que dans Claude Code
(web, iPad) sans aucun fichier en plus. Le build donne exactement les mêmes fichiers partout.

### Travail depuis Claude Code (cloud, iPad)
- Une session part d'un clone neuf : faire `npm install` dans `source/outils` avant le premier build.
- Toujours partir de la dernière version : `git pull` avant de commencer.
- Publier = commit + push sur `main` (voir « Modifier l'app »). Demander l'accord avant de pousser.
- Le test hors ligne sur le vrai iPad se fait après publication (bannière « Nouvelle version disponible »).

### Si un caractère chinois manque dans la réserve
La réserve couvre les 6 763 caractères chinois courants (GB2312) et tous ceux de l'app au moment où elle a été faite.
Si un nouveau texte utilise un caractère rare, `build.mjs` s'arrête et le nomme. Deux solutions :
- plus simple : reformuler avec un caractère courant ;
- sinon, sur une machine qui a la police complète `source/outils/sources/NotoSansSC-VF.ttf` (17 Mo, **pas dans git**,
  Google Fonts « Noto Sans SC », fichier variable `NotoSansSC[wght].ttf`, renommé ; version utilisée :
  SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`) : `node reservoir.mjs`, puis `node build.mjs`,
  et commiter la nouvelle réserve.

## Modifier l'app

1. Modifier `source/cartes-interview.html`.
2. Vérifier : `cd source/outils && node verifier.mjs`
   (syntaxe JS, toutes les données s'évaluent, chaque texte existe dans les 3 langues).
3. Reconstruire : `node build.mjs` (relance la vérification et s'arrête en cas de problème).
4. Tester : `node serve.mjs` puis ouvrir http://localhost:5178/ (tester aussi serveur coupé : l'app doit marcher hors ligne).
5. Publier : à la racine du dépôt, `git add -A && git commit -m "vN : …" && git push`.
   GitHub Pages met le site à jour en une ou deux minutes.

**Toujours reconstruire après avoir changé des textes** : les polices ne contiennent que les caractères utilisés,
un nouveau caractère chinois sans rebuild s'afficherait dans une autre police.

### Ce que fait `build.mjs`
- Vérifie le code (`verifier.mjs`).
- Réduit les polices aux caractères de l'app (Noto Sans SC 500/900 depuis la réserve ; Bricolage Grotesque 400/600/800 + tous les caractères latins tapables).
- Copie JSZip et les icônes figées, génère le manifeste, `index.html` et `sw.js`.
- Dans `index.html`, remplace les blocs entre marqueurs `<!--polices-->…<!--/polices-->`, `<!--jszip-->…<!--/jszip-->`
  et le marqueur `<!--pwa-->`. **Ne jamais supprimer ces marqueurs** dans la source.
- Refuse de terminer s'il reste une adresse externe (Google Fonts, cdnjs) : la version iPad doit marcher sans internet.
- N'efface et ne régénère **que** la liste `GENERES` (index.html, sw.js, manifest.webmanifest, jszip.min.js, .nojekyll, polices/, icones/).
  `source/`, `CLAUDE.md`, `.gitignore` et `.git` ne sont jamais touchés ni mis en cache par le service worker.
  Si on ajoute un nouveau fichier généré, l'ajouter à `GENERES`.

### Version et mise à jour sur l'iPad
- `source/outils/version.json` : `n` augmente automatiquement quand le contenu généré change (empreinte SHA-256).
  La version (`v2`, `v3`…) s'affiche en bas de l'écran d'accueil de l'app.
- Une nouvelle version change `sw.js` → à la prochaine ouverture avec internet, l'iPad télécharge la mise à jour et affiche
  une bannière « Nouvelle version disponible » (jamais pendant une interview). Les interviews enregistrées sont conservées.
- Le premier build fait avec la réserve (au lieu de la police complète) donnera **v3** même sans changement de texte :
  les fichiers de polices changent octet pour octet, mais les dessins des caractères sont identiques (vérifié glyphe par glyphe).
  C'est normal, sans danger ; ça arrivera avec la prochaine vraie modification.
- Les icônes sont figées dans `sources/icones/` parce que resvg n'encode pas les PNG pareil sur Windows et Linux.
  Pour changer le dessin : modifier `icones.mjs`, `node icones.mjs`, puis `node build.mjs`.

## La source `cartes-interview.html`

Une seule page, le script principal est le premier `<script>` du fichier. Données principales :
- `CATS` : catégories de questions. `Q` : questions `[id, catégorie, zh, en, fr, note?]`, `note` = `[zh, en, fr]`.
- `FIXED` : cartes fixes (accroche, demande, consentement, refus, consigne, prénom, présentation, statut, fin…), chacune `[zh, en, fr]`.
- `CONSENT_OPTS` : boutons du consentement `{id, e, t:[zh,en,fr]}` (oui / visage flouté / non).
- `THEME_PROMPT` et `THEMES` : cartes « C'est toi qui choisis le thème » —
  `{id, e, t:[zh,en,fr], opts:[{id, e, t:[zh,en,fr], qs:[[zh,en,fr], …]}]}`.
- `LI = {zh:0, en:1, fr:2}` : index de langue dans tous les tableaux.
- `window.PWA` n'existe que dans la version générée : le code s'en sert pour le service worker, la version et l'avertissement de sauvegarde.
- Stockage dans `localStorage` (préfixe `ci:`), interview en cours dans `ci:live`.
  Hors claude.ai, sauvegarde/restauration par fichier `.json` (boutons dans « Mes interviews »).

La même source sert aussi pour une version artifact claude.ai (polices Google Fonts + JSZip cdnjs, synchro compte via `window.claude`) :
le code a des `try/catch` et marche dans les deux cas.

### Ajouter une langue
Ajouter un 4e élément à **tous** les tableaux de textes, mettre à jour `LI`, `LANGTAG`, le sélecteur et l'export PNG,
passer `NL` à 4 dans `outils/verifier.mjs`, et ajouter la police de la langue (thaï, coréen, arabe…) dans `outils/build.mjs`.
L'arabe et l'hébreu demandent la gestion droite-à-gauche.

## Règles de contenu
- Aucune question politique.
- Toute nouvelle traduction doit être relue par une personne qui parle la langue avant d'être utilisée en interview.

## Ce qui ne doit jamais aller dans ce dépôt (il est public)
- Vidéos, rushs, audio, fichiers lourds (la police Noto source est ignorée exprès).
- Fichiers `.env` ou secrets.
- Sauvegardes d'interviews (`.json` exportés depuis l'app) ou toute donnée sur les personnes interviewées.

`.gitignore` bloque déjà ces cas ; vérifier quand même `git status` avant chaque commit.
