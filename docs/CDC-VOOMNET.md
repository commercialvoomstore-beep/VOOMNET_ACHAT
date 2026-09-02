# CAHIER DES CHARGES

## Application de gestion des achats — VOOMNET TECHNOLOGY

| | |
|---|---|
| **Projet** | VOOMNET TECHNOLOGY — Gestion des Achats |
| **Version du document** | 1.0 |
| **Date** | 31 août 2026 |
| **Statut** | Application développée et déployée — document établi a posteriori, à valider |
| **Périmètre du document** | Besoins, règles de gestion, architecture, sécurité, recette |

---

# 1. PRÉSENTATION GÉNÉRALE

## 1.1 Contexte

VOOMNET TECHNOLOGY souhaite disposer d'un outil interne pour piloter ses achats :
de l'expression du besoin jusqu'à la réception de la marchandise, en passant par la
consultation et la comparaison des fournisseurs et la validation hiérarchique.

Historiquement, le processus était informel (échanges téléphoniques, tableurs).
L'application vise à **structurer, tracer et accélérer** ce processus.

## 1.2 Objectifs

| # | Objectif | Indicateur de succès |
|---|---|---|
| O1 | Dématérialiser le circuit d'achat | 100 % des demandes créées dans l'outil |
| O2 | Garantir la comparaison des offres | minimum 3 fournisseurs consultés par demande |
| O3 | Tracer chaque décision | historique complet et horodaté par demande |
| O4 | Fiabiliser la numérotation | numéros ACH- et BC- séquentiels et sans doublon |
| O5 | Partager l'information entre les services | données synchronisées en temps réel |
| O6 | Réduire les délais de validation | relances automatiques au-delà des seuils |
| O7 | Produire les documents nécessaires | fiches de demande et bons de commande imprimables |

## 1.3 Périmètre

**Dans le périmètre**
- Demandes d'achat (création, suivi, modification)
- Catalogue fournisseurs et import/export de fichiers
- Consultation, négociation et comparaison des offres
- Circuit de validation hiérarchique
- Bons de commande et réceptions
- Notifications, relances et alertes
- Tableaux de bord, rapports et exports

**Hors périmètre (version actuelle)**
- Comptabilité / engagement budgétaire
- Gestion des stocks
- Portail fournisseur en libre-service
- Envoi d'e-mails
- Authentification fédérée (SSO)
- Application mobile native

---

# 2. ACTEURS ET HABILITATIONS

## 2.1 Les trois rôles

| Rôle | Raison d'être | Effectif type |
|---|---|---|
| **Demandeur** | exprime le besoin, consulte les fournisseurs, réceptionne | tout collaborateur |
| **Responsable** | valide, refuse ou demande une modification | chef de service / direction |
| **Administrateur** | administre les référentiels et les utilisateurs | fonction support / DSI |

## 2.2 Matrice des habilitations

| Fonction | Demandeur | Responsable | Administrateur |
|---|:--:|:--:|:--:|
| Voir le tableau de bord | ✔ | ✔ | ✔ |
| Créer une demande | ✔ | — | ✔ |
| Voir **ses** demandes | ✔ | — | ✔ |
| Voir **toutes** les demandes | — | ✔ | ✔ |
| Consulter le catalogue fournisseurs | ✔ | — | ✔ |
| Créer / modifier un fournisseur | — | — | ✔ |
| Désactiver / supprimer un fournisseur | — | — | ✔ |
| Importer / exporter les fournisseurs | — | — | ✔ |
| Valider une demande (approuver / refuser / modifier) | — | ✔ | — |
| Consulter l'historique des validations | — | ✔ | — |
| Créer une commande | ✔ (ses demandes) | — | ✔ |
| Voir les commandes | les siennes | — | toutes |
| Enregistrer une réception | ✔ (ses commandes) | — | ✔ |
| Voir les réceptions | les siennes | — | toutes |
| Supprimer demande / commande / réception / utilisateur | — | — | ✔ |
| Exporter en PDF / Excel | ✔ (ses données) | ✔ | ✔ (toutes) |
| Modifier les paramètres | — | — | ✔ |
| Réinitialiser les données de démonstration | — | — | ✔ |

## 2.3 Règles associées

