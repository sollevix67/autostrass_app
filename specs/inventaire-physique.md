# Inventaire physique par référence

Livré le 2026-11-06. Accessible depuis **Stock → Inventaire physique** ou
depuis l’action **Compter** d’une ligne. Le périmètre est le comptage complet
d’une référence ; il ne s’agit pas d’une campagne multi-articles avec brouillons
partagés. Administrateurs et magasiniers peuvent consulter et valider ; le
caissier n’accède ni à l’écran ni aux routes d’inventaire.

## Utilisation

Depuis le 10 novembre, **Commencer le comptage** ouvre une fenêtre contextuelle.
Les confirmations de validation, d'abandon et de reprise s'ouvrent au-dessus de
cette fenêtre ; Échap sur la confirmation conserve le comptage. Le sélecteur
d'article et l'historique restent accessibles dans la page après fermeture.

1. Rechercher une référence, une désignation ou un EAN13, choisir l’article
   et commencer le comptage.
2. Compter chaque emplacement présenté et le stock non affecté. Les champs
   sont volontairement vides : saisir explicitement `0` pour un emplacement
   vide. Ajouter un emplacement actif si l’article est trouvé ailleurs.
3. Indiquer le motif, consulter les écarts et valider la confirmation.
   Toutes les quantités sont entières et positives ou nulles ; le total ne
   peut dépasser 2 147 483 647. Un comptage accepte jusqu’à 500 lignes,
   stock non affecté compris.
4. Le stock total et les allocations sont remplacés ensemble. Les allocations
   à zéro sont retirées et le seuil minimum est conservé. Un résultat sans
   écart est également enregistré, car il atteste du contrôle physique.
5. Consulter l’historique : auteur, date, motif, total avant/après et détail
   par emplacement. Filtre par référence exacte et pagination de 50 résultats.

La saisie en cours n’est pas un brouillon serveur. Annuler demande confirmation
si des valeurs ont été saisies ; les liens vers une autre page sont protégés
et la fermeture/recharge déclenche l’avertissement du navigateur. Le retour
par les boutons d’historique du navigateur n’est pas intercepté. Valider avant
de quitter pour conserver le comptage.

Une panne API conserve les valeurs dans le formulaire et permet une nouvelle
tentative. Aucun stock fictif n’est proposé. En cas de réponse perdue, actualiser
l’historique : le serveur peut avoir enregistré le résultat. Un nouvel envoi
avec la même version ne peut jamais appliquer le comptage deux fois.

## Concurrence et intégrité

Le chargement prend une photographie cohérente de l’article, du solde et de
ses allocations, sans maintenir de transaction ouverte pendant la saisie.
L’empreinte de version intègre l’identifiant article, le total, l’horodatage
du solde, les allocations et le dernier mouvement journalisé. À la validation,
elle est comparée à l’état verrouillé du stock.

Un état différent ou un nouveau mouvement donne `409 STOCK_CHANGED`.
Les valeurs restent affichées, mais une reprise charge l’état actuel et
exige un nouveau comptage. Deux validations simultanées de la même version
ne peuvent pas toutes deux réussir. Un mouvement journalisé puis compensé
est détecté, même si le total revient à sa valeur initiale. Une écriture SQL
externe qui rétablit exactement le même état sans mouvement et dans la même
seconde ne constitue pas une version distincte : ces écritures doivent rester
hors du processus de comptage applicatif.

La transaction utilise `READ COMMITTED` et verrouille dans l’ordre l’article,
le solde, les allocations puis les emplacements concernés. Cet ordre est
compatible avec les transferts ; l’isolation évite les conflits de verrouillage
d’intervalles pour plusieurs articles initialement sans allocations.
La suppression d’un emplacement est sérialisée par le même verrou que son
utilisation. Aucun emplacement supprimé ne peut recevoir de stock.

L’enregistrement dans `inventaires_stock`, le mouvement `INVENTAIRE_PHYSIQUE`
avec son delta réel et l’entrée `journal_actions` font partie de cette même
transaction. Un échec du journal annule aussi le stock et l’historique.
L’auteur provient de la session ; les champs supplémentaires du corps sont
ignorés. Les écritures conservent les protections CSRF et RBAC existantes.

