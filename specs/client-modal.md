# Création et modification des clients — 6 novembre 2026

La vue Clients affiche directement la liste. Le bouton **Nouveau client**
ouvre le formulaire dans un dialogue centré, avec deux colonnes sur
ordinateur et une colonne défilante sur mobile. Le thème clair/sombre
reprend les tokens de l'application.

Chaque ligne dispose également d'un bouton **Modifier**, ouvrant la même
fenêtre avec le numéro et les coordonnées du client sélectionné : nom, prénom,
téléphone, email, adresse, ville, code postal et type. **Rétablir** annule la saisie et
remet les valeurs à l'ouverture ; **Enregistrer les modifications** appelle
`PUT /api/clients/:id` puis remplace la ligne dans la liste, sans doublon.
Le numéro de dossier est affiché dans le titre et peut être modifié dans le
champ **N° de client**. L'identifiant interne et le secteur affecté depuis
Paramètres sont conservés. Changer de client ou passer à la création
réinitialise la saisie.

La fermeture est possible avec Annuler, la croix ou Échap. Un clic sur le fond
conserve la fenêtre ouverte et les valeurs saisies. Le
focus reste dans la fenêtre puis revient au bouton déclencheur. Les champs
et les fermetures sont désactivés pendant l'enregistrement. Une erreur de
validation ou de l'API conserve les valeurs ; une réussite actualise la
liste, ferme le dialogue et réinitialise le formulaire.

La création, la modification et la suppression sont réservées aux
administrateurs et magasiniers ; les boutons sont désactivés pour le caissier.
Les écritures Clients exigent une confirmation serveur (`useResource` avec
`allowOfflineWrites: false`) : erreur réseau,
service indisponible ou refus API conservent le formulaire et la liste,
sans succès local simulé. Les autres vues conservent leur repli local existant.

## Numéro de client

Le numéro accepte de **1 à 6 chiffres ASCII** (`0` à `9`). Le formulaire
limite la saisie à six caractères et propose le clavier numérique sur mobile.
Les validations du formulaire et de l'API refusent lettres, ponctuation,
espaces internes et chiffres Unicode. Les espaces de bord sont retirés et
les zéros initiaux conservés. Le numéro est unique ; un doublon
renvoie `409 CLIENT_NUMBER_EXISTS` et le message « Ce numéro de client est
déjà utilisé. », sans modifier les autres champs ni fermer le formulaire.

| Requête | `numeroClient` absent | Vide ou espaces | Numéro renseigné |
| --- | --- | --- | --- |
| `POST /api/clients` | Attribution automatique | Attribution automatique | Numéro choisi |
| `PUT /api/clients/:id` | Numéro conservé | Refus 422 | Numéro remplacé |

La génération automatique attribue un numéro sur six chiffres, entre
`000001` et `999999`. Elle part de l'id interne modulo cette plage, passe
les numéros occupés et revient au début après `999999` : un id interne à sept
chiffres ne produit jamais un numéro trop long. Une transaction et l'index
unique existant assurent la cohérence en cas de concurrence ou d'échec ;
aucun numéro temporaire n'est publié. Une plage saturée renvoie
`409 CLIENT_NUMBER_EXHAUSTED` sans insertion partielle.

Les anciens numéros alphanumériques restent stockés et lisibles ; leur
remplacement est explicite. À l'ouverture d'une ancienne fiche, un conseil
demande un numéro conforme avant sauvegarde. Une requête partielle omettant
`numeroClient` conserve le numéro existant. La largeur historique de la
colonne est conservée : aucune migration nécessaire. Les commandes, ventes
et retours restent rattachés à l'identifiant interne du client ; leurs lignes
ne sont pas modifiées.

## SIRET des professionnels

Le champ **SIRET** apparaît uniquement lorsque le type **Professionnel** est
sélectionné. Il est facultatif et accepte exactement 14 chiffres ASCII,
sans espaces internes. Les espaces de bord sont retirés et les zéros initiaux
conservés. La saisie est limitée à 14 caractères, avec clavier numérique sur
mobile et message d'erreur relié au champ. Le contrôle porte sur le format,
sans vérification Luhn ni consultation d'un registre externe.

Le SIRET est prérempli en modification et visible dans une colonne triable.
Une bascule de type sans sauvegarde conserve la saisie. Un enregistrement
comme **Particulier** efface le SIRET, après indication dans le formulaire ;
une erreur de SIRET désormais masquée ne bloque pas cette sauvegarde.
Rétablir et Annuler conservent leur fonctionnement habituel.

| Requête | Effet sur le SIRET |
| --- | --- |
| Création professionnelle, SIRET absent/vide/null | `NULL` |
| Modification professionnelle, clé `siret` omise | Valeur conservée |
| Modification professionnelle, vide/espaces/null | Valeur effacée |
| Valeur renseignée pour un professionnel | 14 chiffres, sinon refus 422 détaillé |
| Création ou passage en particulier | `NULL`, même si un SIRET valide est envoyé |
| PUT avec SIRET seul sur un particulier | Reste `NULL` |

