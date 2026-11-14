# Outils UI-Pro restaurés — 14 novembre 2026

Les tests déjà livrés exigeaient les scripts de rafraîchissement des catalogues
et l'évaluateur de pertinence, absents de ce dépôt et de son historique. Ils sont
restaurés depuis [UI UX Pro Max Skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
à la révision figée `6ae86f61f520d6ca229d2f40e070410638c908c5`.
La [licence MIT](../LICENSE) de l'amont est conservée.

Empreintes SHA-256 des fichiers téléchargés, avant adaptation locale :

| Fichier | SHA-256 amont |
|---|---|
| `refresh-google-fonts.py` | `e29e9b19ec69e73214ebe22b2488e1da42e7e30ba75e882e7a7aca336f006a77` |
| `refresh-icon-catalog.py` | `18b51278d8c2236692aa117325f83d2d1c4b82d513e48a2d9e614d376e033235` |
| `evaluate-relevance.py` | `1294b92d3242af84092b37aea7a5a93f7df5cb07721fee36c534de2cdda7703e` |
| `relevance_metrics.py` | `a5126f734365380b3f3390453f25d2f504a6488c6af0fc88256a9529c02e1547` |

Adaptations : le runtime de l'évaluateur se trouve ici dans `scripts/`, les données
dans `../data/`, les fixtures dans `tests/fixtures/`. Le catalogue Phosphor 2.1.1
local et ses fixtures omettent `figma_category` : ce champ reste une extension
facultative, validée et conservée lorsqu'elle existe. La taille par défaut reste
les 1 511 icônes du catalogue versionné ; `--expected-count` permet de verrouiller
explicitement une autre source. Aucun catalogue n'a été rafraîchi en production.

Validation autonome, depuis la racine du dépôt :

```powershell
python -X utf8 -m unittest discover -s .github/prompts/ui-ux-pro-max/scripts/tests
python -X utf8 .github/prompts/ui-ux-pro-max/scripts/evaluate-relevance.py --no-thresholds
```

L'évaluateur mesure les 90 cas sans modifier le classement ni les seuils. Les
empreintes du manifeste de seuils historique sont liées à un autre agencement
du runtime : l'exécution avec seuils signale leur incompatibilité. Les seuils et
les mentions d'approbation n'ont pas été réécrits pour masquer cette différence.
`--no-thresholds` fournit une mesure, sans promouvoir ce manifeste comme approuvé.