Une répartition historique excédentaire est signalée au chargement. Seul un
comptage complet explicite permet de la remplacer. Une allocation inactive
existante reste comptable ; une allocation vers un emplacement supprimé doit
être comptée à zéro. Les chemins et noms sont conservés dans le résultat,
même après renommage d’un emplacement ou suppression de l’article/l’auteur.
L’API n’offre aucune modification ou suppression des comptages validés ; une
correction nécessite un nouveau comptage.

## Migration et sauvegarde

Appliquer `npm run db:migrate` avant utilisation. La migration additive
`0008_inventaire_stock` crée uniquement l’historique et son index ; elle ne
modifie aucune quantité existante. Elle est validée sur MariaDB 11.4.5 jetable.
La base applicative n’a pas été migrée pendant ce chantier : vérifier son
journal, y compris la migration Paramètres `0007` encore signalée en attente.

Inclure `inventaires_stock`, `stock_movements`, `journal_actions`,
`stock_balances` et `stock_par_emplacements` dans les sauvegardes cohérentes
de MariaDB. L’historique est volontairement autonome, sans suppression en
cascade depuis les référentiels. Les mouvements de stock historiques restent
soumis à leurs contraintes existantes ; le comptage complet reste conservé
dans la nouvelle table et dans le journal global.

## API

| Méthode et route | Contrat |
|---|---|
| `GET /api/inventaires` | Historique, 50 résultats décroissants ; filtres facultatifs `reference` et `before` (identifiant exclusif). |
| `GET /api/inventaires/:reference` | Préparation : référence, désignation, version, total, indicateur d’incohérence et lignes `{ emplacementId, chemin, quantiteAvant }`. |
| `POST /api/inventaires/:reference` | Valide `{ version, motif, lignes: [{ emplacementId, quantiteComptee }] }` ; réponse `201` avec historique enregistré. |

La référence dans l’URL est encodée ; `emplacementId: null` représente le
stock non affecté. Une ligne par emplacement, sans doublon, avec tous les
emplacements de la préparation. Les chaînes numériques sont refusées par
l’API. Les réponses d’inventaire utilisent `Cache-Control: no-store`.

## Vérification reproductible

```sh
npm run build
npm run lint
npm run test:errors
npm run test:inventaire
npm run test:integration
```

`test:inventaire` crée et supprime sa base et son API isolées via
`scripts/lib/test-environment.ts`. Il utilise `TEST_DB_*` comme les tests de
transfert. Les **14 scénarios** couvrent droits/CSRF, nombres et motifs,
exhaustivité, écarts négatifs/positifs/nuls, allocations épuisées ou nouvelles,
incohérences historiques, emplacements inactifs/orphelins, rejouage, concurrence
sur une ou plusieurs références, transferts intermédiaires, suppression
d’emplacement, rollback du journal et conservation/pagination de l’historique.
`test:integration` enchaîne les 13 scénarios de transfert, 123 contrôles API,
58 contrôles de sécurité et les scénarios d’inventaire.

La recette navigateur est conservée dans `scripts/test-inventaire-ui.mjs`.
Après build, exécuter `node --import tsx scripts/test-inventaire-ui.mjs` avec
les mêmes `TEST_DB_*`. Playwright et son Chromium doivent être disponibles ;
`PLAYWRIGHT_MODULE` peut désigner l’URL `file:///.../playwright/index.mjs`
d’une installation de test externe, sinon le script importe `playwright`.
Aucune dépendance Playwright n’est ajoutée à l’application.

La recette utilise l’API et MariaDB réelles sur un environnement jetable.
Les **84 contrôles navigateur** réussissent, sans erreur JavaScript.
Le navigateur relaie `/api` vers cette API isolée ; seule la panne API et le
retard d’une sauvegarde sont simulés dans leurs cas dédiés. Elle contrôle
375/768/1024/1440 px, thèmes clair/sombre, recherche EAN13, saisie vide ou
fractionnaire, écarts, nouvelle allocation, confirmation/Échap/focus,
protection de navigation, erreur et nouvelle tentative, sauvegarde lente,
persistance, conflit puis recomptage, abandon et droits admin/magasinier/caissier.
Les captures et le relevé se trouvent dans
[`screenshots/inventaire/`](screenshots/inventaire/).

Le build conserve l’avertissement Vite sur le bundle principal >500 kB.
Le comptage sur PDA Zebra physique et les campagnes d’inventaire multi-articles
avec reprise de brouillons ne font pas partie de cette livraison.
