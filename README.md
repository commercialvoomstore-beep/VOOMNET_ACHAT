# VOOMNET TECHNOLOGY — Gestion des Achats (version Next.js)

Portage **à l'identique** de l'application `index.html` (démonstration 100 % front-end)
vers **Next.js 15 (App Router)**. Aucune configuration, aucune règle de gestion et
aucune fonctionnalité n'a été modifiée : mêmes écrans, mêmes données, mêmes comptes,
même clé de stockage (`voomnet_achats_v3`).

---

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
```

Autres commandes :

```bash
npm run build    # build de production
npm start        # serveur de production
npm run lint     # ESLint
```

Aucun serveur, aucune base de données externe n'est nécessaire : toutes les données
sont conservées dans le `localStorage` du navigateur.

---

## Comptes de démonstration

| Rôle           | Identifiant | Mot de passe |
|----------------|-------------|--------------|
| Administrateur | `admin`     | `admin123`   |
| Demandeur      | `demandeur` | `demo123`    |
| Responsable    | `responsable` | `demo123`  |

---

## Correspondance avec la version `index.html`

| Version d'origine (`index.html`) | Version Next.js |
|----------------------------------|-----------------|
| `<style>` (lignes 10 à 286)      | `app/globals.css` (copie stricte) |
| `<script>` (lignes 356 à 2116)   | `lib/voomnet.js` — moteur applicatif, **code repris à l'identique**, encapsulé dans `initVoomnet()` |
| Balisage de l'écran de connexion | `components/LoginScreen.tsx` |
| Structure de l'application (sidebar, topbar) | `components/AppShell.tsx` |
| Amorçage (chargement SheetJS + moteur) | `components/VoomnetApp.tsx` (composant client) |
| Page d'accueil                   | `app/page.tsx` |
| `<title>` / `<html lang="fr">`   | `app/layout.tsx` (métadonnées Next.js) |
| Script CDN SheetJS (`xlsx@0.18.5`) | chargé dynamiquement par `components/VoomnetApp.tsx` **avant** l'initialisation du moteur (même URL, même version) |
| `modele_fournisseurs_voomnet.csv` / `.json` | `public/` |

Les écrans (tableaux de bord, demandes, assistant 5 étapes, fournisseurs,
commandes, réceptions, rapports, paramètres) restent produits par le moteur
dans `#page-content`, `#modal-root` et `#toast-root` : le rendu HTML est
strictement le même que dans la version d'origine.

---

## Processus applicatif (inchangé)

1. Le **demandeur** crée une demande (articles, quantités, coût présumé → somme globale calculée).
2. Il sélectionne **au moins 3 fournisseurs** (emplacement, WhatsApp `wa.me`, site internet, références).
3. Il les contacte puis saisit les prix reçus : 💰 prix le plus bas, 🚚 livraison la plus rapide,
   🛡️ meilleure garantie sont mis en évidence automatiquement.
4. Il choisit le fournisseur retenu + justification, puis soumet la demande.
5. Le **responsable** approuve / refuse / demande une modification.
6. Création du bon de commande `BC-AAAA-NNNNN` (impression possible), puis réception complète ou partielle.
7. La demande passe en **✓ CLÔTURÉE** (timeline complète visible).

### Rôles et droits

* **Administrateur** : tous les droits — fournisseurs (ajout / modification / désactivation / suppression),
  import-export Excel·CSV·JSON, utilisateurs, toutes les demandes, commandes, réceptions, rapports, paramètres.
* **Demandeur** : crée et suit ses demandes, catalogue fournisseurs, comparaison des offres,
  ses commandes et réceptions.
* **Responsable** : valide les demandes soumises et consulte l'historique de ses validations.

---

## Import / Export des fournisseurs (menu 🏢 Fournisseurs, admin)

* **Import** : bouton « 📥📤 Importer / Exporter » → `.xlsx`, `.xls`, `.csv` ou `.json`
  → aperçu et contrôle (« X fournisseurs détectés », lignes invalides signalées sans bloquer les valides)
  → « ✓ Importer les fournisseurs ».
* **Export** : Excel (`.xlsx`), JSON, CSV (secours).
* **Modèles** : téléchargeables depuis l'application (également fournis dans `public/`).

Champs : `FOURNISSEUR NOM · RÉFÉRENCES · EMPLACEMENT · WHATSAPP · SITE INTERNET` (+ `STATUT`).

---

## Améliorations apportées à l'étape 3 (comparaison des prix)

L'étape **3. PRIX NÉGOCIÉS** a été enrichie — c'est désormais le poste de commandement
de la comparaison (les mêmes blocs sont repris en lecture seule à l'étape 4, à l'étape 6
et dans le détail de la demande).

### 1. Saisie assistée