- Un utilisateur **ne peut pas se supprimer lui-même**.
- Un utilisateur rattaché à des demandes **ne peut pas être supprimé** (le désactiver).
- Un demandeur n'accède qu'aux données dont il est à l'origine.
- La suppression d'une demande entraîne celle de ses commandes, réceptions et notifications.

---

# 3. BESOINS FONCTIONNELS

> Codification : **MODULE-NN**. Priorité : **M** (indispensable) · **C** (confort) · **E** (évolutif)

## 3.1 Authentification et session

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| AUTH-01 | Connexion par identifiant + mot de passe | champs « Identifiant » et « Mot de passe » | M |
| AUTH-02 | Contrôle du compte | un compte désactivé ne peut pas se connecter | M |
| AUTH-03 | Maintien de la session | reconnexion automatique au retour sur l'application | M |
| AUTH-04 | Déconnexion | bouton dédié dans la barre latérale | M |
| AUTH-05 | Message d'erreur générique | ne pas indiquer si l'identifiant ou le mot de passe est erroné | M |
| AUTH-06 | Comptes de démonstration masqués en production | éviter d'exposer des identifiants | C |

> ⚠️ **Vigilance** : les mots de passe sont aujourd'hui stockés **en clair** dans la table
> `users`. Une migration vers un hachage (Supabase Auth) est requise avant production.

## 3.2 Demandes d'achat

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| DEM-01 | Créer une demande | assistant en 6 étapes | M |
| DEM-02 | Saisir les articles | désignation + quantité + coût présumé unitaire | M |
| DEM-03 | **Coût présumé facultatif** | une demande peut être créée sans montant | M |
| DEM-04 | Calcul de la somme globale | quantité × coût présumé, total général | M |
| DEM-05 | Informations complémentaires | motif, priorité (Basse/Moyenne/Haute/Urgente), service | M |
| DEM-06 | Numérotation automatique | `ACH-AAAA-NNNNN`, séquentielle et sans doublon | M |
| DEM-07 | Enregistrement en brouillon | possibilité de quitter et reprendre | M |
| DEM-08 | Reprendre une demande | bouton « Continuer » / « Reprendre » | M |
| DEM-09 | Masquer les saisies invalides | désignation et quantité ≥ 1 obligatoires | M |
| DEM-10 | Historique horodaté | chaque événement tracé (création, sélection, soumission, validation…) | M |
| DEM-11 | Suivi visuel d'avancement | barre de progression en 6 étapes | C |
| DEM-12 | Recherche et filtres | par numéro, motif, demandeur, statut | C |
| DEM-13 | Listes dédiées | « Mes demandes », « Toutes les demandes », « Demandes à valider » | M |

**Statuts d'une demande** : Brouillon · En comparaison · En attente de validation ·
Approuvée · Refusée · Modification demandée · Commande passée · Réception partielle · Clôturée

## 3.3 Catalogue fournisseurs

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| FOU-01 | Fiche fournisseur | nom, références, emplacement, WhatsApp, site internet | M |
| FOU-02 | Statut actif / inactif | un fournisseur inactif n'est plus proposé à la sélection | M |
| FOU-03 | Création, modification, désactivation, suppression | réservé à l'administrateur | M |
| FOU-04 | Lien WhatsApp direct | numéro cliquable (`wa.me`) | C |
| FOU-05 | Lien site internet | cliquable | C |
| FOU-06 | Recherche multicritère | nom, références, emplacement, téléphone | C |
| FOU-07 | **Import de fichiers** | Excel (.xlsx/.xls), CSV, JSON avec aperçu et contrôle | M |
| FOU-08 | Tolérance aux erreurs d'import | les lignes invalides sont signalées, les valides sont importées | M |
| FOU-09 | Reconnaissance des en-têtes | alias de colonnes (FR/EN) acceptés | C |
| FOU-10 | Export Excel / JSON / CSV | colonnes identiques au modèle | M |
| FOU-11 | Modèles de fichiers téléchargeables | Excel, CSV, JSON | C |