Le contrôle du type courant lors d'un PUT partiel s'effectue dans la même
écriture SQL, afin qu'un changement concurrent vers particulier ne laisse
aucun SIRET. Les autres champs et les relations métier sont conservés.
La migration `0010_client_siret.sql` ajoute `clients.siret VARCHAR(14) NULL`.
Exécuter `npm run db:migrate` avant de redémarrer l'API sur les autres
installations. Sur la base configurée, la migration est appliquée et les
quatre clients existants ont été vérifiés inchangés, avec SIRET à `NULL`.

## Vérification

Build, lint, typage strict du nouveau script API et traduction des erreurs
réussis. **157 contrôles Chromium** : préremplissage des neuf champs de base,
annulation, rétablissement, focus, validation, refus 422/409/403/404,
erreur 503, coupure réseau, sauvegarde lente sans double envoi, numéro modifié
et secteur conservé, remplacement et tri de la ligne, relecture
après rechargement, passage à un autre client, création et droits des trois
rôles. Aucun débordement ni erreur JavaScript observés sur quatre largeurs
(375, 768, 1024, 1440 px) et deux thèmes. L'accès au bouton Enregistrer par
défilement est vérifié ; création avec numéro automatique ou personnalisé.
La limite native de six caractères, le refus des valeurs invalides même
après contournement HTML et la correction explicite d'un ancien numéro sont
également contrôlés. La recette SIRET vérifie l'affichage conditionnel, les
formats et le contournement de la limite HTML, les transitions de type,
l'effacement, la relecture, la création et la conservation après panne.

Recette reproductible : `npm run build`, puis
`node scripts/test-clients-ui.mjs`. Playwright et Chromium doivent être
disponibles ; `PLAYWRIGHT_MODULE` peut désigner l'URL d'un module externe.
Les réponses API sont simulées dans le navigateur, y compris mises à jour
et rechargements : aucune écriture MariaDB. Le script utilise le build de
production et arrête son serveur à la fin. L'avertissement Vite préexistant
sur le bundle JavaScript persiste (574,38 kB).

**MariaDB réelle jetable** : 9 scénarios SIRET via
`node --import tsx scripts/test-client-siret.ts --all`, 123 contrôles API et
59 contrôles sécurité réussis. La recette couvre notamment les changements
de type concurrents, les PUT partiels, les zéros initiaux, les droits et le
CSRF. Les 11 scénarios fournisseurs sont également réussis après partage de
leur validation SIRET.

Les 12 scénarios de numérotation restent réussis. Recette :
`node --import tsx scripts/test-client-numbers.ts --all`, avec `TEST_DB_HOST`,
`TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` pointant vers une instance
de test autorisant la création de bases. Le script crée et supprime sa propre
base et lance une API isolée. Il contrôle doublons, génération automatique
et retour au début après `999999`, limites de longueur et format, compatibilité
des anciens numéros, concurrence, annulation après erreur, droits, CSRF et
conservation des liens métier. Ne pas lancer les suites API historiques sur
la base applicative.

## Correction Échap dans l'aperçu intégré

La fermeture clavier écoute désormais explicitement `keydown` sur le
document pendant l'ouverture, en complément du `cancel` natif de `<dialog>`.
Cela couvre les événements relayés par un aperçu sans annulation native.

Contrôle ciblé avant/après : avant correction, le clavier Chromium ferme la
fenêtre mais un `keydown` relayé seul la laisse ouverte. Après correction,
les neuf cas (touche réelle ou relayée depuis champ, liste fermée, bouton,
résumé d'erreurs ou document) ferment la fenêtre avec restitution du focus
et du défilement. L'écoute est retirée après fermeture ; la sauvegarde en
cours reste protégée et Échap fonctionne à nouveau après un refus API.
Build et lint réussis. L'aperçu hôte n'a pas été piloté directement : les
événements relayés ont été simulés dans Chromium avec des réponses API
fictives, sans écriture MariaDB. Voir le
[relevé ciblé](screenshots/client-modal/escape-verification.json).

## Captures

Modification : [liste avec actions](screenshots/client-edit/liste-desktop.png),
[ordinateur clair](screenshots/client-edit/modification-light-1440.png),
[ordinateur sombre](screenshots/client-edit/modification-dark-1440.png),
[mobile clair](screenshots/client-edit/modification-light-375.png),
[mobile sombre](screenshots/client-edit/modification-dark-375.png) et
[relevé des 157 contrôles](screenshots/client-edit/verification.json).
[Création avec numéro personnalisé](screenshots/client-edit/creation-numero-personnalise.png).

SIRET professionnel : [ordinateur clair](screenshots/client-edit/siret-light-1440.png),
[ordinateur sombre](screenshots/client-edit/siret-dark-1440.png),
[mobile clair](screenshots/client-edit/siret-light-375.png),
[mobile sombre](screenshots/client-edit/siret-dark-375.png).

Captures de la création (4 novembre) :

| Vue | Clair | Sombre |
| --- | --- | --- |
| Fenêtre sur ordinateur | [Capture](screenshots/client-modal/client-desktop-light.png) | [Capture](screenshots/client-modal/client-desktop-dark.png) |
| Fenêtre sur mobile | [Capture](screenshots/client-modal/client-mobile-light.png) | [Capture](screenshots/client-modal/client-mobile-dark.png) |

[Liste des clients](screenshots/client-modal/clients-list-desktop.png) ·
[Relevé des contrôles](screenshots/client-modal/verification.json).

Sur mobile, faire défiler le dialogue pour accéder à tous les champs et
aux actions du formulaire.
