# Personnalisation des documents PDF

Dans **Administration → Paramètres → Documents PDF**, l'administrateur peut
personnaliser l'en-tête et le pied de page communs aux factures et devis.
Le [gabarit A4 partagé](documents-commerciaux.md) conserve les tableaux,
les informations propres au document et les montants métier.

## Utilisation

La page présente les réglages enregistrés. **Modifier les documents**
ouvre le formulaire dans une fenêtre ; ses changements restent un brouillon
jusqu'à **Enregistrer**. Un refus de validation ou une erreur de sauvegarde
conserve la saisie. **Annuler** abandonne le brouillon.

| Réglage | Utilisation | Limite |
| --- | --- | --- |
| Nom de l'émetteur | Nom affiché dans l'en-tête et dans le bloc de l'entreprise. | Une ligne, 80 caractères, requis. |
| Activité ou sous-titre | Texte placé sous le nom dans l'en-tête ; peut être effacé. | Une ligne, 180 caractères. |
| Coordonnées de l'émetteur | Adresse, coordonnées et autres informations fournies, dans le bloc gauche. | Huit lignes de 120 caractères. |
| Logo | Image importée dans l'en-tête, avec une action pour la retirer. | PNG ou JPEG, 256 Ko, 1 024 × 1 024 pixels maximum. |
| Pied de page commun | Mentions libres répétées sur les pages du document. | Six lignes de 100 caractères. |

Les retours à la ligne des coordonnées et du pied de page sont conservés.
**Valeurs par défaut** remet le brouillon au nom OpenStrass, à sa signature
« OpenStrass - Gestion commerciale et logistique open source », sans logo,
coordonnée ou mention supplémentaire. Il faut ensuite enregistrer pour appliquer
ce choix.

**Aperçu fictif** compose un document avec les valeurs du brouillon et des données
entièrement fictives. Il ne crée ni facture, ni devis, ni enregistrement métier,
et n'enregistre pas les paramètres. Le lecteur intégré affiche les pages du
brouillon avec les mêmes commandes de navigation et de zoom que pour une facture
ou un devis. **Télécharger l’aperçu** et **Ouvrir dans un onglet** sont disponibles
dans le lecteur. Fermer l'aperçu restitue le formulaire.

Après sauvegarde, les prochains PDF générés utilisent les réglages enregistrés,
sans redémarrage. Cela inclut le téléchargement d'une vente ou d'un devis déjà
existant : seuls les éléments de présentation viennent des paramètres courants.
Le nom de l'application reste OpenStrass.

## API, stockage et droits

La rubrique et les trois opérations sont réservées à l'administrateur :

| Route après `/api` | Contrat |
| --- | --- |
| `GET /parametres` | Retourne la configuration enregistrée dans `documentsPdf`. |
| `PUT /parametres/documents-pdf` | Valide puis sauvegarde la configuration complète ; retourne les paramètres actualisés. |
| `POST /parametres/documents-pdf/apercu` | Valide le même corps et retourne un PDF fictif, sans sauvegarde. |

Les requêtes PUT et POST exigent le jeton CSRF habituel. Corps attendu :
`nomEmetteur`, `activite`, `coordonnees`, `piedCommun` et `logo`.
Le logo vaut `null` ou `{ mimeType: 'image/png' | 'image/jpeg', data: base64 }`.
Les limites sont partagées dans
[le schéma Zod](../src/schemas/parametres.ts). Le serveur contrôle également
le format, le contenu et les dimensions réelles de l'image avant sauvegarde
ou aperçu. Les SVG, chemins locaux et URL d'image ne sont pas acceptés.

Les valeurs et le logo résident dans `config/runtime/settings.json`, hors Git,
avec les autres [paramètres](parametres.md). Les écritures restent atomiques
et sérialisées ; un échec conserve l'état précédemment enregistré.
Une ancienne configuration sans `documentsPdf` reçoit les valeurs OpenStrass
par défaut à la lecture, sans écriture automatique ni migration SQL.
Le déploiement du nouveau code nécessite le redémarrage initial habituel de l'API.

## Présentation et invariants

Le gabarit adapte les zones réservées à l'en-tête et au pied pour préserver
les textes admis, le logo et la pagination. Les coordonnées s'écoulent dans
le bloc de l'émetteur. Les mentions communes complètent les mentions propres
au document ; le numéro de page reste automatique.

Client et instantané de devis, numéro, date, auteur, articles, prix, TVA, totaux,
règlement et historique fiscal restent les données des documents. Aucun changement
de présentation ne réécrit les ventes, les devis, le stock ou les archives.
Les accès aux ressources PDF restent limités aux quatre polices Roboto locales
et aux images validées embarquées ; aucune ressource distante n'est téléchargée.

Les générateurs [Facture](../server/services/pdfInvoice.ts) et
[Devis](../server/services/pdfDevis.ts) acceptent les réglages en option.
Leurs routes injectent les paramètres courants à chaque téléchargement ;
le [gabarit partagé](../server/services/pdfCommercial.ts) reste indépendant
du stockage des paramètres.

## Vérification

Les recettes portent sur les configurations anciennes, la validation et
la sauvegarde isolée, les droits/CSRF, l'aperçu sans persistance, l'application
à chaud et après redémarrage, les textes aux limites et les logos PNG/JPEG.
Les pages PDF réellement composées contrôlent les marges, la pagination,
les mentions répétées et les données métier conservées. La recette navigateur
vérifie les brouillons, erreurs, aperçu, logo et affichage sur mobile.

Les recettes API utilisent une base et une configuration jetables ; aucun
paramètre ou enregistrement métier de l'installation réelle n'est modifié.

Commandes : `npm run test:pdf` pour les PDF et le stockage isolé,
`npm run test:documents-pdf` pour la recette complète avec `TEST_DB_*`,
et `npm run build` puis `npm run test:documents-pdf:ui` pour le navigateur
avec une API simulée.
