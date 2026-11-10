# Comptage du fond de caisse à l'ouverture — 10 novembre 2026

Le formulaire **Ouvrir la caisse** permet de compter les billets et pièces remis
dans le tiroir. Les quinze coupures, de 500 € à 0,01 €, commencent à zéro.
Saisir la quantité de chaque coupure ; laisser zéro pour les coupures absentes.

Les sous-totaux et le fond compté évoluent avec les quantités. Le calcul utilise
des centimes entiers. Le total calculé devient automatiquement le fond de caisse
enregistré ; le montant global n'est plus saisi séparément.

Les quantités vides, négatives, fractionnaires ou supérieures à 10 000 sont
refusées. Le fond total est limité à 10 000 €, comme auparavant. Un fond nul
reste possible. Les notes sont facultatives.

Le bouton **Ouvrir la caisse** et la touche Entrée suivent la même validation.
Pendant l'enregistrement, les champs et les doubles envois sont bloqués.
Une erreur API conserve les quantités et les notes pour permettre une nouvelle
tentative. Le succès affiche la session et le fond confirmé par le serveur.

Le comptage de clôture commence indépendamment à zéro et compare le contenu
du tiroir au fond d'ouverture plus les espèces encaissées. Les champs et le
calcul sont partagés entre les deux formulaires.

## Enregistrement et vérification

Le contrat `POST /api/caisse/ouvrir` conserve `fondsCaisse` et `notes`.
Le total compté est enregistré dans la session et le mouvement d'ouverture.
Le détail par coupure est une aide de saisie à l'ouverture ; seul le total
du fond est persisté. Aucun changement serveur ni migration nécessaire.

```text
npm run build
npm run test:caisse:ui
npm run lint
npm run test:errors
```

La recette utilise Chromium avec une API simulée, sans connexion ni écriture
MariaDB. Playwright est installé par `npm ci` ; installer également Chromium
avec `npx playwright install chromium --only-shell` si nécessaire.

**34 contrôles d'ouverture et 53 contrôles de clôture réussis** : calcul des
centimes (150,30 € et 888,88 €), quantités invalides, plafond refusé à 10 000,01 €
et accepté à 10 000 €, fond nul, notes, jeton CSRF, erreur/reprise, double envoi,
indépendance des comptages, fond repris dans le théorique et lecture seule.
Huit variantes d'affichage à 375, 768, 1 024 et 1 440 px, en clair et sombre.

Preuves : [rapport](screenshots/caisse-ouverture/verification.json),
[bureau clair](screenshots/caisse-ouverture/ouverture-desktop-light.png),
[bureau sombre](screenshots/caisse-ouverture/ouverture-desktop-dark.png),
[mobile clair](screenshots/caisse-ouverture/ouverture-mobile-light.png) et
[mobile sombre](screenshots/caisse-ouverture/ouverture-mobile-dark.png).