## 3.4 Consultation et négociation (étapes 2 et 3)

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| NEG-01 | Sélection des fournisseurs à consulter | liste avec coordonnées affichées | M |
| NEG-02 | **Sélection facultative** | 0 à N fournisseurs (3 recommandés) | M |
| NEG-03 | Grille article × fournisseur | un prix négocié par article et par fournisseur | M |
| NEG-04 | **Prix facultatifs** | seuil d'offres complètes réglable (0 = facultatif) | M |
| NEG-05 | Calcul du total de ligne | prix × quantité, en direct | M |
| NEG-06 | Conditions commerciales | délai (jours), garantie (années), conditions de paiement, observations | M |
| NEG-07 | **Remise commerciale (%)** | par offre | C |
| NEG-08 | **Frais de livraison (FCFA)** | par offre | C |
| NEG-09 | **TVA (%)** | taux global paramétrable | C |
| NEG-10 | **Coût total rendu** | total articles − remise + TVA + frais de livraison | M |
| NEG-11 | Écart par rapport au présumé | en FCFA et en % | M |
| NEG-12 | Total de l'offre par fournisseur | somme des lignes | M |
| NEG-13 | Marquer les fournisseurs sans réponse | badge « ⚠️ SANS RÉPONSE », exclus des meilleurs prix | M |
| NEG-14 | Outils de saisie assistée | pré-remplissage avec le coût présumé, recopie par ligne, effacement | C |
| NEG-15 | Modification permanente des prix | retour possible sur l'étape 3 | M |
| NEG-16 | Compteur de saisie | « X / Y prix saisis » avec barre de progression | C |
| NEG-17 | Export de la grille | Excel (2 onglets) ou CSV | C |

## 3.5 Comparaison des offres (étape 4)

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| CMP-01 | Tableau croisé en lecture seule | critères en lignes, fournisseurs en colonnes | M |
| CMP-02 | Meilleur prix par article | surligné en vert + badge | M |
| CMP-03 | Meilleur coût total rendu | badge « 💰 Meilleur coût total » | M |
| CMP-04 | Livraison la plus rapide | badge « 🚚 » | C |
| CMP-05 | Meilleure garantie | badge « 🛡️ » | C |
| CMP-06 | **Score multicritère /100** | prix, délai, garantie, paiement — pondérable | C |
| CMP-07 | Classement des fournisseurs | par coût total rendu croissant | C |
| CMP-08 | Recommandation automatique | « meilleure offre globale » | C |
| CMP-09 | Étape non bloquante | franchissable sans aucun prix | M |

## 3.6 Choix du fournisseur (étape 5)

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| CHO-01 | Sélection du fournisseur retenu | une seule sélection possible | M |
| CHO-02 | Justification obligatoire… **ou facultative** | selon le paramétrage retenu | M |
| CHO-03 | **Étape facultative** | soumission possible sans choix | M |
| CHO-04 | Avertissement sans blocage | message si aucun fournisseur retenu | C |
| CHO-05 | Sélection assistée par le score | bouton « ⭐ Retenir le mieux noté » | C |

## 3.7 Validation (responsable)

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| VAL-01 | File d'attente de validation | demandes en statut « en attente » | M |
| VAL-02 | Trois décisions | Approuver · Refuser · Demander une modification | M |
| VAL-03 | Motif obligatoire pour refus et modification | zone de saisie | M |
| VAL-04 | Traçabilité | décision, validateur, date, motif | M |
| VAL-05 | Historique des validations | liste consultable | C |
| VAL-06 | Effet de la décision | Approuvée → prête pour commande ; Refusée → terminée ; Modification → retour au demandeur | M |
| VAL-07 | Notification au demandeur | à chaque décision | M |

## 3.8 Commandes et réceptions

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| CMD-01 | Créer un bon de commande | à partir d'une demande approuvée | M |
| CMD-02 | Numérotation automatique | `BC-AAAA-NNNNN` | M |
| CMD-03 | Lignes aux **prix négociés** | reprise des prix de l'offre retenue | M |
| CMD-04 | **Commande sans fournisseur ni prix** | créable et imprimable | M |
| CMD-05 | Confirmation | statut « À confirmer » → « Confirmée » | M |
| CMD-06 | Mise à jour de la demande | « Approuvée » → « Commande passée » | M |
| CMD-07 | Création automatique de la réception | une réception « En attente » par commande | M |
| CMD-08 | Impression du bon de commande | avec logo et zones de signature | M |
| REC-01 | Enregistrer une réception | quantité reçue par ligne (≤ quantité commandée) | M |
| REC-02 | Réception complète | toutes les quantités reçues → demande **clôturée** | M |
| REC-03 | Réception partielle | statut « Réception partielle », complétable plus tard | M |
| REC-04 | Date et observations | renseignées à la réception | C |
| REC-05 | Contrôle de saisie | au moins une quantité reçue | M |

