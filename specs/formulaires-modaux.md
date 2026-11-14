# Formulaires en fenêtres contextuelles — 10 novembre 2026

Les formulaires de création et de modification de l'application s'ouvrent dans
une fenêtre contextuelle. Les listes et les valeurs enregistrées restent visibles
dans les pages ; un bouton de création ou de modification ouvre la saisie.

| Module | Accès au formulaire |
| --- | --- |
| Véhicules | Nouveau véhicule ; le changement rapide de statut reste dans le tableau. |
| Utilisateurs | Nouvel utilisateur et Modifier l’utilisateur depuis le crayon de la liste, réservés à l'administrateur. |
| Commandes clients | Nouvelle commande avec les lignes d'articles. |
| Livraisons | Nouvelle livraison rattachée à une commande. |
| Retours | Nouveau retour avec les lignes d'articles. |
| Ventes comptoir | Nouvelle vente ; Fermer et garder le panier permet de reprendre la vente. |
| Caisse | Ouvrir la caisse, puis comptage du fond ; la clôture conserve son dialogue existant. |
| Stock | Modifier une ligne et Transfert ; les emplacements avaient déjà leur dialogue. |
| Inventaire | Commencer le comptage après sélection d'une référence. |
| Paramètres | Modifier les paramètres pour MariaDB, quotas API, connexion et plafond de Caisse ; Modifier HTTPS et Modifier Turnstile. |
| Référentiels | Ajouter ou Modifier une catégorie, sous-catégorie ou un secteur. |

Clients, Fournisseurs, Catalogue et Réceptions utilisaient déjà des fenêtres
contextuelles. Les filtres, la sélection de référence d'inventaire et les actions
directes des tableaux restent dans les pages. La connexion reste sur son écran.

La [modification des utilisateurs](utilisateurs.md) conserve le mot de passe
si le champ est vide et protège le rôle de l’administrateur connecté.

## Comportement

`FormDialog` utilise le dialogue natif du navigateur. Le premier champ disponible
reçoit le focus ; Tab reste dans la fenêtre. Échap, la croix et Annuler ferment
la saisie et rendent le focus au déclencheur. Depuis le 14 novembre, un clic
extérieur laisse toutes les fenêtres ouvertes et conserve la saisie, y compris
les confirmations empilées et les dialogues spécialisés. Les dialogues natifs
déclarent `closedby="closerequest"`. Le défilement
de la page est bloqué ; la fenêtre défile si son contenu dépasse la hauteur disponible.

Pendant une sauvegarde, les champs et toutes les fermetures sont bloqués. Une
seconde soumission ne crée pas de seconde requête. Une erreur laisse la fenêtre
ouverte avec les champs et lignes intacts. La fermeture après enregistrement
exige le succès de l'API ; les créations métier et l'édition Stock ne produisent
plus de faux succès en cas de panne réseau.

L'inventaire demande toujours une confirmation avant enregistrement, abandon
d'une saisie ou reprise après conflit. Cette seconde fenêtre se place au-dessus
du comptage. Échap ferme seulement la confirmation ; les quantités restent
disponibles. Un conflit `STOCK_CHANGED` bloque la validation jusqu'au nouveau
comptage confirmé. Le serveur et ses transactions restent inchangés.

Les droits sont conservés. Les champs `clientId`, `commandeId` et `venteId`
sont convertis en identifiants numériques avant validation. Dans Livraisons,
le succès et la remise à zéro attendent désormais la réponse API.

Les paramètres affichent les valeurs sauvegardées dans leur page. Ouvrir leur
fenêtre charge ces valeurs ; les champs secrets commencent vides. Le test de
connexion MariaDB et la lecture des fichiers HTTPS restent dans le formulaire.
Les règles d'application à chaud ou au redémarrage sont conservées.

## Validation reproductible

```text
npm run build
npm run lint
npm run test:forms:ui
npm run test:caisse:ui
node scripts/test-clients-ui.mjs
node scripts/test-fournisseurs-ui.mjs
npm run test:errors
```

`test:forms:ui` couvre 19 parcours et 544 contrôles sur Chromium avec une API
simulée : focus, fermeture explicite, clic extérieur sans fermeture, quatre largeurs et deux thèmes, droits, champs
obligatoires, CSRF, double envoi, erreurs, reprise, lignes, paramètres et
confirmations empilées. Les [captures et le rapport](screenshots/formulaires-modaux/verification.json)
précisent les résultats ; aucune donnée MariaDB n'est modifiée par cette recette.

La recette réelle d'inventaire utilise `node --import tsx scripts/test-inventaire-ui.mjs`
avec les variables `TEST_DB_*`, une base jetable et un build existant.
85 contrôles réussis sur MariaDB portable 11.4.5 isolée ; instance arrêtée après
la recette. Le 14 novembre, les contrôles Clients (155), Fournisseurs (139) et
Caisse (122) passent avec le clic extérieur désactivé. Le contrôle ciblé Catalogue,
Réceptions et Emplacements ajoute 70 assertions sur clic/tap extérieur à 1440/375 px.
Aucun changement serveur ni migration requis pour cette livraison.
