# Paramètres — état de l'existant et feuille de route

Analyse du **5 novembre 2026**, à partir des cinq ajouts de
[`TODO.md`](../TODO.md). Le périmètre retenu est l'analyse et la planification.
Les constats proviennent du code ; ils ne constituent pas une nouvelle
validation en fonctionnement. Aucun paramètre n'est implémenté par cette
intervention.

Le backend actuel est Express 5. La mention NestJS du cahier des charges
est antérieure à ces ajouts ; une migration de framework n'est pas incluse
dans cette feuille de route.

## État des huit exigences

Il n'existe ni vue Paramètres ni route `/parametres` dans
[`App.tsx`](../src/App.tsx). L'entrée Administration mène à Utilisateurs &
droits. Le module doit donc réunir des fonctions existantes et de nouveaux
référentiels.

| Exigence | Existant vérifié dans le code | Travail restant |
| --- | --- | --- |
| Base de données | Pool MariaDB et Drizzle initialisés à partir de `DB_*` au démarrage dans [`client.ts`](../server/db/client.ts) ; scripts de migration existants. | Définir puis fournir le périmètre d'administration : état de connexion et configuration. Distinguer les paramètres de démarrage des paramètres modifiables en cours d'exécution. |
| Limites de requêtes API | Limiteur global en mémoire, 100 requêtes par IP sur une fenêtre de 15 minutes ; plafond de 1 000 sous `NODE_ENV=test`. | Rendre les valeurs configurables, préciser la prise d'effet et conserver les réponses 429 avec `Retry-After`. |
| Limites de tentatives de connexion | Limiteur sur `/api/auth` et compteur d'échecs sur `/login`, avec valeurs inscrites dans le code. | Harmoniser les compteurs et leur identité avant de les exposer dans Paramètres. |
| Emplacements : allée → étagère → place **(ajout)** | Tables hiérarchiques, liste, création, modification et suppression via `/api/emplacements`, formulaires dans [`StockView.tsx`](../src/views/StockView.tsx). | Donner accès à cette gestion depuis Paramètres en réutilisant le même contrat et les mêmes données ; conserver les usages dans Stock. |
| Secteurs de livraison **(ajout)** | Livraisons rattachées à une commande, avec transporteur, adresse, dates et statut. Aucun référentiel secteur/tournée ni rattachement client à un secteur trouvé dans les schémas, migrations ou API. | Créer le référentiel, son administration et le rattachement des clients. Préparer son utilisation par les futures tournées. |
| Catégories et sous-catégories d'articles **(ajout)** | Sept catégories codées en dur dans [`CatalogueView.tsx`](../src/views/CatalogueView.tsx) ; `articles.category` est une chaîne persistée par [`articleRepository.ts`](../server/repositories/articleRepository.ts). Aucun référentiel de sous-catégories. | Créer les référentiels et leur relation parent/enfant, reprendre les valeurs existantes et alimenter le catalogue depuis l'API. |
| Certificats SSL / HTTPS **(ajout)** | L'API charge `config/ssl/localhost.crt` et `localhost.key` au démarrage, si les deux existent ; port HTTPS configurable par `HTTPS_PORT`. | Définir la gestion des certificats, leur validation, leur renouvellement et leur activation. Couvrir aussi l'accès au frontend et le déploiement sur les terminaux. |
| Cloudflare Turnstile **(ajout)** | Aucune intégration, variable dédiée, widget ni vérification serveur trouvés dans le code applicatif. | Ajouter la configuration et la vérification du challenge dans le parcours de connexion, avec activation explicite. |

## Points qui conditionnent l'implémentation

**Limitation des connexions.** Dans
[`rateLimit.ts`](../server/middleware/rateLimit.ts), `authRateLimit()` compte
tous les appels sous `/api/auth`, y compris les succès et les routes autres
que `/login`. Son identité cherche un champ `login`, tandis que le formulaire
et le schéma utilisent `email` : les requêtes actuelles retombent sur l'IP.
Le compteur de [`csrf.ts`](../server/middleware/csrf.ts), monté sur `/login`
dans [`authRoutes.ts`](../server/middleware/authRoutes.ts), compte les échecs
par IP et famille de route, avec remise à zéro après réussite. Le plafond
global s'ajoute aux deux. Le futur réglage doit définir une politique
cohérente, notamment pour les caisses et PDA partageant une même IP.

**HTTPS.** Le code de [`server/index.ts`](../server/index.ts) laisse aussi
un serveur HTTP actif lorsque HTTPS est disponible ; ce serveur répond à
l'application, sans redirection vers HTTPS. Les fichiers sont chargés une
fois au démarrage. [`vite.config.ts`](../vite.config.ts) ne configure pas
HTTPS pour le frontend et relaie `/api` vers HTTP sur le port 3001. Le support
HTTPS de l'API ne suffit donc pas à déclarer un accès HTTPS complet au site
ou une chaîne de confiance validée sur Zebra TC22.

**Emplacements.** Les écritures API exigent authentification, CSRF et rôle
magasinier (ou admin). La suppression refuse un emplacement avec enfants
ou stock alloué. Une entrée dans Paramètres doit conserver ces règles et
réutiliser la hiérarchie existante, sans créer un second référentiel.
Le fonctionnement complet du formulaire n'a pas été retesté pendant cet
audit documentaire.

