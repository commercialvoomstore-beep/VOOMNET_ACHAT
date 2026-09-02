# Suivre l'avancement du projet VOOMNET dans Microsoft Planner

> **Situation** : Microsoft Planner ne possède **pas d'import de fichier CSV ou Excel**.
> Ce guide présente 4 méthodes, de la plus rapide (2 minutes) à la plus automatisée.

---

## Méthode A — La plus rapide : coller la liste des tâches (2 min par compartiment)

Planner crée **une tâche par ligne** lorsque l'on colle plusieurs lignes dans le champ
« Ajouter une tâche ». C'est la méthode la plus simple.

### Étapes

1. Ouvrir **Planner** (https://planner.cloud.microsoft) avec votre compte professionnel
2. **Nouveau plan** → *Nom* : `VOOMNET — Gestion des achats` → **Créer**
3. Créer **3 compartiments** (buckets) :
   - `✅ Livré`
   - `🔄 En cours`
   - `📅 Planifié`
4. Dans le compartiment `✅ Livré`, cliquer sur **Ajouter une tâche**
5. Ouvrir le fichier `a-coller-LIVRE.txt` (dossier `docs/planner/`),
   **sélectionner les lignes de tâches**, les copier (Ctrl+C)
6. Revenir dans Planner, **coller** (Ctrl+V) dans le champ → chaque ligne devient une tâche
7. Cliquer sur **Ajouter**
8. Répéter pour `🔄 En cours` (`a-coller-EN-COURS.txt`) puis `📅 Planifié` (`a-coller-PLANIFIE.txt`)

Chaque tâche porte la forme : `[Module] Intitulé (avancement %)` — par exemple
`[Négociation] Grille de négociation article × fournisseur (100%)`.

### Renseigner les dates et les responsables

- Ouvrir chaque tâche → renseigner **Date d'échéance**, **Progression** et **Assigné à**
- Le fichier `VOOMNET-planner.csv` (ou l'onglet « Suivi » du fichier Excel) donne,
  pour chaque tâche : échéance, priorité et responsable suggéré

---

## Méthode B — Copier-coller depuis Excel (nouvelle version de Planner)

Si votre organisation dispose de la **nouvelle version de Planner**, la vue **Grille**
accepte le collage de plusieurs colonnes copiées depuis Excel (titre, échéance,
progression, assigné).

1. Ouvrir le plan → vue **Grille**
2. Ouvrir `VOOMNET-planner.xlsx` → onglet **Suivi**
3. Copier les colonnes **Tâche · Échéance · Avancement · Responsable**
4. Coller dans la grille Planner

> Si le collage multi-colonnes n'est pas disponible, utiliser la **méthode A**.

---

## Méthode C — Automatiser avec Power Automate (sans code)

Pour créer les tâches automatiquement depuis un fichier (et les recréer après chaque
mise à jour) :

1. Déposer `VOOMNET-planner.xlsx` dans **OneDrive**
   👉 *le fichier contient déjà un vrai tableau Excel nommé **`TachesVOOMNET`** (onglet « Taches ») —
   aucune préparation n'est nécessaire*
2. **Power Automate** (https://make.powerautomate.com) → **Créer → Flux de cloud instantané**
3. Déclencheur : *Déclencher manuellement un flux*
4. Action **Excel Online (Business) — Répertorier les lignes présentes dans un tableau** :
   - Emplacement : OneDrive · Bibliothèque de documents : OneDrive · Fichier : `VOOMNET-planner.xlsx`
   - Tableau : **`TachesVOOMNET`** (apparaît directement dans la liste déroulante)
6. Ajouter **Appliquer à chacun**, puis l'action **Planner — Créer une tâche** :
   - *ID de groupe* : votre groupe Microsoft 365
   - *ID de plan* : le plan VOOMNET
   - *ID de compartiment* : selon la colonne « Compartiment » (ajouter une condition ou 3 blocs)
   - *Titre* : colonne `Tâche`
   - *Date d'échéance* : colonne `Échéance`
   - *Affecter à* : colonne `Responsable`
7. Enregistrer et **exécuter**

L'ensemble des tâches est créé en une seule exécution, dates et responsables compris.

---

## Méthode D — API Microsoft Graph (pour une synchronisation récurrente)

Pour un développeur, la création programmatique passe par l'API Graph :

```
POST https://graph.microsoft.com/v1.0/planner/tasks
{
  "planId":  "<id du plan>",
  "bucketId":"<id du compartiment>",
  "title":   "[Négociation] Grille de négociation article × fournisseur (100%)",
  "dueDateTime": { "dateTime": "2026-08-31T17:00:00", "timeZone": "GMT Standard Time" },
  "assignments": { "<id utilisateur>": { "@odata.type": "#microsoft.graph.plannerAssignment", "orderHint": " !" } }
}
```

Nécessite une application inscrite dans Azure AD avec l'autorisation `Tasks.ReadWrite`.

---

## Paramétrage conseillé du plan

| Élément | Valeur |
|---|---|
| **Nom du plan** | VOOMNET — Gestion des achats |
| **Compartiments** | `✅ Livré` · `🔄 En cours` · `📅 Planifié` |
| **Étiquettes (labels)** | 🔴 Haute · 🟠 Moyenne · 🟡 Basse · 🟣 Sécurité · 🔵 DSI |
| **Priorités** | Haute pour les tâches bloquantes, Moyenne pour le reste |
| **Membres** | vous, votre responsable, les personnes concernées |

### Donner l'accès à votre responsable

**Planner → le plan → Membres (icône en haut à droite) → ajouter son adresse e-mail professionnelle.**
Il recevra une invitation et verra immédiatement l'avancement.

---

## Basculer entre les vues

Dans la barre supérieure du plan (à côté du nom du plan) :

```
Tableau   Grille   Planning   Graphiques   Membres
```

Le mode sombre ne change pas ces libellés : ils restent dans le même ordre.

## Ce que votre responsable verra, vue par vue

### 📊 Vue Graphiques — la plus parlante pour un responsable
- **Répartition par progression** : camembert *Terminé / En cours / En retard / Pas commencé*
- **Par compartiment** : combien de tâches dans `✅ Livré`, `🔄 En cours`, `📅 Planifié`
- **Par étiquette** et **par personne** : la charge par module et par intervenant

👉 C'est la vue à montrer en réunion : l'avancement saute aux yeux sans lire de liste.

### 📅 Vue Planning — la vue calendaire
- Les tâches positionnées sur leur **semaine d'échéance**
- Idéal pour répondre à « où en sera-t-on à la fin du mois ? »
- Astuce : les tâches `✅ Livré` apparaissent également, ce qui matérialise le chemin parcouru

### 🗂 Vue Tableau — la vue par compartiments
- 3 colonnes : `✅ Livré` · `🔄 En cours` · `📅 Planifié`
- Chaque carte affiche : titre, **étiquette de couleur** (module), échéance, assigné et
  l'icône de progression
- La plus proche de l'usage quotidien ; c'est celle que vous mettrez à jour chaque semaine

### 🗒 Vue Grille — la vue tableur (celle de la 1re capture)
- Tableau complet avec toutes les colonnes : *Nom de la tâche · Compartiment · Progression ·
  Priorité · Assigné à · Date de début · Date d'échéance · Étiquettes · Description*
- C'est la vue où l'on **colle** les données (méthode B ci-dessous) et où l'on peut
  renseigner toutes les informations en masse

> **Conseil** : montrez les **Graphiques** à votre responsable (lecture immédiate) et
> gardez le **Tableau** pour le suivi opérationnel hebdomadaire.

---

## Routine hebdomadaire recommandée (10 min)

1. Ouvrir le plan dans Planner
2. Faire passer en `✅ Livré` les tâches terminées dans la semaine
3. Mettre à jour la progression des tâches `🔄 En cours`
4. Ajuster les échéances si nécessaire
5. (Optionnel) régénérer les fichiers avec `python3 scripts/generer-planner.py`
   après un changement important du périmètre

---

## Les 4 colonnes d'étapes : Développement · Test · Pilote · Déploiement

Ces colonnes suivent le **cycle de vie de chaque fonctionnalité**. Elles complètent la
colonne « Progression » (qui donne la vue d'ensemble).

### Signification

| Colonne | Ce qu'elle mesure | Valeurs possibles |
|---|---|---|
| **Développement** | la fonctionnalité est-elle codée ? | `Terminé` · `En cours` · `Pas commencé` |
| **Test** | a-t-elle été vérifiée (tests automatisés, recette) ? | idem |
| **Pilote** | est-elle validée par un groupe d'utilisateurs ? | idem |
| **Déploiement** | est-elle en production, visible de tous ? | idem |

### Comment les colonnes sont remplies

L'état des étapes est déduit de l'avancement de la tâche :

| Avancement | Développement | Test | Pilote | Déploiement |
|---|:--:|:--:|:--:|:--:|
| **100 %** (livré) | Terminé | Terminé | Terminé | Terminé |
| **≥ 60 %** | Terminé | En cours | Pas commencé | Pas commencé |
| **≥ 30 %** | En cours | Pas commencé | Pas commencé | Pas commencé |
| **0 %** (planifié) | Pas commencé | Pas commencé | Pas commencé | Pas commencé |

👉 **Toutes les tâches livrées ont donc leurs 4 étapes à « Terminé »** — c'est ce qui
montre visuellement à votre responsable que le travail est réellement en production,
et pas seulement « fait ».

### Deux façons de les utiliser dans Planner

**1. En colonnes de la vue Grille** (recommandé)
- copier `a-coller-DANS-LA-GRILLE.tsv` → coller dans la grille : les 4 colonnes
  `Développement`, `Test`, `Pilote`, `Déploiement` sont déjà renseignées
- si Planner ne propose pas ces colonnes : **Ajouter une colonne** et choisir
  *Texte* ou *Choix*, puis nommer la colonne

**2. En checklist à l'intérieur de chaque tâche**
- ouvrir la tâche → **Checklist** → coller les 4 lignes figurant dans
  `checklists-a-coller.txt` → cocher celles qui sont faites
- avantage : l'avancement de la checklist s'affiche directement sur la carte

### Ajouter les tâches par étape

Le fichier `a-coller-TACHES-PAR-ETAPE.txt` décompose chaque fonctionnalité **en cours ou
planifiée** en 4 tâches distinctes :

```
### Journal d'audit des actions sensibles [Sécurité]
Développement — Journal d'audit des actions sensibles
Test — Journal d'audit des actions sensibles
Pilote — Journal d'audit des actions sensibles
Déploiement — Journal d'audit des actions sensibles
```

À coller dans le compartiment `🔄 En cours` ou `📅 Planifié`. Les fonctionnalités déjà
livrées n'y figurent pas (leurs 4 étapes sont terminées).

---

## Contenu du dossier `docs/planner/`

| Fichier | Usage |
|---|---|
| `a-coller-LIVRE.txt` | liste des tâches livrées, à coller dans le compartiment `✅ Livré` |
| `a-coller-EN-COURS.txt` | idem pour `🔄 En cours` |
| `a-coller-PLANIFIE.txt` | idem pour `📅 Planifié` |
| **`a-coller-DANS-LA-GRILLE.tsv`** | ⭐ **les 44 tâches formatées pour la vue Grille — 13 colonnes dont Développement / Test / Pilote / Déploiement — à coller directement** |
| **`VOOMNET-planner-GRILLE.csv`** | idem au format CSV (séparateur point-virgule) |
| **`a-coller-TACHES-PAR-ETAPE.txt`** | chaque fonctionnalité en cours ou planifiée déclinée en 4 tâches (Développement, Test, Pilote, Déploiement) |
| **`checklists-a-coller.txt`** | les 4 étapes à coller dans la checklist de chaque tâche, avec leur état |
| **`VOOMNET-planner.xlsx`** | classeur complet : onglet `Grille` (tableau `GrilleVOOMNET`), onglet `Taches` (tableau `TachesVOOMNET`), onglet `Suivi`, onglets de collage par compartiment |
| `VOOMNET-planner.csv` | données brutes (Power Automate ou Excel) |
| `FICHE-RAPIDE.pdf` | la procédure en 1 page |

### Colonnes de l'export Grille (validées)

`Nom de la tâche` · `Compartiment` · `Progression` · `Priorité` · `Assigné à` ·
`Date de début` · `Date d'échéance` · `Étiquettes` · `Description`

Valeurs prêtes pour Planner : Progression = `Terminé` / `En cours` / `Pas commencé` ;
Priorité = `Urgent` / `Moyen` / `Faible` ; Étiquettes = module concerné.

---

## Avancement au moment de la génération

| Indicateur | Valeur |
|---|---|
| **Avancement global** | **82 %** |
| Tâches livrées | 35 |
| Tâches en cours | 3 |
| Tâches planifiées | 6 |
| Tests automatisés | 197 contrôles, tous au vert |
| État | application déployée et en service |

---

⚠️ **Rappel des 3 points bloquants avant généralisation**, à suivre comme tâches prioritaires :
1. Mots de passe hachés (Supabase Auth)
2. Politiques d'accès restreintes (RLS)
3. Journal d'audit des actions sensibles
