# Paramètres — feuille de route et état livré

Actualisation : **5 novembre 2026**. Les huit exigences de
[`TODO.md`](../TODO.md) disposent désormais de vues, routes et sauvegardes.
Le guide [Administration des paramètres](parametres.md) décrit l'utilisation,
les API, la migration et les procédures de déploiement et de récupération.

## État des huit exigences

| Exigence | Livraison | Prise d'effet |
| --- | --- | --- |
| Base de données | Formulaire serveur/port/base/utilisateur/mot de passe, test de connexion et des tables nécessaires, sauvegarde côté serveur, indication du redémarrage requis. | Prochain démarrage du pool commun Express/Drizzle. |
| Limites API | Nombre de requêtes et fenêtre configurables par IP, réponses 429 et `Retry-After` conservés. | Requêtes suivantes ; fenêtre remise à zéro si sa durée change. |
| Tentatives de connexion | Nombre d'échecs, fenêtre et blocage configurables par email normalisé. Succès réinitialisant le compteur ; `/me` et `/logout` exclus du compteur d'échecs. | Requêtes suivantes ; blocages en cours conservés jusqu'à échéance. |
| Emplacements | Gestion allée → étagère → place partagée entre Stock et Paramètres ; parents numériques, capacité zéro, droits et refus de suppression préservés. | Immédiate, persistée dans MariaDB. |
| Secteurs | CRUD, activation/désactivation et affectation facultative des clients. Suppression refusée si le secteur est utilisé. | Immédiate, persistée dans MariaDB. |
| Catégories et sous-catégories | CRUD, lien parent/enfant et catalogue alimenté depuis l'API. Reprise des catégories historiques, codes stables, refus de suppression d'un élément utilisé. | Immédiate, persistée dans MariaDB. |
| HTTPS | Import certificat/chaîne PEM et clé privée, contrôle de la paire et de la validité, état et échéance, port et politique HTTP. Express sert le site compilé et l'API. | Prochain démarrage ; maintien HTTP ou redirection 308. |
| Cloudflare Turnstile | Clés et domaines, challenge avant activation, widget de connexion et Siteverify côté serveur avant création de session. | Immédiate ; échec fermé si le service est indisponible. |

## Lots PARAM-01 à PARAM-07

| Lot | État | Validation / complément de déploiement |
| --- | --- | --- |
| PARAM-01 — Socle et base de données | Livré | Neuf pages, accès contrôlés, erreurs explicites, écritures atomiques, concurrence et secrets masqués testés. Migration `0007` à appliquer sur chaque instance. |
| PARAM-02 — Emplacements | Livré | Création puis relecture dans Stock et Paramètres ; droits, hiérarchie, suppression et 13 scénarios de transfert validés. |
| PARAM-03 — Catégories | Livré | CRUD, unicité, inactivation, cohérence catégorie/sous-catégorie et persistance des articles testés. Codes historiques conservés, y compris vides ; ils restent administrables. |
| PARAM-04 — Secteurs | Livré | Affectations client persistantes, retrait d'affectation et suppression protégée testés. |
| PARAM-05 — Quotas | Livré | Paramètres appliqués à chaud, comptes distincts derrière une IP et remise à zéro après succès testés ; protections historiques conservées. |
| PARAM-06 — HTTPS | Livré, recette matérielle restante | Paire valide/invalide, redémarrage, accès HTTPS au site et à l'API, redirection HTTP testés. Fournir un certificat reconnu et valider la chaîne sur les PDA réels. |
| PARAM-07 — Turnstile | Livré, recette Cloudflare restante | Succès/refus/panne et hostname/action testés par simulation Siteverify ; widget, expiration, erreurs et transport contrôlés en navigateur avec simulation. Fournir les clés et domaines du compte Cloudflare pour la recette réelle. |

## Choix retenus et périmètre restant

Les réglages techniques et leurs secrets résident dans un fichier local protégé,
hors Git ; les référentiels métier résident dans MariaDB. Les écritures sont
réservées aux administrateurs, sauf les emplacements, également accessibles
aux magasiniers. Les lectures de référentiels nécessaires aux formulaires
restent accessibles aux utilisateurs authentifiés.

Le changement de base ne déplace ni ne copie les données : la base cible doit
être préparée et migrée. HTTPS termine dans Node ; le renouvellement est manuel
par remplacement de la paire PEM. La confiance du certificat sur les terminaux
reste une étape de déploiement. Les compteurs de quotas sont en mémoire par
processus et doivent être partagés si plusieurs instances sont déployées.

Les secteurs sont attribués manuellement aux clients. Les tournées, leur
planification et leur intégration à Livraisons restent un chantier métier.
L'authentification de la future application Android reste à définir si
Turnstile est activé ; toute connexion à `/api/auth/login` est alors soumise
au challenge, quel que soit le client.

Les autres chantiers de `TODO.md` (inventaire physique, devis, commandes
fournisseurs, etc.) conservent leurs priorités propres.

## Vérifications

Build, lint, typage strict des nouveaux scripts et traduction des erreurs SQL ;
5 groupes unitaires et 8 groupes API Paramètres ; 123 contrôles API historiques,
58 contrôles sécurité et 13 scénarios de transfert. Les essais MariaDB utilisent
une instance et des bases jetables, sans changement de la base applicative.
Les 336 contrôles navigateur passent ; les captures et le bilan sont dans
[`screenshots/parametres/`](screenshots/parametres/).

La migration n'a pas été appliquée à la base de l'application. Aucun certificat
de production, compte Cloudflare réel ou Zebra physique n'a servi à la recette.
