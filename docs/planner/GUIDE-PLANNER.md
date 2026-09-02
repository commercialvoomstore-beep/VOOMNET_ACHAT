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

1. Déposer `VOOMNET-planner.csv` (converti en classeur Excel) dans **OneDrive**
2. Dans le fichier Excel : **Insertion → Tableau** (donner un nom, par exemple `Taches`)
3. **Power Automate** (https://make.powerautomate.com) → **Créer → Flux de cloud instantané**
4. Déclencheur : *Déclencher manuellement un flux*
5. Action **Excel Online — Répertorier les lignes présentes dans un tableau** :
   - Emplacement : OneDrive · Bibliothèque : OneDrive · Fichier : votre classeur · Tableau : `Taches`
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

## Ce que votre responsable verra

| Vue | Ce qu'elle montre |
|---|---|
| **Tableau** | les tâches par compartiment (Livré / En cours / Planifié) |
| **Graphiques** | répartition par statut, par compartiment, par étiquette et par personne |
| **Planning** | le calendrier des échéances (vue chronologique) |
| **Grille** | le tableau détaillé avec dates, progression et responsables |

Le point clé : les vues **Graphiques** et **Planning** donnent une lecture immédiate de
l'avancement sans ouvrir chaque tâche.

---

## Routine hebdomadaire recommandée (10 min)

1. Ouvrir le plan dans Planner
2. Faire passer en `✅ Livré` les tâches terminées dans la semaine
3. Mettre à jour la progression des tâches `🔄 En cours`
4. Ajuster les échéances si nécessaire
5. (Optionnel) régénérer les fichiers avec `python3 scripts/generer-planner.py`
   après un changement important du périmètre

---

## Contenu du dossier `docs/planner/`

| Fichier | Usage |
|---|---|
| `a-coller-LIVRE.txt` | liste des tâches livrées, à coller dans le compartiment `✅ Livré` |
| `a-coller-EN-COURS.txt` | idem pour `🔄 En cours` |
| `a-coller-PLANIFIE.txt` | idem pour `📅 Planifié` |
| `VOOMNET-planner.xlsx` | suivi complet + onglets de collage par compartiment |
| `VOOMNET-planner.csv` | données brutes (pour Power Automate ou Excel) |

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
