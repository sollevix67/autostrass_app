# TokenEconomizer — installation Codex

Installation réalisée le 14 novembre 2026, après
[l'analyse du dépôt](tokeneconomizer-analyse.md), sur demande utilisateur.

## État installé

| Élément | Valeur vérifiée |
|---|---|
| Plugin | `tokeneconomizer@tokeneconomizer` |
| Version | `0.1.0` |
| Source | `https://github.com/microsoft/TokenEconomizer` |
| Révision | `7042ea89dd5e5ecbc67ad865ad6e256e61be8bf0` |
| Codex CLI | `0.166.0` |
| Python | `3.13.17` |
| Clone permanent | `~/.codex/plugin-sources/TokenEconomizer` |
| Copie installée | `~/.codex/plugins/cache/tokeneconomizer/tokeneconomizer/0.1.0` |
| Mémoire et configuration du plugin | `~/.tokeneconomizer` |

`codex plugin list --marketplace tokeneconomizer --json` confirme que le plugin
est installé et activé. Le clone permanent doit être conservé : la copie Codex
utilise son package Python. Aucun paquet npm ou Python ajouté à Autostrass.

## Réglages pour Autostrass

Les réglages suivants sont propres au dépôt et stockés hors Git dans
`~/.tokeneconomizer/repos/autostrass-app-0a6a1fa9ea/config.json`.
Ils sont partagés entre les agents de ce dépôt, conformément au fonctionnement
du plugin ; aucun réglage global TokenEconomizer n'a été changé.

| Réglage | Valeur |
|---|---|
| `microskills` | `envfacts` : apprentissage par motifs, sans proposant LLM |
| `toolprune` | `propose` : aucune suppression automatique de capacité |
| `toolprune_protect` | `collaboration`, `image_media` |
| `loopguard` | `nudge`, valeur par défaut conservée |
| `repomap` | `off` |
| `history_import` | `false` |

Le garde peut encore déclencher un appel de modèle s'il détecte une boucle.
L'installation et les vérifications ci-dessous n'ont déclenché aucun appel LLM.
La limite de comptabilité GPT-6 relevée dans l'analyse reste présente à cette révision.

## Hooks et activation

Les cinq événements `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Stop`
et `SessionEnd` sont enregistrés, activés et approuvés. Les manifestes et le
bootstrap installés ont été comparés octet par octet à la source analysée.

L'approbation a été enregistrée avec l'API officielle `config/batchWrite` de
Codex, avec contrôle `expectedVersion`, uniquement pour les cinq clés de ce
plugin. Codex normalise l'empreinte combinée en `trusted_hash` et
`trusted_content_hash`. Une nouvelle instance du serveur local a confirmé
`trustStatus=trusted` et `enabled=true` pour les cinq hooks via `hooks/list`,
sans erreur. Le contrôle d'empreinte demeure actif lors des mises à jour.

**Redémarrer Codex pour charger le plugin dans une nouvelle session.**
La session d'installation était déjà démarrée avant l'ajout ; les vérifications
ont porté sur l'enregistrement et la configuration, sans lancer de session
d'agent connectée à un modèle. Aucune nouvelle approbation des mêmes hooks
n'est attendue tant que leur empreinte reste identique.

## Commandes de contrôle

Depuis la racine d'Autostrass, PowerShell peut appeler directement le bootstrap
installé, y compris avant le premier démarrage des hooks :

```powershell
$teBootstrap = Join-Path $env:USERPROFILE '.codex/plugins/cache/tokeneconomizer/tokeneconomizer/0.1.0/scripts/te_bootstrap.py'
python -X utf8 $teBootstrap cli --host codex config show
python -X utf8 $teBootstrap cli --host codex status --json --explain
python -X utf8 $teBootstrap cli --host codex doctor
```

Dans une nouvelle session Codex, la commande de compétence est
`$tokeneconomizer:status`. Elle peut consommer un tour de modèle dans l'agent ;
les commandes exécutées directement dans un terminal n'en consomment pas.

`doctor` a confirmé Python, l'accès en écriture à l'état du plugin, la confiance
du dépôt et l'absence d'`errors.log`. `repos migrate` a initialisé le registre
sans état à déplacer. Le statut initial contient zéro session, zéro retrait
appliqué et zéro coût ; l'apprentissage commencera avec les nouvelles sessions.
Les preuves synthétiques sont dans
[tokeneconomizer-installation.json](tokeneconomizer-installation.json).

## Mise à jour et retrait

Pour mettre à jour : actualiser le clone permanent avec Git, examiner les
changements, puis relancer `codex plugin add tokeneconomizer@tokeneconomizer`.
Une modification des hooks peut nécessiter une nouvelle approbation Codex.

Pour retirer le plugin : restaurer d'abord les capacités éventuellement
retirées avec `toolprune restore`, puis exécuter
`codex plugin remove tokeneconomizer@tokeneconomizer` et
`codex plugin marketplace remove tokeneconomizer`. Le retrait conserve sa
mémoire locale ; elle ne fait pas partie du dépôt Autostrass.
