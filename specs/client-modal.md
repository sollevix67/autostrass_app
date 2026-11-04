# Création de client en fenêtre contextuelle — 4 novembre 2026

La vue Clients affiche directement la liste. Le bouton **Nouveau client**
ouvre le formulaire dans un dialogue centré, avec deux colonnes sur
ordinateur et une colonne défilante sur mobile. Le thème clair/sombre
reprend les tokens de l'application.

La fermeture est possible avec Annuler, la croix, Échap ou le fond. Le
focus reste dans la fenêtre puis revient au bouton déclencheur. Les champs
et les fermetures sont désactivés pendant l'enregistrement. Une erreur de
validation ou de l'API conserve les valeurs ; une réussite actualise la
liste, ferme le dialogue et réinitialise le formulaire.

La création reste réservée aux administrateurs et magasiniers. Le contrat
API et le comportement dégradé existant de `useResource` sont conservés.

## Vérification

Build et lint réussis. **143 contrôles Chromium/Playwright réussis** :
ouverture et fermeture, clavier, focus, formulaire invalide, effacement,
échec API puis nouvelle tentative, attente réseau sans fermeture ni double
envoi, réussite et ajout à la liste, droits et confirmation de suppression.
Rendu vérifié à 375, 768, 1024 et 1440 px, en clair et sombre, sans
débordement horizontal ni erreur JavaScript observée.

Les réponses API, y compris les créations, sont fictives et interceptées
dans le navigateur : aucune écriture MariaDB. Le contrôle utilise le build
de production via un script Playwright temporaire, sans nouvelle dépendance
dans le dépôt. Le serveur de vérification a été arrêté après les contrôles.
L'avertissement Vite préexistant sur le bundle JS persiste (525,47 kB).

## Captures

| Vue | Clair | Sombre |
| --- | --- | --- |
| Fenêtre sur ordinateur | [Capture](screenshots/client-modal/client-desktop-light.png) | [Capture](screenshots/client-modal/client-desktop-dark.png) |
| Fenêtre sur mobile | [Capture](screenshots/client-modal/client-mobile-light.png) | [Capture](screenshots/client-modal/client-mobile-dark.png) |

[Liste des clients](screenshots/client-modal/clients-list-desktop.png) ·
[Relevé des contrôles](screenshots/client-modal/verification.json).

Sur mobile, faire défiler le dialogue pour accéder à tous les champs et
aux actions du formulaire.
