# Administration des paramètres

Le menu **Administration → Paramètres** ouvre `/parametres`. L'administrateur
dispose de neuf rubriques. Le magasinier accède uniquement aux emplacements,
également disponibles dans Stock. Le caissier n'accède pas au module.
Ces droits sont vérifiés dans les routes frontend et dans les API.

## Installation et mise à jour

1. Sauvegarder la base MariaDB et la configuration locale existante.
2. Appliquer `npm run db:migrate` avec la connexion de l'instance concernée.
   La migration `0007_parametres_referentiels` crée catégories,
   sous-catégories et secteurs, reprend les valeurs de `articles.category`
   et ajoute les rattachements facultatifs des articles et clients.
3. Exécuter `npm run build`, puis redémarrer le serveur depuis la racine
   du dépôt avec `npm run dev:api` ou le gestionnaire de processus du déploiement.
   En production, définir `NODE_ENV=production` et un `JWT_SECRET` valide.
4. Se connecter comme administrateur et ouvrir les rubriques à configurer.

Le plafond de Caisse n'exige aucune migration supplémentaire. Le déploiement
du nouveau code serveur exige un redémarrage initial ; les modifications du
plafond depuis les paramètres s'appliquent ensuite sans redémarrage.

La migration est livrée et testée sur bases jetables ; elle n'a pas été
appliquée à la base applicative pendant ce chantier. Les scripts qui utilisent
le client Drizzle commun, dont `db:migrate`, prennent la connexion enregistrée
dans les paramètres, ou `DB_*` en l'absence de connexion enregistrée.

## Stockage et sauvegarde

Les référentiels et affectations résident dans MariaDB. Les paramètres
techniques et le plafond de Caisse résident dans `config/runtime/settings.json`, créé à la première
sauvegarde. `AUTOSTRASS_SETTINGS_FILE` permet de choisir un autre emplacement
absolu, notamment pour une instance isolée ou un volume persistant.