## 3.9 Notifications, relances et alertes

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| NOT-01 | Notifications in-app | cloche avec pastille de non-lus | M |
| NOT-02 | Niveaux | 🔵 info · 🟠 alerte · 🔴 urgente | C |
| NOT-03 | Notification cliquable | ouvre la demande concernée et la marque lue | M |
| NOT-04 | « Tout marquer comme lu » | action groupée | C |
| NOT-05 | **Relance automatique — validation** | demande non validée au-delà du seuil → responsables | M |
| NOT-06 | **Relance automatique — réception** | commande non réceptionnée au-delà du délai → demandeur | M |
| NOT-07 | Anti-doublon | une relance par jour et par destinataire | M |
| NOT-08 | Seuils paramétrables | alerte et urgence, en jours | M |
| NOT-09 | **Bandeau d'alertes** | en haut du tableau de bord | C |
| NOT-10 | **Signal sonore** | mélodie par niveau, activable/coupable | C |
| NOT-11 | **Alarme répétée** | rejouée tant que la notification n'est pas lue | C |
| NOT-12 | **Notifications du navigateur** | bulles système, actives onglet en arrière-plan | C |
| NOT-13 | **Alerte visuelle** | titre de l'onglet clignotant + pastille pulsante | C |
| NOT-14 | Bip d'acquittement | à la lecture d'une alerte | C |

## 3.10 Impressions et exports

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| EXP-01 | **Fiche de demande imprimable** | logo, en-tête, articles, colonnes de prix vides, signatures | M |
| EXP-02 | **Bon de commande imprimable** | logo, fournisseur, lignes, montant, signatures | M |
| EXP-03 | Export PDF | demandes, commandes, réceptions | M |
| EXP-04 | Export Excel | demandes, commandes, réceptions, fournisseurs, comparaison | M |
| EXP-05 | Repli CSV | si la bibliothèque Excel est indisponible | M |
| EXP-06 | Respect des droits | un demandeur n'exporte que ses données | M |
| EXP-07 | Mise en page sans URL | pas d'adresse de site sur les documents | C |

## 3.11 Tableaux de bord et rapports

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| TDB-01 | Tableau de bord par rôle | indicateurs adaptés (demandeur / responsable / admin) | M |
| TDB-02 | Indicateurs clés | nombre de demandes, en attente, validées, commandes en cours, montant total | M |
| TDB-03 | Demandes récentes | tableau avec accès direct | M |
| TDB-04 | **Graphique : achats sur 12 mois** | histogramme des montants confirmés | C |
| TDB-05 | **Graphique : répartition par statut** | anneau avec légende | C |
| TDB-06 | **Graphique : top 5 fournisseurs** | histogramme | C |
| TDB-07 | Page Rapports | achats par service, par fournisseur, taux d'approbation | C |

## 3.12 Paramétrage

| Réf. | Exigence | Détail | Prio |
|---|---|---|---|
| PAR-01 | TVA par défaut | appliquée au calcul du coût rendu | C |
| PAR-02 | Pondération du score | prix / délai / garantie / paiement | C |
| PAR-03 | Seuil d'offres complètes | 0 = prix facultatifs | M |
| PAR-04 | Seuils de relance | délai alerte et urgence | M |
| PAR-05 | Préférences sonores | sons, volume, alarme (locales par poste) | C |
| PAR-06 | Réinitialisation des données de démonstration | recrée un jeu complet | C |

---

# 4. RÈGLES DE GESTION

