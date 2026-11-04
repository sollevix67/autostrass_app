# Revue CSS — 4 novembre 2026

La refonte reprend la palette bleu et ambre du design system : navigation
bleu nuit, actions bleues, repères ambre et états métier distincts. Les vues
partagent une typographie, des formulaires et des surfaces cohérents dans
les thèmes clair et sombre. Le mode automatique suit le système.

## Organisation

| Fichier | Responsabilité |
| --- | --- |
| `src/tokens.css` | Couleurs sémantiques, polices, espacements, ombres et thèmes |
| `src/index.css` | Base, focus visible et réduction des animations |
| `src/App.css` | Structure, navigation, dashboard, stock et caisse |
| `src/components.css` | Boutons, tableaux, badges, messages et notifications |
| `src/forms.css` | Champs, grilles, filtres et dialogues |
| `src/auth.css` | Connexion et attente de session |

Les surcharges de `modern-enhancements.css` sont supprimées. Les cartes
restent stables au survol ; les transitions concernent les interactions.
Le menu mobile se ferme par navigation, clic sur le fond ou Échap ; Échap
restitue le focus au bouton. Les dialogues de stock restent centrés et les
tableaux défilent dans leur propre conteneur. Chaque vue possède un `h1`.

## Validation

- `npm run build` et `npm run lint` réussis.
- Six feuilles analysées avec PostCSS, aucune variable CSS manquante.
- Chromium/Playwright : **451 contrôles réussis**, dont **104 rendus**
  (13 vues × 4 largeurs × 2 thèmes). Largeurs : 375, 768, 1024 et 1440 px.
- Aucun débordement horizontal de page ni erreur JavaScript observés.
- Transfert mobile contenu dans le viewport, menu et focus vérifiés.
- Erreurs du catalogue déclenchées par soumission vide : bordure d'erreur
  conservée au focus, résumé et messages lisibles. Cases à cocher de 18 px,
  champs mobiles de 16 px, cible tactile du menu de 44 px minimum.
- Thème automatique et préférence de réduction des animations vérifiés.
- 29 couples de couleurs contrôlés par thème : contraste texte minimal
  **4,72:1 en clair**, **6,12:1 en sombre** ; bordure de champ/focus sur
  surface au moins **3,24:1 en clair**, **4,47:1 en sombre**.

Les résultats détaillés sont conservés dans
[`verification.json`](screenshots/css-review/verification.json). Le contrôle
a utilisé le build de production avec des réponses API fictives interceptées
dans le navigateur. Aucune écriture ni connexion MariaDB : cette campagne
valide l'affichage et les interactions locales, pas les workflows backend.
Le script Playwright de contrôle est temporaire et n'ajoute pas de dépendance
au dépôt. Pour une vérification manuelle, lancer `npm run dev` avec son
environnement local, puis parcourir ces mêmes vues et états dans les deux thèmes.

Le CSS compilé passe de 39,06 à **32,57 kB**. L'avertissement Vite préexistant
sur le bundle JavaScript principal persiste (**522,94 kB**).

## Captures

Les noms et données métier montrés ici sont fictifs.

| Vue | Clair | Sombre |
| --- | --- | --- |
| Dashboard, bureau | [Capture](screenshots/css-review/dashboard-light.png) | [Capture](screenshots/css-review/dashboard-dark.png) |
| Clients, bureau | [Capture](screenshots/css-review/clients-light.png) | [Capture](screenshots/css-review/clients-dark.png) |
| Caisse, mobile | [Capture](screenshots/css-review/caisse-mobile-light.png) | [Capture](screenshots/css-review/caisse-mobile-dark.png) |
| Transfert, mobile | [Capture](screenshots/css-review/transfert-mobile-light.png) | [Capture](screenshots/css-review/transfert-mobile-dark.png) |
| Erreurs du catalogue, mobile | [Capture](screenshots/css-review/catalogue-mobile-light.png) | [Capture](screenshots/css-review/catalogue-mobile-dark.png) |
| Connexion, mobile | [Capture](screenshots/css-review/connexion-mobile-light.png) | [Capture](screenshots/css-review/connexion-mobile-dark.png) |

## Graphify et points de suivi

`graphify update .` a actualisé le graphe du code : **2 532 nœuds,
4 826 liens, 174 communautés**. Tous les liens référencent des nœuds présents ;
les empreintes AST des quatre fichiers TSX modifiés correspondent au disque.
Le JSON, le HTML, le rapport, les métadonnées et la sauvegarde sont actualisés.
L'analyse sémantique des documents/images n'a pas été relancée. La CLI
signale 11 SQL sans parseur et 62 fichiers non classifiés, notamment du CSS ;
le graphe ne décrit donc pas les sélecteurs de cette refonte.

Le contrôle visuel a également montré des messages Zod techniques pour
certains champs vides du catalogue. Leur normalisation relève d'un chantier
de validation métier distinct ; les messages existants sont conservés.
