# Clôture de caisse — 10 novembre 2026

La page Caisse conserve le suivi de la session et le journal des mouvements.
Le bouton **Clôturer la caisse** ouvre une fenêtre contextuelle native, selon
le même comportement que les formulaires Clients, Catalogue et Réceptions.

## Utilisation

1. Compter le contenu réel du tiroir, fond de caisse compris. Les quinze coupures
   en euros, de 500 € à 0,01 €, commencent à zéro ; aucune quantité ne provient
   du solde théorique.
2. Saisir les quantités entières, de zéro à 10 000. Chaque coupure affiche son
   sous-total ; le total compté et l'excédent ou le déficit évoluent avec la saisie.
   Une quantité vide ou invalide signale un comptage à compléter.
3. Ajouter éventuellement un commentaire, puis choisir **Vérifier la clôture**.
   La touche Entrée suit la même validation. Le récapitulatif affiche le comptage,
   le théorique, l'écart et le commentaire avant toute écriture.
4. **Revenir au comptage** conserve la saisie. **Confirmer la clôture** envoie
   seulement les coupures dont la quantité est positive et le commentaire.

Annuler, la croix ou Échap depuis le comptage ferment la
fenêtre et abandonnent la saisie. Échap depuis la confirmation revient au comptage.
Un clic sur le fond conserve la fenêtre ouverte, le comptage et le commentaire,
y compris à l'étape de confirmation.
La réouverture commence à zéro. Le focus reste dans la fenêtre et revient au
bouton déclencheur à la fermeture.

Pendant l'écriture, la fermeture et les doubles envois sont bloqués. Une erreur
API apparaît dans la fenêtre, conserve le comptage et exige une nouvelle
confirmation pour réessayer. Le résultat final et l'écart viennent de l'API.
Le calcul serveur, les droits de caisse et les transactions fiscales sont conservés ;
aucune migration n'est nécessaire.

## Vérification reproductible

Après `npm ci`, installer le navigateur avec
`npx playwright install chromium --only-shell`, puis exécuter :

```text
npm run build
npm run test:caisse:ui
npm run lint
npm run test:errors
```

Le script utilise Chromium et une API simulée : aucune connexion ni écriture
MariaDB. `PLAYWRIGHT_MODULE` accepte également l'URL d'une installation externe.
Les tests API réels restent réservés à une base jetable.

**53 contrôles réussis**, dont :

- Quantités vides, négatives, fractionnaires ou supérieures à 10 000 refusées.
- Comptage billets/pièces de 162,88 €, déficit et excédent d'un centime.
- 0,10 € de fond plus 0,20 € d'espèces comparés à trois pièces de 0,10 € sans
  faux écart ; une unité de chaque coupure totalise exactement 888,88 €.
- Comptage vide légitime, filtrage des zéros, commentaire et jeton CSRF transmis.
- Confirmation avant écriture, doubles envois bloqués, échec puis nouvelle tentative.
- Résultat serveur utilisé même si son écart diffère du récapitulatif.
- Focus, clavier, fermeture, réouverture et lecture seule.
- Fenêtre sans débordement à 375, 768, 1 024 et 1 440 px, en clair et en sombre.

Preuves : [rapport de vérification](screenshots/caisse-cloture/verification.json),
[bureau clair](screenshots/caisse-cloture/cloture-desktop-light.png),
[bureau sombre](screenshots/caisse-cloture/cloture-desktop-dark.png),
[mobile clair](screenshots/caisse-cloture/cloture-mobile-light.png) et
[mobile sombre](screenshots/caisse-cloture/cloture-mobile-dark.png).
