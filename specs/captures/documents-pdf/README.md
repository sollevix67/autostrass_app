# Preuves de personnalisation des documents PDF

Données entièrement fictives. **12 groupes unitaires**, **9 groupes API** et
**74 contrôles Chromium** réussis. Les recettes API utilisent une base, une API
et des réglages jetables ; les recettes UI simulent toute l’API et produisent de
vrais PDF depuis le service pur. Compilation stricte des scripts et lint conformes.

## Documents et rendu natif

| Document fictif | Pages | Captures Windows |
|---|---:|---|
| [Facture personnalisée](facture-personnalisee.pdf) | 1 | [Page 1](facture-personnalisee-page-001.png) |
| [Devis personnalisé](devis-personnalise.pdf) | 2 | [Page 1](devis-personnalise-page-001.png), [page 2](devis-personnalise-page-002.png) |

Le logo procédural bleu reproduit la régression PNG palette 1 bit + tRNS : huit
pixels opaques. [Source](logo-palette-source.png) et
[image préparée RGBA8](logo-palette-prepare.png) sont conservées. Les pixels et
masques alpha incorporés dans les PDF sont contrôlés indépendamment ; le logo
reste visible sur les trois pages natives inspectées. La suite unitaire ajoute
les palettes 2/4 bits et les motifs transparents entrelacés Adam7.

[exemples.json](exemples.json) contient les paramètres fictifs, les nombres de
pages et SHA-256 des PDF ; [rendus.json](rendus.json) relie chaque page à sa capture.

## Interface

[observations-ui.json](observations-ui.json) détaille les 74 contrôles et les six
captures : édition mobile clair/sombre, aperçu desktop/mobile clair/sombre et
présentation enregistrée. Saisie conservée après erreur, annulations/réponses
tardives, délai d’aperçu, Blob/focus, téléchargements, doubles actions, droits,
valeurs par défaut et sauvegarde exclusive sont vérifiés.

Le contenu de l’iframe n’est pas visible sur les captures Chromium de cette
recette. Le PDF téléchargé de l’aperçu est contrôlé sémantiquement. Les trois PNG
natifs Windows montrent les deux documents personnalisés et valident le gabarit
commun. Les fenêtres, contrôles et débordements mobiles sont vérifiés séparément.

Depuis le 28 novembre 2026, le lecteur intégré dessine les pages dans OpenStrass.
La recette `npm run test:pdf-reader:ui` vérifie les pixels et le texte de la page,
la navigation, le zoom et le téléchargement volontaire. Les captures montrent une
[facture sur ordinateur](lecteur-facture-bureau.png) et la
[seconde page d’un devis sur mobile](lecteur-devis-mobile.png).

## Reproduction

Depuis la racine du dépôt :

```powershell
node --import tsx scripts/test-documents-pdf-unit.ts
# TEST_DB_* doit désigner un serveur de recette autorisé à créer une base neuve.
node --import tsx scripts/test-documents-pdf-api.ts
npm run build
node --import tsx scripts/test-documents-pdf-ui.mjs
node --import tsx scripts/generate-documents-pdf-examples.ts
powershell.exe -NoProfile -File scripts/render-pdf-examples.ps1 -Directory "$PWD/specs/captures/documents-pdf"
```

Les dix anciens exemples par défaut et leurs 43 captures sont conservés.
