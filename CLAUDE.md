# Cartes d'interview — guide pour modifier et reconstruire l'app

Web-app pour tablette (iPad) qui affiche des cartes de questions pendant des interviews de rue,
en chinois, anglais et français. La personne interviewée lit la carte et répond dans sa langue ;
la traduction se fait au montage.

Réponds en français, de façon directe et concrète.

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
        ├── version.json        numéro de version (géré par build.mjs)
        ├── package.json / package-lock.json
        └── sources/            polices sources, JSZip, licences
```

Adresse publiée : https://akashl-eu.github.io/cartes-interview/

**Règle d'or : on ne modifie que `source/cartes-interview.html`** (et les outils si besoin), puis on reconstruit.
Les fichiers de la racine sont écrasés à chaque build.

## Première installation (une fois par ordinateur)

1. Node.js 18 ou plus récent.
2. `cd source/outils && npm install`
3. Police chinoise : `source/outils/sources/NotoSansSC-VF.ttf` n'est **pas dans git** (17 Mo).
   La récupérer chez Google Fonts (Noto Sans SC, fichier **variable** `NotoSansSC[wght].ttf`, dépôt google/fonts, dossier `ofl/notosanssc`),
   la renommer `NotoSansSC-VF.ttf` et la placer dans `source/outils/sources/`.
   Fichier utilisé pour la v2 : 17 772 300 octets, SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`.
   Une autre version de la police marche aussi, mais changera les fichiers de polices (donc la version).
   Sans ce fichier, `build.mjs` s'arrête avec un message clair.

`BricolageGrotesque-VF.ttf` (400 Ko) est dans le dépôt, rien à faire.

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
- Réduit les polices aux caractères de l'app (Noto Sans SC 500/900 ; Bricolage Grotesque 400/600/800 + tous les caractères latins tapables).
- Copie JSZip, génère les icônes (resvg), le manifeste, `index.html` et `sw.js`.
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
- Les icônes PNG ne sont pas encodées octet pour octet pareil sur Windows et sur Linux (image identique).
  Un build sur un autre système augmente donc la version même sans changement : sans danger, mais à éviter pour rien.
  Les builds publiés jusqu'ici (v1, v2) ont été faits sous Windows.

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
