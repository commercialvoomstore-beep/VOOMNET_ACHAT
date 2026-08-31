"use client";

import { useEffect } from "react";
import LoginScreen from "./LoginScreen";
import AppShell from "./AppShell";

/* SheetJS (Excel) — comme dans la version « index.html », chargé depuis le CDN.
   Si le CDN est indisponible, l'application reste 100 % fonctionnelle en CSV et JSON. */
const SHEETJS_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

/* Supabase (optionnel) — actif uniquement si les deux variables publiques sont définies.
   Sans elles, l'application fonctionne en mode démonstration sur le localStorage. */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // hors-ligne : on continue sans la bibliothèque
    document.head.appendChild(s);
  });
}

async function setupSupabase(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const [{ createClient }, { createSupabaseSync }] = await Promise.all([
      import("@supabase/supabase-js"),
      import("@/lib/supabaseSync"),
    ]);
    (window as unknown as Record<string, unknown>).__voomnetSupabase =
      createSupabaseSync(createClient, SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch {
    // Supabase indisponible : l'application reste en mode local
  }
}

export default function VoomnetApp() {
  useEffect(() => {
    let cancelled = false;

    const boot = () => {
      if (cancelled) return;
      void import("@/lib/voomnet").then((m) => {
        if (!cancelled) m.initVoomnet();
      });
    };

    /* 1. Supabase d'abord : les données doivent être hydratées au démarrage,
          2. SheetJS ensuite (pas bloquant). */
    void setupSupabase()
      .then(() => loadScript(SHEETJS_CDN))
      .then(boot)
      .catch(boot);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <LoginScreen />
      <AppShell />
      <div id="modal-root"></div>
      <div id="toast-root"></div>
      <div id="print-root"></div>
    </>
  );
}