| Réf. | Règle |
|---|---|
| RG-01 | Toute demande reçoit un numéro `ACH-AAAA-NNNNN` définitif dès sa création |
| RG-02 | La numérotation est séquentielle, gérée par un compteur partagé (pas de doublon possible) |
| RG-03 | Un article doit avoir une désignation et une quantité ≥ 1 ; le coût présumé est facultatif |
| RG-04 | La somme globale présumée est la somme des (quantité × coût présumé) |
| RG-05 | Un fournisseur inactif ne peut plus être sélectionné sur une nouvelle demande |
| RG-06 | Sans prix saisi, les montants s'affichent « — » et non « 0 FCFA » |
| RG-07 | Le coût total rendu = total articles − remise + TVA + frais de livraison |
| RG-08 | Les fournisseurs n'ayant pas chiffré tous les articles sont exclus des meilleurs prix et du classement |
| RG-09 | Seul un responsable peut valider ; la décision est définitive et tracée |
| RG-10 | Un refus ou une demande de modification exige un motif |
| RG-11 | Une commande ne peut être créée que sur une demande approuvée |
| RG-12 | Une commande confirmée génère automatiquement une réception en attente |
| RG-13 | Une réception complète clôture la demande ; une réception partielle la met en attente de complément |
| RG-14 | La suppression d'une demande supprime en cascade ses commandes, réceptions et notifications |
| RG-15 | La suppression d'une commande ramène la demande au statut « Approuvée » |
| RG-16 | La suppression d'une réception ramène la commande en attente de réception |
| RG-17 | Aucune suppression n'est possible pour un utilisateur rattaché à des demandes (le désactiver) |
| RG-18 | Une même relance n'est envoyée qu'une fois par jour et par destinataire |
| RG-19 | Les seuils de relance sont globaux ; les préférences sonores sont locales à chaque poste |
| RG-20 | Un demandeur ne voit et n'exporte que ses propres données |

---

# 5. EXIGENCES NON FONCTIONNELLES

| Réf. | Catégorie | Exigence |
|---|---|---|
| NF-01 | **Performance** | affichage d'un écran < 2 s ; données en mémoire après chargement |
| NF-02 | **Disponibilité** | hébergement Vercel (CDN mondial), disponibilité cible 99,9 % |
| NF-03 | **Temps réel** | propagation d'une modification aux autres postes en quelques secondes |
| NF-04 | **Continuité hors ligne** | l'application reste utilisable sans base distante (mode local) puis resynchronise |
| NF-05 | **Compatibilité** | Chrome, Edge, Firefox, Safari — desktop et mobile (responsive) |
| NF-06 | **Sécurité — transport** | HTTPS obligatoire |
| NF-07 | **Sécurité — données** | accès base via clé publique « anon » protégée par des politiques RLS |
| NF-08 | **Sécurité — secrets** | aucun secret (clé service_role) dans le code ni dans le dépôt |
| NF-09 | **Sauvegarde** | sauvegardes automatiques assurées par Supabase |
| NF-10 | **Traçabilité** | historique horodaté de chaque demande ; décisions nominatives |
| NF-11 | **Ergonomie** | lecture immédiate des statuts (badges couleur), étapes visualisées |
| NF-12 | **Accessibilité** | contrastes suffisants, cibles cliquables dimensionnées, libellés explicites |
| NF-13 | **Maintenabilité** | couche d'accès aux données unique et remplaçable ; 197 tests automatisés |
| NF-14 | **Portabilité** | version autonome monofichier fonctionnant sans serveur |
| NF-15 | **RGPD** | données professionnelles uniquement ; aucune donnée personnelle sensible |

---

# 6. ARCHITECTURE TECHNIQUE

## 6.1 Vue d'ensemble

```
Navigateur (React 19)
   │
   ├── Next.js 15 (App Router)      ← interface, rendu, routage
   │      └── moteur applicatif « lib/voomnet.js » (règles de gestion)
   │
   ├── Supabase (PostgreSQL)        ← données partagées, temps réel
   │      └── synchronisation différentielle « lib/supabaseSync.js »
   │
   ├── localStorage                 ← cache local + mode dégradé
   │
   └── CDN                          ← SheetJS (Excel), jsPDF (PDF)
                                       (facultatifs : repli CSV / impression)

GitHub ──► Vercel (build & déploiement automatique)
```

## 6.2 Composants

| Composant | Technologie | Rôle |
|---|---|---|
| Interface | Next.js 15 / React 19 / TypeScript | coquille, rendu, amorçage |
| Moteur | JavaScript (module unique) | toutes les règles de gestion et les écrans |
| Base | Supabase (PostgreSQL 15) | persistance, temps réel |
| Style | CSS (variables, thème violet/bleu nuit) | identité visuelle |
| Graphiques | SVG généré | sans bibliothèque |
| PDF | jsPDF + AutoTable (CDN) | avec repli sur l'impression navigateur |
| Excel | SheetJS (CDN) | avec repli CSV |
| Hébergement | Vercel | déploiement continu depuis GitHub |
| Tests | Node + jsdom | 13 séries, 197 contrôles |

