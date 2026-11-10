# Modification des utilisateurs

Dans **Administration → Utilisateurs et droits**, le bouton crayon de chaque
compte ouvre **Modifier l’utilisateur**. La gestion des comptes est réservée
aux administrateurs, dans l’interface et dans l’API.

Le dialogue préremplit le nom, le prénom, l’email, le téléphone et le rôle.
**Nouveau mot de passe** reste vide : ce champ n’est envoyé que si un nouveau
mot de passe est saisi. La création conserve son mot de passe obligatoire.
Les règles serveur existantes continuent de s’appliquer, dont l’unicité de
l’email et le refus des mots de passe courts ou de démonstration.

Vider le téléphone l’efface. Pour les clients API, `PUT /api/utilisateurs/:id`
accepte désormais `telephone: null` ; une clé absente conserve le numéro.
La modification du profil ne change pas l’activation du compte : le bouton
Oui/Non de la liste conserve cette fonction.

L’administrateur peut modifier ses propres coordonnées et son mot de passe.
Son rôle reste administrateur ; la suppression et la désactivation de son
propre compte restent interdites. Les protections `SELF_LOCKOUT` sont conservées
côté serveur. Un changement de rôle exige la reconnexion du compte concerné.

Après une modification de soi, le nom et le prénom affichés sont actualisés.
`GET /api/auth/me` utilise le middleware d’authentification existant pour relire
l’identité en base et vérifier les droits, y compris à la restauration de
session. Le frontend conserve le nouveau jeton CSRF délivré par cette route.

Pendant l’enregistrement, les champs et la fermeture sont bloqués ; un deuxième
envoi est ignoré. Une erreur conserve la saisie et affiche le refus dans le
dialogue. Un succès met à jour la liste et ferme la fenêtre. Annuler ou Échap
effacent le mot de passe saisi et rendent le focus au bouton de modification.

Aucune migration SQL. Redémarrer l’API après mise à jour pour charger les
changements des routes et de la validation serveur.

## Recette

Après `npm run build`, exécuter `npm run test:utilisateurs:ui`. Chromium et des
identifiants `TEST_DB_*` (ou `DB_*`) permettant de créer une base jetable sont
nécessaires. La recette crée sa propre base, charge schéma/migrations/seeds et
démarre une API isolée ; elle arrête l’API et supprime la base après exécution.
`DB_NAME` n’est jamais une cible de test. `--all` ajoute les suites API et sécurité.

La recette vérifie la persistance réelle, les mots de passe conservés/remplacés,
les emails en doublon, les droits, CSRF, l’identité de session, la reprise après
panne, les doubles envois, la création et les dialogues à quatre largeurs dans
les deux thèmes. Les captures et le rapport sont dans
[`screenshots/utilisateurs/`](screenshots/utilisateurs/).

Recette du 10 novembre 2026 : 63 contrôles utilisateurs, 127 contrôles API et
59 contrôles sécurité réussis, sur MariaDB portable 11.4.5 isolée. Build, lint
et `test:errors` conformes ; cinq captures conservées. Base jetable supprimée
et instance MariaDB arrêtée après exécution.
