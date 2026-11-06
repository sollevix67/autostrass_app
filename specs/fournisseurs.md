# Création et modification des fournisseurs — 6 novembre 2026

La page affiche la liste des fournisseurs. **Nouveau fournisseur** ouvre le
formulaire dans une fenêtre contextuelle ; **Modifier** ouvre la même fenêtre
avec les valeurs de la fiche, y compris le SIRET et le statut actif.

Le dialogue suit le modèle Clients : deux colonnes sur ordinateur, une colonne
défilante sur mobile, focus initial sur Nom et retour au bouton déclencheur à
la fermeture. Annuler, la croix, Échap et le fond ferment sans enregistrer.
Effacer réinitialise la création ; Rétablir restaure la fiche en modification.
Une sauvegarde réussie ferme la fenêtre et actualise la liste. Un refus garde
la fenêtre et la saisie, avec l'erreur API affichée à l'intérieur. Pendant la
sauvegarde, les champs, les fermetures et les doubles envois sont bloqués.
Les caissiers voient la liste et les boutons désactivés, sans dialogue éditable.

Le formulaire permet d'enregistrer un fournisseur avec uniquement son nom.
Le code, le SIRET, l'email, le téléphone, l'adresse, la ville et le code postal sont
facultatifs. Les coordonnées renseignées sont validées ; une erreur apparaît
près du champ et dans le résumé. Les détails d'un refus API remplacent le
message générique « Données invalides » dans la bannière.

La correction résout deux incompatibilités reproduites : email vide accepté
par le formulaire mais refusé par l'API, et téléphone avec espaces, parenthèses
ou préfixe `+` rejeté par le nettoyeur de codes techniques. Le nettoyeur des
téléphones utilise désormais les règles textuelles puis le contrôle du format ;
ce correctif s'applique aussi aux clients et utilisateurs utilisant ce helper.

## Contrat

| Champ | Règle |
| --- | --- |
| Nom | Obligatoire, 128 caractères maximum, unique |
| Code | Facultatif, 32 caractères maximum, lettres ASCII, chiffres et `. _ / -` |
| SIRET | Facultatif, exactement 14 chiffres ASCII sans espaces, zéros initiaux conservés |
| Email | Facultatif, format email valide |
| Téléphone | Facultatif, 6 à 20 caractères, chiffres et séparateurs usuels, `+` uniquement au début |
| Adresse / ville | Facultatives, 255 / 64 caractères maximum |
| Code postal | Facultatif, 4 à 10 chiffres |
| Délai | Entier de 0 à 2147483647 jours ; 0 par défaut |
| Mode de livraison | Retrait, livraison, express ou franchise ; livraison par défaut |
| Actif | Booléen ; vrai par défaut |

Dans `POST /api/fournisseurs`, une coordonnée absente, vide ou `null` est
stockée à `NULL`. Dans `PUT /api/fournisseurs/:id`, une clé omise conserve
sa valeur ; une chaîne vide, composée d'espaces ou `null` l'efface.
Le formulaire transmet les valeurs validées et normalisées pour la création
et la modification, puis réinitialise la saisie après succès confirmé.

Le SIRET est stocké en texte, prérempli en modification et affiché dans une
colonne triable. Limite de saisie de 14 caractères et clavier numérique mobile.
La validation contrôle le format, sans vérification de clé Luhn ni interrogation
d'un registre d'entreprises. Aucune contrainte d'unicité supplémentaire.

Les écritures exigent une réponse API (`allowOfflineWrites: false`). Un refus
ou une panne conserve les champs et la liste, sans création locale annoncée
comme enregistrée. Les boutons de sauvegarde et d'effacement sont bloqués
pendant l'enregistrement. Admin et magasinier peuvent écrire ; caissier en
lecture seule, avec boutons Modifier/Supprimer désactivés. Authentification,
CSRF, protections contre le markup et requêtes paramétrées conservés.

Le passage en fenêtre contextuelle ne nécessite aucune migration ni modification
API. La migration antérieure `0009_fournisseur_siret.sql` ajoute la colonne nullable
`fournisseurs.siret VARCHAR(14)`. Exécuter `npm run db:migrate` avant de démarrer
l'API mise à jour. Les fournisseurs existants conservent leurs coordonnées et
ont un SIRET vide jusqu'à sa saisie. Les tests s'exécutent sur une base jetable.

## Vérification reproductible

- `npm run build`, `npm run lint`, `npm run test:errors` réussis.
- Recette API existante : `node --import tsx scripts/test-fournisseurs.ts --all`,
  **11 scénarios** de
  contrat et de persistance, **123 contrôles API**, **59 contrôles sécurité**.
  Utiliser `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`
  pour une instance MariaDB de test autorisant la création de bases. Le script
  crée/supprime sa base et lance/arrête son API isolée. Ne pas lancer les suites
  API historiques sur la base applicative.
- Après le build, `node scripts/test-fournisseurs-ui.mjs` : **142 contrôles
  Chromium**, API simulée, quatre largeurs (375/768/1024/1440 px), clair et sombre.
  Playwright/Chromium requis ; `PLAYWRIGHT_MODULE` accepte un module externe.
  Création minimale/complète, correction/effacement/relecture, validation,
  erreurs 422/409/403/503 et réseau, sauvegarde lente, droits et affichage.
  Ouverture création/modification, focus et retour au déclencheur, cinq modes
  de fermeture, réinitialisation/rétablissement, statut actif, nom long et
  double soumission sont également contrôlés.
  Le script arrête son serveur en fin de recette.
- `node scripts/test-clients-ui.mjs` : **157 contrôles Clients** réussis après
  partage des styles des dialogues. Cette modification du frontend n'a écrit
  aucune donnée MariaDB ; les recettes navigateur utilisent une API simulée.

Les contrôles SIRET couvrent les champs vide/omis/null, le format, la limite
native et son contournement, les zéros initiaux, la création, la modification,
l'effacement, la conservation lors d'un PUT partiel et la relecture en base.
Les migrations `0008` précédemment en attente et `0009` ont été appliquées à
la base configurée après recette : les trois fournisseurs existants sont
inchangés, avec `siret = NULL`. Une seconde migration ne modifie rien.

Build : JavaScript 574,58 kB, CSS 38,37 kB ; avertissement Vite préexistant
sur le bundle JavaScript supérieur à 500 kB.

## Captures

[Liste seule](screenshots/fournisseurs/liste-desktop.png) ·
[Modification préremplie](screenshots/fournisseurs/modification-light-1440.png) ·
[Erreur détaillée](screenshots/fournisseurs/erreur-detaillee.png) ·
[Ordinateur clair](screenshots/fournisseurs/creation-light-1440.png) ·
[Ordinateur sombre](screenshots/fournisseurs/creation-dark-1440.png) ·
[Mobile clair](screenshots/fournisseurs/creation-light-375.png) ·
[Mobile sombre](screenshots/fournisseurs/creation-dark-375.png) ·
[Relevé des contrôles](screenshots/fournisseurs/verification.json).