| Outil | Effet |
|---|---|
| **📋 Pré-remplir (coût présumé)** | remplit d'un clic toutes les cases vides avec le coût présumé de chaque article |
| **⇉ Recopier par ligne** | recopie le premier prix saisi de chaque article sur tous les fournisseurs |
| **⧉ Recopier** (par ligne d'article) | recopie le prix d'une ligne sur un seul article |
| **🧹 Effacer les prix** | remet la grille à zéro (délais, garanties et conditions conservés) |
| **📊 Exporter la comparaison** | exporte la grille en Excel (2 onglets : « Comparaison articles » et « Synthèse offres »), ou en CSV si SheetJS est indisponible |

* Compteur de saisie **« X / Y prix saisis »** avec barre de progression.
* Le **meilleur prix de chaque article** est surligné en vert **en direct**, dès la saisie.
* Chaque cellule affiche le total de la ligne (`prix × quantité`) et l'**écart en %** par rapport au coût présumé.

### 2. Comparaison enrichie — le coût total rendu

Chaque offre est décomposée, fournisseur par fournisseur :

`TOTAL ARTICLES (brut)` → `− Remise (%)` → `NET HT` → `+ TVA (%)` → `+ Frais de livraison` → **⭐ COÛT TOTAL RENDU**

* La **remise** (%) et les **frais de livraison** (FCFA) sont saisis dans la grille.
* La **TVA** est un réglage global (⚙️ Paramètres → « Comparaison des prix »), à **0 % par défaut**
  pour ne modifier aucun montant existant.
* L'écart par rapport à la somme présumée est affiché en FCFA **et en %**.
* Les fournisseurs sont **classés** par coût total rendu (`1️⃣ 2️⃣ 3️⃣…`).

### 3. Score multicritère et recommandation

Chaque offre complète reçoit une **note sur 100** : moyenne pondérée de quatre notes
(prix : le moins cher = 100 ; délai : le plus rapide = 100 ; garantie : la plus longue = 100 ;
paiement : `30 + jours de délai`, « Comptant » = 30).

* Pondération par défaut : **prix 50 % · délai 20 % · garantie 20 % · paiement 10 %**,
  réglable directement dans l'étape 3 (bloc « ⚙️ Pondération ») et dans ⚙️ Paramètres.
* Bannière **🏆 Meilleure offre globale** (étapes 3 et 4) et bouton
  **⭐ Retenir le mieux noté** (étape 5).
* Chip **⭐ Meilleur score** sur la colonne du fournisseur le mieux noté.

### 4. Seuil d'offres complètes (paramétrable)

* Une offre n'est **complète** que si chaque article a un prix négocié > 0.
* Le passage à l'étape 4 exige **au moins 3 offres complètes** (seuil réglable de 1 à 10
  dans ⚙️ Paramètres → « Nombre minimum d'offres complètes »).
* Les fournisseurs sans réponse complète sont marqués **⚠️ SANS RÉPONSE**, affichés en
  « NON RENSEIGNÉ » et **exclus** du meilleur prix, du meilleur total, du classement et du score.
  Un message le rappelle lors du passage à l'étape suivante.

## Chaîne de publication (centre de commandement)

Toute modification est faite ici, puis livrée automatiquement :

```
   modifications du code
            │
            ▼
   node scripts/publish.mjs "message"     ← une seule commande
            │
            ├─1. régénère standalone/index.html
            ├─2. npm run build  (TypeScript + ESLint)
            ├─3. git commit
            ├─4. git push → GitHub (branche main)
            └─5. attend le redéploiement Vercel et le vérifie
            │
            ▼
   GitHub  ──(auto)──►  Vercel  ──►  https://voomnetachat.vercel.app
```

Exemples :

```bash
node scripts/publish.mjs "Ajout du rapport mensuel"
node scripts/publish.mjs " Correction d'un bug d'affichage" --no-build
```

Ce qui reste à faire de votre côté (une seule fois) : les **variables d'environnement Vercel**
et l'exécution du **SQL Supabase** — ces deux consoles ne sont pas accessibles de l'extérieur.

## Connexion à Supabase (optionnelle mais recommandée en équipe)

Sans configuration, l'application fonctionne en **mode démonstration locale** (localStorage).
Avec Supabase, **tous les postes partagent les mêmes données**, en temps réel.

### 1. Créer les tables

Ouvrez **Supabase → SQL Editor → New query**, collez le contenu de
**`supabase/schema.sql`** et exécutez. Il crée 7 tables
(`users`, `suppliers`, `requests`, `orders`, `receptions`, `notifications`, `meta`),
les index, les politiques RLS et l'abonnement temps réel.

### 2. Renseigner les clés

```bash
cp .env.example .env.local
# puis :
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...      # clé « anon public » uniquement
```

Sur **Vercel** : *Settings → Environment Variables* → ajoutez les deux variables → **Redeploy**.

### 3. C'est tout

Pour vérifier la connexion : **⚙️ Paramètres → « Base de données »** affiche
« ☁️ Connecté à Supabase (projet.supabase.co) — dernière synchro hh:mm »
ou « 💻 Mode local — localStorage uniquement (Supabase non configuré) ».
C'est le moyen le plus rapide de contrôler un déploiement Vercel.

Au premier démarrage, l'application pousse son jeu de démonstration vers Supabase
(5 utilisateurs, 10 fournisseurs, 5 demandes, 2 commandes, 2 réceptions).

### Comment ça marche

```
Écrans ──► DB (mémoire) ──► saveDB() ──► localStorage (immédiat)
                                    └──► Supabase (synchro différée 400 ms)
loadDB() ◄── cache local (affichage instantané) puis hydratation Supabase
```

* **Aucune règle de gestion n'a changé** : `DB` reste l'objet utilisé par tous les écrans.
* **Synchro différentielle** : seules les lignes ajoutées / modifiées / supprimées sont envoyées.
* **Temps réel** : un autre poste modifie une donnée → vos écrans se rafraîchissent
  (jamais pendant la saisie d'un assistant ou l'ouverture d'une modale).
* **Repli automatique** : Supabase absent ou injoignable → fonctionnement local + message.
* **Réinitialisation** (⚙️ Paramètres) écrase aussi les données distantes.

Authentification : le mode « identifiant + mot de passe » de la démonstration est conservé
(les utilisateurs sont synchronisés dans la table `users`). Pour passer sur **Supabase Auth**,
voir les commentaires en fin de `supabase/schema.sql`.

Version autonome : `node scripts/gen-standalone.mjs --supabase-url=… --supabase-key=…`

## Suppressions réservées à l'administrateur

Une icône **🗑️** apparaît pour l'administrateur (et uniquement pour lui) sur chaque écran concerné.
Toute suppression demande une **confirmation** et applique les règles suivantes :

| Élément | Effet de la suppression |
|---|---|
| **Demande** | supprime la demande **et** ses commandes et réceptions liées, ainsi que les notifications associées |
| **Commande** | supprime la commande **et** sa réception ; la demande redevient **APPROUVÉE** (une nouvelle commande peut être créée) |
| **Réception** | supprime la réception ; la commande redevient **à réceptionner** (la demande repasse « COMMANDE PASSÉE ») |
| **Utilisateur** | refusée si l'utilisateur est rattaché à des demandes (→ le désactiver) ou s'il s'agit de son propre compte |

Chaque suppression est tracée dans l'historique de la demande concernée.

## Exports

| Écran | Excel | PDF | CSV (secours) |
|---|---|---|---|
| Demandes | 📊 Exporter Excel | 📄 PDF | ✔ |
| Commandes | 📊 Exporter Excel | 📄 PDF | ✔ |
| Réceptions | 📊 Exporter Excel | 📄 PDF | ✔ |
| Fournisseurs | 📊 Excel / 🧾 JSON / 📄 CSV | — | ✔ |
| Comparaison (étape 3) | 📊 Exporter la comparaison (2 onglets) | — | ✔ |

Les exports PDF sont générés côté navigateur avec **jsPDF + AutoTable** (chargés à la demande depuis le CDN) :
en-tête VOOMNET, date et auteur, tableau paginé, pied de page « Page x / y ».
**Si le CDN est indisponible, l'export bascule automatiquement sur l'impression** (fenêtre d'impression →
« Enregistrer au format PDF ») : aucune fonctionnalité n'est perdue hors-ligne.

Les exports respectent les droits : un demandeur n'exporte que ses propres données.

## Masquer les comptes de démonstration (déploiement public / Vercel)

Par défaut, le bloc **« Comptes de démonstration »** de l'écran de connexion est :

| Environnement | Affiché ? |
|---|---|
| `npm run dev` (développement) | ✅ oui |
| `npm run build` + `npm start` / Vercel (production) | ❌ **non** |

Aucune variable n'est donc à définir sur Vercel : le bloc disparaît automatiquement en production.
Pour forcer le comportement :

```bash
NEXT_PUBLIC_DEMO_MODE=1   # toujours afficher
NEXT_PUBLIC_DEMO_MODE=0   # toujours masquer
```

(voir `.env.example`). Le bloc est retiré du DOM, pas seulement masqué en CSS — les identifiants
n'apparaissent donc pas dans le code source de la page.

Pour la version autonome : `node scripts/gen-standalone.mjs --no-demo`.

## Version autonome (`standalone/index.html`)

Le fichier unique `standalone/index.html` est **généré depuis les mêmes sources** que
l'application Next.js (même CSS, même moteur) :

```bash
node scripts/gen-standalone.mjs
```

Il produit `standalone/index.html` + les modèles CSV/JSON + le `LISEZMOI.txt`.
Ouvrez-le directement dans un navigateur : aucune installation requise.

## Stockage des données

Toutes les données sont conservées dans le `localStorage` du navigateur
(clé `voomnet_achats_v3`, session : `voomnet_session_v1`). Elles persistent entre les
sessions sur le même poste / navigateur et ne sont pas partagées entre plusieurs postes.

Réinitialisation : **admin → ⚙️ Paramètres → « Réinitialiser les données de démonstration »**
(recrée 5 utilisateurs, 10 fournisseurs, 5 demandes, 2 commandes, 2 réceptions).

---

## Évolution vers un vrai backend

Toutes les lectures/écritures passent par une couche unique (`loadDB` / `saveDB`,
section 2 de `lib/voomnet.js`). Pour brancher une API REST, il suffit de remplacer
cette couche par des appels `fetch()` : le reste de l'application ne change pas.
