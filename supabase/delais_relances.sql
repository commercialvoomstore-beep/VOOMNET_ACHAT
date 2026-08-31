-- =====================================================================
--  VOOMNET — colonnes des seuils de relance (alertes / urgence)
--  À exécuter dans Supabase → SQL Editor
--  Sans ces colonnes, les seuils restent locaux à chaque poste.
--  Avec elles, ils se synchronisent entre tous les utilisateurs.
-- =====================================================================
alter table public.meta add column if not exists delai_alerte  integer not null default 3;
alter table public.meta add column if not exists delai_urgence integer not null default 7;

-- vérification
select delai_alerte, delai_urgence from public.meta where id = 'app';
