# Séance — bandes-annonces (PWA)

Une petite appli installable sur Android qui liste les nouvelles bandes-annonces
de films et séries, avec un filtre par studio (Disney, A24, Netflix, etc. — ou
n'importe quel studio que tu cherches toi-même).

Elle tourne entièrement dans le navigateur : pas de serveur à faire tourner,
mais elle a besoin d'être **hébergée en HTTPS** pour s'installer comme vraie
appli (icône, plein écran, mode hors-ligne). Comme tu es sur Android sans
terminal, la solution la plus simple **depuis ton téléphone** est GitHub Pages.

## 1. Héberger l'appli (5 minutes, depuis le navigateur Android)

1. Va sur **github.com**, crée un compte gratuit si besoin.
2. Crée un nouveau dépôt (bouton **+** en haut à droite → *New repository*),
   nomme-le par exemple `seance-app`, coche **Public**, valide.
3. Dans le dépôt, utilise **Add file → Upload files** et dépose tous les
   fichiers de ce dossier (`index.html`, `style.css`, `app.js`,
   `manifest.json`, `service-worker.js`, `LISEZ-MOI.md`, et le dossier
   `icons/` avec les 3 images dedans). Valide (*Commit changes*).
4. Va dans **Settings → Pages** du dépôt. Dans *Source*, choisis la branche
   `main` et le dossier `/ (root)`, puis **Save**.
5. Après une minute, GitHub te donne une adresse du type
   `https://tonpseudo.github.io/seance-app/`. C'est ton appli, en ligne.

## 2. Installer l'appli sur ton téléphone

1. Ouvre cette adresse dans **Chrome** sur Android.
2. Un bandeau ou le menu ⋮ propose **"Installer l'application"** /
   **"Ajouter à l'écran d'accueil"** — accepte.
3. L'icône "Séance" apparaît sur ton écran d'accueil, en plein écran comme
   une vraie appli.

## 3. Première ouverture : la clé TMDB (gratuite)

L'appli récupère les films/séries et bandes-annonces via **TMDB**
(The Movie Database), un service gratuit. Il te faut ta propre clé, qui reste
stockée uniquement sur ton téléphone :

1. Crée un compte sur **themoviedb.org** (gratuit).
2. Dans les paramètres du compte → **API**, demande une clé
   développeur (formulaire rapide, usage "personnel/éducatif").
3. Copie la **clé API (v3 auth)** et colle-la au premier lancement de
   l'appli.

## Utilisation

- Onglet **Nouveautés** : dernières bandes-annonces tous studios confondus
  (sorties récentes et à venir, films et séries).
- Onglet **Mes studios** : coche les studios qui t'intéressent parmi les
  suggestions, ou cherche-en d'autres par nom, puis appuie sur
  "Voir les bandes-annonces".
- Le bouton ⚙️ en haut à droite permet de changer la clé API plus tard.

## Notes

- Les résultats sont mis en cache 30 minutes sur ton téléphone pour économiser
  des requêtes.
- Le mode hors-ligne réaffiche la dernière liste chargée, mais il faut du
  réseau pour lire les bandes-annonces (YouTube).
