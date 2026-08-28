"use client";

import { useEffect } from "react";
import LoginScreen from "./LoginScreen";
import AppShell from "./AppShell";

/* SheetJS (lecture/écriture des fichiers Excel .xlsx).
   Comme dans la version « index.html », la bibliothèque est chargée depuis le CDN ;
   si le CDN est indisponible, l'application reste 100 % fonctionnelle en CSV et JSON. */
const SHEETJS_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

export default function VoomnetApp() {
  useEffect(() => {
    let cancelled = false;

    const boot = () => {
      if (cancelled) return;
      void import("@/lib/voomnet").then((m) => {
        if (!cancelled) m.initVoomnet();
      });
    };

    const w = window as unknown as { XLSX?: unknown };
    if (w.XLSX) {
      boot();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = SHEETJS_CDN;
    script.async = false;
    script.onload = boot;
    script.onerror = boot; // mode hors-ligne : CSV / JSON restent fonctionnels
    document.head.appendChild(script);

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
