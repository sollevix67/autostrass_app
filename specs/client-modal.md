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

La fermeture est possible avec Annuler, la croix, Échap ou le fond. Le
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

## Vérification

Build, lint, typage strict du nouveau script API et traduction des erreurs
réussis. **130 contrôles Chromium** : préremplissage des neuf champs,
annulation, rétablissement, focus, validation, refus 422/409/403/404,
erreur 503, coupure réseau, sauvegarde lente sans double envoi, numéro modifié
et secteur conservé, remplacement et tri de la ligne, relecture
après rechargement, passage à un autre client, création et droits des trois
rôles. Aucun débordement ni erreur JavaScript observés sur quatre largeurs
(375, 768, 1024, 1440 px) et deux thèmes. L'accès au bouton Enregistrer par
défilement est vérifié ; création avec numéro automatique ou personnalisé.
La limite native de six caractères, le refus des valeurs invalides même
après contournement HTML et la correction explicite d'un ancien numéro sont
également contrôlés.

Recette reproductible : `npm run build`, puis
`node scripts/test-clients-ui.mjs`. Playwright et Chromium doivent être
disponibles ; `PLAYWRIGHT_MODULE` peut désigner l'URL d'un module externe.
Les réponses API sont simulées dans le navigateur, y compris mises à jour
et rechargements : aucune écriture MariaDB. Le script utilise le build de
production et arrête son serveur à la fin. L'avertissement Vite préexistant
sur le bundle JavaScript persiste (570,75 kB).

**MariaDB réelle jetable** : 12 scénarios dédiés, 123 contrôles API et
59 contrôles sécurité réussis. Recette :
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
[relevé des 130 contrôles](screenshots/client-edit/verification.json).
[Création avec numéro personnalisé](screenshots/client-edit/creation-numero-personnalise.png).

Captures de la création (4 novembre) :

| Vue | Clair | Sombre |
| --- | --- | --- |
| Fenêtre sur ordinateur | [Capture](screenshots/client-modal/client-desktop-light.png) | [Capture](screenshots/client-modal/client-desktop-dark.png) |
| Fenêtre sur mobile | [Capture](screenshots/client-modal/client-mobile-light.png) | [Capture](screenshots/client-modal/client-mobile-dark.png) |

[Liste des clients](screenshots/client-modal/clients-list-desktop.png) ·
[Relevé des contrôles](screenshots/client-modal/verification.json).

Sur mobile, faire défiler le dialogue pour accéder à tous les champs et
aux actions du formulaire.