## Ordre d'implémentation proposé

Cet ordre concerne le chantier Paramètres. Il n'annule pas les chantiers
métier ouverts : inventaire physique, devis et commandes fournisseurs.
Les identifiants ci-dessous servent au suivi ; tous les lots restent à faire.

| Lot | Contenu et dépendances | Critères de validation |
| --- | --- | --- |
| PARAM-01 — Socle et base de données | Créer la navigation et la vue Paramètres, les contrats et validations partagés. Restreindre les réglages techniques à l'administrateur. Séparer configuration de démarrage, secrets et paramètres métier persistés. Exposer l'état de la connexion MariaDB ; préciser la procédure de modification de `DB_*`. | Accès direct et navigation contrôlés ; erreurs de connexion compréhensibles ; aucun secret renvoyé au navigateur ; prise d'effet ou redémarrage requis explicite. |
| PARAM-02 — Emplacements | Après PARAM-01, réutiliser ou extraire la gestion existante de Stock pour la rendre accessible depuis Paramètres. Garder les autorisations métier existantes. | Même hiérarchie visible dans les deux vues après rechargement ; création/édition cohérentes ; suppression refusée si enfants ou stock ; transferts inchangés. |
| PARAM-03 — Catégories | Après PARAM-01, créer les tables et API des catégories/sous-catégories puis brancher le catalogue. Migrer les valeurs réellement présentes dans `articles.category`, y compris celles hors des sept options actuelles. | Aucune association article perdue ; choix de sous-catégorie limité à sa catégorie ; doublons et suppressions d'éléments utilisés gérés ; affichage et édition cohérents après rechargement. |
| PARAM-04 — Secteurs | Après PARAM-01, créer les secteurs puis le rattachement facultatif des clients. Définir le contrat consommable par Livraisons ; la planification des tournées reste un chantier métier distinct. | Clients existants conservés sans affectation imposée ; secteur sélectionnable et persistant ; désactivation/suppression d'un secteur utilisé gérée ; contrat compatible avec les futures tournées. |
| PARAM-05 — Limites API et connexion | Après PARAM-01, harmoniser les trois niveaux actuels et définir nombre, fenêtre, durée de blocage, identité et prise d'effet. Dimensionner les limites avec l'usage simultané de plusieurs terminaux. | Seuils et fenêtres testés ; succès/échecs comptés selon la politique retenue ; `/me` et `/logout` ne consomment pas le quota d'essais de mot de passe ; comportement derrière une IP partagée vérifié ; 429 et `Retry-After` conservés. |
| PARAM-06 — Certificats HTTPS | Après PARAM-01, choisir la terminaison TLS (Node ou proxy), puis réaliser l'administration adaptée : statut, échéance, remplacement et activation des certificats. Conserver les clés privées hors du dépôt et des réponses API. | Paire certificat/clé valide ; remplacement invalide sans perte de la configuration précédente ; activation et renouvellement vérifiés ; politique HTTP explicite ; site et API utilisables en HTTPS sur le TC22. |
| PARAM-07 — Turnstile | Après PARAM-01 et la définition de PARAM-05, ajouter clé publique, secret côté serveur et activation. Intégrer le widget à la connexion et la vérification serveur avant émission d'une session. Prévoir les domaines de développement et de production. | Jeton absent, invalide, expiré ou déjà utilisé refusé quand le service est activé ; indisponibilité externe traitée sans connexion autorisée par défaut ; secret jamais exposé ; connexion sans challenge uniquement lorsque désactivé ; limites et CSRF conservés. |

Les référentiels devront être décrits dans les schémas Drizzle et accompagnés
de migrations ; aucun schéma de table ni contrat d'API proposé ici n'est
déjà livré. La reprise des catégories nécessite une migration des données,
tandis que les secteurs doivent accepter les clients historiques non affectés.

## Arbitrages à faire lors des lots concernés

- Définir jusqu'où va « Base de données » : diagnostic, édition des réglages
  de démarrage, ou changement de connexion avec procédure de redémarrage.
  Le pool actuel est créé avant toute connexion utilisateur.
- Choisir la terminaison HTTPS et le mode de fourniture/renouvellement des
  certificats pour dimensionner l'écran d'administration.
- Définir si un secteur de livraison est une affectation manuelle ou une
  zone calculée à partir de codes postaux, ainsi que son lien aux tournées.
- Définir le parcours d'authentification de la future application Android
  avant d'étendre Turnstile au-delà de la connexion web.

## Vérification de cette analyse

Lecture croisée de la navigation, des vues Stock/Catalogue/Livraisons/Connexion,
des repositories, des schémas, migrations et middlewares d'authentification,
ainsi que de la configuration Vite et du démarrage serveur. Recherche des
références aux secteurs, tournées, sous-catégories et à Turnstile dans
`src/`, `server/`, `database/`, `scripts/`, le README et `.env.example`.

Aucun accès à la base en fonctionnement, modification de configuration,
test applicatif ou déploiement n'est nécessaire à cette analyse documentaire.
Lors de l'implémentation, prévoir build/lint, tests d'API et de sécurité sur
base jetable, puis contrôles navigateur adaptés aux lots livrés.