## 6.3 Modèle de données (Supabase)

| Table | Contenu | Particularité |
|---|---|---|
| `users` | utilisateurs, rôles, statut | ⚠️ mot de passe en clair (à corriger) |
| `suppliers` | catalogue fournisseurs | coordonnées complètes |
| `requests` | demandes d'achat | `articles`, `offers`, `history` en JSONB |
| `orders` | bons de commande | `lignes` en JSONB |
| `receptions` | réceptions | `lignes` en JSONB |
| `notifications` | notifications et relances | niveau + clé anti-doublon |
| `meta` | compteurs et paramètres | une seule ligne (`id = 'app'`) |

## 6.4 Synchronisation

- **Hydratation au démarrage** : le serveur fait foi, l'appareil adopte les données distantes
- **Écriture différentielle** : seules les lignes ajoutées, modifiées ou supprimées sont transmises
- **Regroupement** : plusieurs enregistrements rapprochés = un seul envoi
- **Temps réel** : abonnement aux modifications pour rafraîchir les autres postes
- **Repli automatique** : si Supabase est injoignable, fonctionnement local puis resynchronisation

---

# 7. SÉCURITÉ — ÉTAT ET RECOMMANDATIONS

| # | Point | État | Recommandation |
|---|---|---|---|
| S1 | Transport HTTPS | ✔ en place | — |
| S2 | Clé `service_role` hors du code | ✔ respecté | — |
| S3 | Politiques RLS activées | ⚠️ permissives (démonstration) | restreindre par rôle |
| S4 | Mots de passe | ❌ en clair | **migrer vers Supabase Auth** (hachage) |
| S5 | Accès aux données | ⚠️ clé anon = accès complet | limiter selon le profil |
| S6 | Journalisation des suppressions | ❌ absent | **ajouter un journal d'audit** |
| S7 | Politique de mot de passe | ❌ aucune | longueur minimale, complexité |
| S8 | Sessions | ⚠️ persistance locale | durée limitée, déconnexion automatique |
| S9 | Sauvegarde | ✔ Supabase | vérifier la fréquence et la restauration |

**Avant toute mise en production**, les points **S3, S4, S5** doivent être traités.

---

# 8. PROCESSUS MÉTIER

## 8.1 Circuit normal

```
Demandeur                 Responsable              Demandeur            Demandeur
   │                           │                       │                    │
   ├─1. Informations           │                       │                    │
   ├─2. Fournisseurs           │                       │                    │
   ├─3. Prix négociés          │                       │                    │
   ├─4. Comparaison            │                       │                    │
   ├─5. Choix + justification  │                       │                    │
   ├─6. Soumission ───────────►│                       │                    │
   │                           ├─ Approuver ──────────►│                    │
   │                           │                       ├─ Créer la commande │
   │                           │                       ├─ Confirmer ───────►│
   │                           │                       │                    ├─ Réceptionner
   │                           │                       │                    ├─ Clôturer ✔
```

## 8.2 Circuit avec refus

```
Soumission ► Responsable ──► Refuser (motif) ──► Demande terminée
                         └──► Demander modification (consignes) ──► retour Demandeur (reprise)
```

## 8.3 Circuit « sans prix » (nouveau)

```
1. Informations (articles + quantités, sans coût)
2. Aucun fournisseur sélectionné
3. Aucun prix saisi
4. Comparaison vide — franchissable
5. Aucun fournisseur retenu — franchissable (avertissement)
6. Impression de la fiche ► complément manuscrit après consultation
   Soumission ► validation ► commande ► réception
```

---

# 9. RECETTE

## 9.1 Stratégie

La recette est **automatisée** : 13 séries de tests, **197 contrôles**, exécutés avant
chaque mise en production (`npm test`).

| Série | Contrôles | Couverture |
|---|---|---|
| `step3` | 45 | comparaison, coût rendu, score, seuils, TVA |
| `optional` | 29 | étapes facultatives, impression sans prix |
| `admin` | 29 | suppressions et leurs cascades, exports PDF |
| `alertes` | 20 | relances, bandeau, cloche, rôles |
| `graphiques` | 16 | graphiques du tableau de bord et des rapports |
| `sons` | 13 | mélodies, volume, bouton 🔊 |
| `seuils-sync` | 8 | synchronisation des seuils |
| `standalone` | 7 | version autonome |
| `alarme` | 7 | alarme répétée et arrêt à la lecture |
| `audio-secours` | 7 | son de secours si Web Audio bloqué |
| `alerte-visuelle` | 6 | titre clignotant, pastille pulsante |
| `supabase-live` | 6 | hydratation depuis le serveur |
| `no-overwrite` | 4 | non-écrasement par un nouvel appareil |

