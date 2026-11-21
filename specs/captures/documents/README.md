# Exemples PDF commerciaux

Ces documents utilisent des données entièrement fictives. Ils vérifient le gabarit commun de la facture et du devis, ses taux de TVA, son historique et sa pagination. `gabarit-bl-fictif.pdf` montre les champs facultatifs du modèle de bon de livraison ; il ne constitue pas une émission métier de BL.

Régénération des PDF : `node --import tsx scripts/test-pdf-commercial.ts --examples`. Les PNG sont ensuite produits localement avec Windows PowerShell 5.1 et `scripts/render-pdf-examples.ps1`. La validation courante sans `--examples` conserve les fichiers générés.

[RAPPORT.md](RAPPORT.md) récapitule les groupes et les pages ; `resultats.json` contient les contrôles et les empreintes des PDF, `rendus.json` les captures natives.
