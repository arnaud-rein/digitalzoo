# Digital Zoo — Team Squadeasy

Site vitrine statique (HTML / CSS / JS) de l'équipe **Digital Zoo**, publiable sur GitHub Pages.

## Modifier le contenu

Tout se fait dans **`js/config.js`** :

| Quoi | Clé |
|---|---|
| Grande image d'accueil | `hero.image` |
| Vidéo (YouTube, Vimeo ou .mp4 Cloudinary) | `video.src` |
| Les 10 membres + animal + photo | `members` |
| Photos de la galerie (ajouter / supprimer une ligne) | `gallery` |
| Google Sheet du classement | `scoreboard.sheetId`, `scoreboard.sheetName` |
| Formulaire de contact | `emailjs.publicKey`, `serviceId`, `templateId` |

## Google Sheet

1. Ligne 1 : `Nom` | `Score` | `Shame`
2. Partager → « Tous les utilisateurs disposant du lien » → Lecteur
3. Copier l'ID de l'URL (`/spreadsheets/d/<ID>/edit`) dans `scoreboard.sheetId`

Les noms du sheet doivent correspondre aux `name` de `members` pour afficher les photos dans le classement.

## EmailJS

Dans le template EmailJS, utiliser : `{{from_name}}`, `{{reply_to}}`, `{{subject}}`, `{{message}}`.

## Publier sur GitHub Pages

Settings → Pages → Source : `Deploy from a branch` → `main` / `(root)`.