Ce fichier contient les secrets de connexion, la clé privée TLS et le secret
Turnstile. Il est ignoré par Git et n'est pas servi par Express. Le processus
écrit un fichier temporaire puis le renomme atomiquement ; une erreur disque
conserve la configuration précédemment appliquée. Les mises à jour sont
sérialisées et portent `updatedAt` et `updatedBy` (dernière modification,
pas un journal d'audit complet).

Restreindre l'accès au répertoire au compte du service et aux administrateurs.
Le mode `0600` est demandé lors de l'écriture ; sous Windows, configurer aussi
les ACL du répertoire. Les secrets restent en clair sur ce volume et doivent
être sauvegardés dans un emplacement protégé. Les réponses API ne retournent
ni mot de passe, ni clé privée, ni secret Turnstile. Un champ secret laissé
vide dans l'interface conserve sa valeur enregistrée.

## Rubriques et règles

| URL après `/parametres/` | Utilisation | Application |
| --- | --- | --- |
| `base-de-donnees` | Tester et enregistrer hôte, port, base, utilisateur et mot de passe. La connexion et les tables nécessaires sont contrôlées avant sauvegarde. | Au redémarrage. Aucun transfert ni création de base n'est effectué. |
| `limites-api` | Régler le quota global par IP et sa fenêtre en secondes. | Dès les requêtes suivantes. Changer la durée de fenêtre remet le quota de cette IP à zéro. |
| `connexion` | Régler les échecs autorisés par compte, la fenêtre et la durée de blocage. | Dès les requêtes suivantes ; les blocages déjà actifs restent jusqu'à échéance. |
| `caisse` | Régler le plafond du fond de caisse à l'ouverture, en euros avec au maximum deux décimales. | Dès l'ouverture suivante ; les sessions ouvertes et leur clôture conservent leurs montants. |
| `emplacements` | Créer, modifier ou supprimer allées, étagères et places ; choisir le parent et la capacité. | Immédiate ; même gestion que dans Stock. Suppression refusée en présence d'enfants ou de stock. |
| `secteurs` | Administrer les secteurs et affecter les clients. | Immédiate ; suppression refusée si des clients l'utilisent. |
| `categories` | Administrer catégories et sous-catégories proposées au catalogue. | Immédiate ; rattachement contrôlé et suppression des éléments utilisés refusée. |
| `https` | Importer certificat et clé, régler le port et le comportement HTTP. | Au redémarrage. |
| `turnstile` | Saisir clés et domaines, vérifier le challenge, puis activer la protection. | Immédiate sur les nouvelles connexions. |

Les codes et le parent d'une sous-catégorie restent immuables après création.
La désactivation empêche une nouvelle affectation sans supprimer les
rattachements historiques. Les catégories historiques hors de l'ancienne
liste sont conservées ; un code vide historique peut être renommé par son
libellé ou désactivé, mais aucun nouveau code vide n'est accepté.

Le plafond du fond de caisse vaut **10 000 € par défaut**, y compris avec un
ancien fichier de paramètres sans rubrique `caisse`. Le montant est obligatoire
et non négatif ; **0 € autorise uniquement un fond nul**. La borne technique est
9 999 999 999,99 €, capacité du stockage `DECIMAL(12,2)` ; la limite de quantité
par coupure du comptage reste de 10 000 unités. La configuration n'affecte pas
le total théorique ni le comptage de clôture.

La vue Caisse charge le plafond depuis le serveur. **Actualiser** le recharge
sans effacer les quantités ni les notes. L'ouverture est bloquée tant que la
configuration n'est pas disponible. Le serveur relit le plafond à chaque
ouverture, y compris si un administrateur le modifie pendant une saisie.

Le secteur client est facultatif (`secteurId: null` pour retirer l'affectation).
Les tournées et leur planification ne sont pas créées par cette affectation.
Dans le catalogue, `sousCategorieId` est facultatif et doit appartenir à la
catégorie sélectionnée. TVA, EAN13, délai et forcing sont sauvegardés ; le
prix TTC est recalculé côté serveur. La référence reste stable en édition.

Les quotas restent en mémoire dans chaque processus et repartent à zéro
après redémarrage. Le compteur de connexion utilise l'email normalisé et haché
(IP si absent), compte les réponses d'échec et se réinitialise après succès.
`/me` et `/logout` restent soumis au quota global, sans consommer les tentatives
de mot de passe. En multi-instance, prévoir un stockage partagé des compteurs.

## HTTPS et terminaux

Importer un certificat PEM (chaîne comprise si nécessaire) et sa clé privée
PEM non chiffrée. La paire, les dates et sa capacité à créer un contexte TLS
sont vérifiées avant sauvegarde. Une paire refusée ne remplace pas la paire
enregistrée. Le port HTTPS doit différer du port HTTP (`PORT`, 3001 par défaut).

Choisir **Conserver l'accès HTTP** ou **Rediriger vers HTTPS**. La redirection
exige une origine HTTPS complète sans chemin, par exemple
`https://depot.example.fr:3443` ; elle conserve le chemin et la query string
avec le statut 308. Configurer DNS et ports pour que cette origine atteigne
le listener du serveur. Utiliser la redirection pour l'accès de production.

Après `npm run build`, Express sert `dist` et les routes frontend, y compris
les accès directs à `/parametres/...`, sur la même origine que `/api`.
Vite reste le serveur HTTP de développement ; son proxy n'est pas destiné
à suivre une redirection vers un certificat de production. Tester le mode
HTTPS directement sur le site compilé servi par Express.

Le renouvellement consiste à importer la nouvelle paire, l'enregistrer et
redémarrer le service. À défaut de fichier de paramètres, les anciens fichiers
`config/ssl/localhost.crt` et `localhost.key` sont repris automatiquement avec
`HTTPS_PORT`. Une configuration enregistrée prend ensuite priorité.

La validation de la paire ne garantit pas que chaque terminal lui fasse
confiance. Employer un certificat dont le nom correspond à l'URL et une chaîne
reconnue par les postes et PDA ; déployer l'autorité interne sur les terminaux
si nécessaire. La recette réalisée couvre un navigateur Chromium et un
certificat de test. La recette sur Zebra TC22 physique reste à effectuer.

## Cloudflare Turnstile

Créer le widget dans Cloudflare et y déclarer les domaines du dépôt.
Dans Paramètres, saisir la clé publique, la clé secrète et les mêmes noms de
domaines, sans protocole ni port. La vérification préalable utilise l'action
`settings` : l'API refuse l'activation sans résultat Siteverify valide.

À la connexion, le widget utilise l'action `login`. Le serveur vérifie le
succès, l'action et le hostname avant de délivrer une session. Les jetons
absents, refusés, expirés ou déjà consommés ne permettent pas la connexion.
Une panne Cloudflare renvoie une erreur et propose un nouvel essai, sans
désactiver la protection. Les sessions existantes restent utilisables.

La désactivation depuis une session administrateur ne demande pas de
challenge. Prévoir l'accès au serveur pour la récupération si aucune session
administrateur n'est disponible. Toute application utilisant `/api/auth/login`,
y compris un futur client Android, doit fournir `turnstileToken` lorsque la
protection est activée. Les clés de production et le compte Cloudflare réel
n'ont pas été utilisés pendant les tests.

## API

Toutes les écritures ci-dessous exigent une session authentifiée et le jeton
CSRF habituel. Les paramètres techniques et écritures des référentiels sont
réservés au rôle `admin`, sauf les emplacements (admin ou magasinier).

| Méthode et route | Fonction |
| --- | --- |
| `GET /api/parametres` | Réglages techniques, secrets masqués et indicateurs de redémarrage. |
| `PUT /api/parametres/api` | `maxRequests`, `windowSeconds`. |
| `PUT /api/parametres/connexion` | `maxAttempts`, `windowSeconds`, `blockSeconds`. |
| `PUT /api/parametres/caisse` | `maxFondsCaisse` ; réservé à l'administrateur, avec CSRF. |
| `GET /api/caisse/configuration` | Lecture authentifiée de `{ maxFondsCaisse }` uniquement, disponible aux formulaires métier. |
| `POST /api/parametres/base-de-donnees/test` | Test de `host`, `port`, `database`, `user`, `password` facultatif. |
| `PUT /api/parametres/base-de-donnees` | Test puis enregistrement de la connexion. |
| `PUT /api/parametres/https` | `enabled`, `port`, `httpMode`, `publicOrigin`, `certificatePem` et `privateKeyPem` facultatifs. |
| `PUT /api/parametres/turnstile` | `enabled`, `siteKey`, `hostnames`, `secretKey` facultatif, `verificationToken` nécessaire si activé. |
| `GET /api/auth/configuration` | Lecture anonyme de l'état Turnstile et de sa clé publique pour la connexion. |
| `GET/POST /api/categories`, `PUT/DELETE /api/categories/:id` | Catégories : `code`, `libelle`, `actif`. |
| `GET/POST /api/sous-categories`, `PUT/DELETE /api/sous-categories/:id` | Sous-catégories : mêmes champs et `categorieId`. |
| `GET/POST /api/secteurs`, `PUT/DELETE /api/secteurs/:id` | Secteurs : `code`, `libelle`, `actif`. |
| `GET/POST /api/emplacements`, `PUT/DELETE /api/emplacements/:id` | Contrat existant de gestion hiérarchique, partagé avec Stock. |
| `PUT /api/clients/:id` | Affectation via `secteurId`, avec validation d'un secteur actif pour une nouvelle affectation. |
| `GET /api/tva` | Taux de TVA du catalogue, lecture authentifiée. |

Les schémas partagés sont dans [`src/schemas/parametres.ts`](../src/schemas/parametres.ts).
Les référentiels acceptent la lecture par les utilisateurs authentifiés pour
alimenter les formulaires métier. Les éléments utilisés renvoient une erreur
explicite lors d'une suppression ; les erreurs de validation ne sont pas
converties en sauvegardes locales.

## Récupération hors interface

Arrêter le service avant toute modification manuelle du fichier. Sauvegarder
sa version courante dans un emplacement protégé, puis restaurer la dernière
configuration connue comme valide et redémarrer. Un JSON invalide interrompt
le démarrage avec un message demandant sa restauration.

Pour une connexion MariaDB erronée, corriger l'objet `database`, ou retirer
cet objet pour reprendre `DB_*`. Pour un blocage Turnstile sans session
administrateur, passer `turnstile.enabled` à `false`. Pour récupérer HTTP
après une erreur TLS, passer `https.enabled` à `false` et `https.httpMode`
à `serve`, puis corriger la paire et réactiver HTTPS depuis l'interface.
Préserver les autres propriétés et les secrets pendant ces opérations.

## Validation reproductible

`npm run build` et `npm run lint` contrôlent le code. `npm run test:parametres`
enchaîne les tests unitaires, API Paramètres, API historiques et sécurité,
avec une base et un fichier de paramètres jetables. Il requiert les variables
`TEST_DB_*` décrites dans le [README](../README.md) et un build existant pour
vérifier le frontend HTTPS. `npm run test:stock` couvre les transferts.

Les [captures](screenshots/parametres/) et le
[bilan navigateur](screenshots/parametres/verification.json) décrivent les
contrôles Chromium, les quatre largeurs et les deux thèmes. Les simulations
Turnstile sont distinguées des essais réels sur MariaDB et HTTPS.

`npm run test:caisse:ui` vérifie également les paramètres de Caisse et leur
application dans le comptage d'ouverture avec une API simulée. Les
[captures Caisse](screenshots/parametres-caisse/) et le
[rapport](screenshots/parametres-caisse/verification.json) couvrent les droits,
les centimes, la sauvegarde, l'erreur/reprise et l'actualisation du plafond.