## 9.2 Critères d'acceptation principaux

| # | Critère | Statut |
|---|---|---|
| CA-01 | Créer une demande sans coût, sans fournisseur, sans prix et la soumettre | ✔ validé |
| CA-02 | Imprimer une fiche de demande avec colonnes de prix vides | ✔ validé |
| CA-03 | Créer une commande et l'imprimer sans fournisseur ni prix | ✔ validé |
| CA-04 | Comparer 3 offres et obtenir meilleur prix, classement et score | ✔ validé |
| CA-05 | Valider, refuser et demander une modification avec motif | ✔ validé |
| CA-06 | Réceptionner partiellement puis compléter et clôturer | ✔ validé |
| CA-07 | Recevoir une relance automatique après le seuil | ✔ validé |
| CA-08 | Entendre l'alarme répétée jusqu'à lecture | ✔ validé |
| CA-09 | Importer un fichier fournisseurs avec lignes invalides | ✔ validé |
| CA-10 | Supprimer une demande avec sa commande et sa réception | ✔ validé |
| CA-11 | Deux postes voient la même donnée en temps réel | ✔ validé |
| CA-12 | Un nouvel appareil n'écrase pas les données existantes | ✔ validé |

---

# 10. ÉVOLUTIONS PRÉVUES

| # | Évolution | Bénéfice | Priorité |
|---|---|---|---|
| E1 | **Supabase Auth** (mots de passe hachés) | sécurité | **Haute** |
| E2 | **Journal d'audit** (qui a fait quoi, quand) | traçabilité, conformité | Haute |
| E3 | **Durcissement des politiques RLS** | sécurité | **Haute** |
| E4 | Gestion des budgets par service avec alerte de dépassement | pilotage | Moyenne |
| E5 | Notifications par e-mail | délais de réponse | Moyenne |
| E6 | Portail fournisseur (saisie directe des offres) | productivité | Moyenne |
| E7 | Gestion des stocks liée aux réceptions | logistique | Basse |
| E8 | Authentification unique (SSO / Google Workspace) | confort | Basse |

---

# 11. ANNEXES

## 11.1 Glossaire

| Terme | Définition |
|---|---|
| **Demande** | expression d'un besoin d'achat (numéro ACH-) |
| **Coût présumé** | estimation budgétaire initiale (facultative) |
| **Prix négocié** | prix réellement obtenu auprès du fournisseur |
| **Coût total rendu** | total après remise, TVA et frais de livraison |
| **Offre** | ensemble des prix et conditions d'un fournisseur pour une demande |
| **Offre complète** | offre dont tous les articles ont été chiffrés |
| **Bon de commande (BC)** | document engageant la commande (numéro BC-) |
| **Réception** | constat de livraison (complète ou partielle) |
| **Relance** | notification automatique après dépassement d'un seuil |
| **Niveau** | gravité d'une notification : info, alerte, urgente |

## 11.2 Fichiers du projet

| Fichier | Rôle |
|---|---|
| `lib/voomnet.js` | moteur applicatif (toutes les règles de gestion) |
| `lib/supabaseSync.js` | synchronisation Supabase |
| `components/` | coquille React |
| `app/globals.css` | thème et styles |
| `supabase/schema.sql` | schéma de la base |
| `scripts/publish.mjs` | publication (build → commit → push → vérification) |
| `scripts/gen-standalone.mjs` | génération de la version autonome |
| `tests/` | 13 séries de tests |
| `README.md` | documentation technique |

## 11.3 Historique des versions

| Version | Contenu |
|---|---|
| v3 | assistant 5 étapes, comparaison simple |
| v4 | négociation article par article, comparaison enrichie |
| **Actuelle** | étapes facultatives, logo et charte, relances et alarmes, notifications système, graphiques, 197 tests |

---

*Document établi à partir de l'application livrée. Les points marqués « vigilance »
(sécurité des mots de passe, RLS permissives, absence de journal d'audit) doivent être
traités avant une mise en production à grande échelle.*
